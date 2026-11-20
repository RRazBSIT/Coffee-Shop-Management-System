import { randomBytes } from 'crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import pool from '../config/db';
import type { CreateOrderInput, UpdateOrderStatusInput } from '../validators/order.validator';

class OrderServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'OrderServiceError';
    this.status = status;
  }
}

interface SizeRow extends RowDataPacket {
  size_id: number;
  product_id: number;
  product_name: string;
  size_name: string;
  price: number;
}
interface AddonRow extends RowDataPacket {
  addon_id: number;
  addon_name: string;
  price: number;
}
interface OrderRow extends RowDataPacket {
  order_id: number;
  order_number: string;
  order_source: string;
  order_type: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
  created_by_username?: string | null;
  customer_full_name?: string | null;
}

async function insertActivityLog(
  connection: PoolConnection,
  userId: number,
  action: string,
  orderId: number,
  details: string
) {
  await connection.execute(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, 'order', ?, ?)`,
    [userId, action, orderId, details]
  );
}

function makeOrderNumber() {
  const date = new Date();
  const datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
  return `MC-${datePart}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function createPosOrder(input: CreateOrderInput, userId: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (input.customerId) {
      const [customerRows] = await connection.execute<RowDataPacket[]>(
        'SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1',
        [input.customerId]
      );
      if (!customerRows.length) throw new OrderServiceError('Selected customer was not found.', 404);
    }

    let subtotal = 0;
    const resolvedItems: Array<{
      size: SizeRow;
      quantity: number;
      addons: AddonRow[];
      lineTotal: number;
    }> = [];

    for (const item of input.items) {
      const [sizeRows] = await connection.execute<SizeRow[]>(
        `SELECT ps.size_id, ps.product_id, p.product_name, ps.size_name, ps.price
         FROM product_sizes ps
         INNER JOIN products p ON p.product_id = ps.product_id
         INNER JOIN categories c ON c.category_id = p.category_id
         WHERE ps.size_id = ? AND ps.is_available = TRUE
           AND p.is_available = TRUE AND c.is_active = TRUE
         FOR UPDATE`,
        [item.sizeId]
      );
      const size = sizeRows[0];
      if (!size) throw new OrderServiceError(`Product size ${item.sizeId} is unavailable.`, 409);

      let addons: AddonRow[] = [];
      if (item.addonIds.length) {
        const uniqueIds = [...new Set(item.addonIds)];
        const placeholders = uniqueIds.map(() => '?').join(',');
        const [addonRows] = await connection.execute<AddonRow[]>(
          `SELECT a.addon_id, a.addon_name, a.price
           FROM add_ons a
           INNER JOIN product_addons pa ON pa.addon_id = a.addon_id
           WHERE pa.product_id = ? AND a.is_available = TRUE
             AND a.addon_id IN (${placeholders})`,
          [size.product_id, ...uniqueIds]
        );
        if (addonRows.length !== uniqueIds.length) {
          throw new OrderServiceError(`One or more add-ons are unavailable for ${size.product_name}.`, 409);
        }
        addons = addonRows;
      }

      const unitPrice = Number(size.price) + addons.reduce((sum, addon) => sum + Number(addon.price), 0);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      resolvedItems.push({ size, quantity: item.quantity, addons, lineTotal });
    }

    const discountAmount = Number(input.discountAmount || 0);
    if (discountAmount > subtotal) throw new OrderServiceError('Discount cannot exceed the order subtotal.');
    const totalAmount = Number((subtotal - discountAmount).toFixed(2));
    const orderNumber = makeOrderNumber();

    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO orders
       (order_number, order_source, order_type, customer_id, created_by,
        customer_name, customer_phone, customer_notes, status,
        subtotal, discount_amount, total_amount)
       VALUES (?, 'pos', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [orderNumber, input.orderType, input.customerId ?? null, userId,
       input.customerName ?? null, input.customerPhone ?? null,
       input.customerNotes ?? null, subtotal, discountAmount, totalAmount]
    );
    const orderId = orderResult.insertId;

    for (const item of resolvedItems) {
      const unitPrice = item.lineTotal / item.quantity;
      const [itemResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO order_items
         (order_id, product_id, size_id, product_name_snapshot,
          size_name_snapshot, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.size.product_id, item.size.size_id,
         item.size.product_name, item.size.size_name, item.quantity,
         unitPrice, item.lineTotal]
      );

      for (const addon of item.addons) {
        await connection.execute(
          `INSERT INTO order_item_addons
           (order_item_id, addon_id, addon_name_snapshot, addon_price)
           VALUES (?, ?, ?, ?)`,
          [itemResult.insertId, addon.addon_id, addon.addon_name, addon.price]
        );
      }
    }

    await connection.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES (?, NULL, 'pending', ?, 'Order created')`,
      [orderId, userId]
    );
    await insertActivityLog(connection, userId, 'order_created', orderId, `Created POS order ${orderNumber}`);

    await connection.commit();
    return getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listOrders(options: {
  page: number; limit: number; status?: string; search?: string; orderType?: string;
}) {
  const { page, limit, status, search, orderType } = options;
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (orderType) { where.push('o.order_type = ?'); params.push(orderType); }
  if (search) {
    where.push('(o.order_number LIKE ? OR COALESCE(c.full_name, o.customer_name, \'Walk-in Customer\') LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM orders o LEFT JOIN customers c ON c.customer_id = o.customer_id ${whereSql}`,
    params
  );
  const offset = (page - 1) * limit;
  const [rows] = await pool.query<OrderRow[]>(
    `SELECT o.order_id, o.order_number, o.order_source, o.order_type,
       o.customer_id, COALESCE(c.full_name, o.customer_name, 'Walk-in Customer') AS customer_name,
       o.customer_phone, o.customer_notes, o.status, o.subtotal,
       o.discount_amount, o.total_amount, o.created_at, o.updated_at,
       u.username AS created_by_username
     FROM orders o
     LEFT JOIN customers c ON c.customer_id = o.customer_id
     LEFT JOIN users u ON u.user_id = o.created_by
     ${whereSql}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { items: rows, pagination: { page, limit, total: Number(countRows[0]?.total || 0), totalPages: Math.ceil(Number(countRows[0]?.total || 0) / limit) } };
}

export async function getOrderById(orderId: number) {
  const [orderRows] = await pool.query<OrderRow[]>(
    `SELECT o.order_id, o.order_number, o.order_source, o.order_type,
       o.customer_id, COALESCE(c.full_name, o.customer_name, 'Walk-in Customer') AS customer_name,
       o.customer_phone, o.customer_notes, o.status, o.subtotal,
       o.discount_amount, o.total_amount, o.created_at, o.updated_at,
       u.username AS created_by_username
     FROM orders o LEFT JOIN customers c ON c.customer_id = o.customer_id
     LEFT JOIN users u ON u.user_id = o.created_by
     WHERE o.order_id = ? LIMIT 1`, [orderId]
  );
  const order = orderRows[0];
  if (!order) throw new OrderServiceError('Order not found.', 404);

  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT oi.order_item_id, oi.product_id, oi.size_id,
       oi.product_name_snapshot AS product_name,
       oi.size_name_snapshot AS size_name, oi.quantity,
       oi.unit_price, oi.line_total
     FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.order_item_id`, [orderId]
  );
  const itemIds = items.map((item) => Number(item.order_item_id));
  let addons: RowDataPacket[] = [];
  if (itemIds.length) {
    const placeholders = itemIds.map(() => '?').join(',');
    const [addonRows] = await pool.query<RowDataPacket[]>(
      `SELECT order_item_id, addon_name_snapshot AS addon_name, addon_price
       FROM order_item_addons WHERE order_item_id IN (${placeholders})`, itemIds
    );
    addons = addonRows;
  }
  const itemsWithAddons = items.map((item) => ({
    ...item,
    addons: addons.filter((addon) => Number(addon.order_item_id) === Number(item.order_item_id))
  }));
  const [payments] = await pool.query<RowDataPacket[]>(
    `SELECT payment_id, payment_method, amount, payment_status, reference_number, paid_at, created_at
     FROM payments WHERE order_id = ? ORDER BY payment_id DESC`, [orderId]
  );
  const [history] = await pool.query<RowDataPacket[]>(
    `SELECT h.old_status, h.new_status, h.note, h.created_at, u.username AS changed_by
     FROM order_status_history h LEFT JOIN users u ON u.user_id = h.changed_by
     WHERE h.order_id = ? ORDER BY h.created_at DESC`, [orderId]
  );
  return { ...order, items: itemsWithAddons, payments, statusHistory: history };
}

export async function updateOrderStatus(orderId: number, input: UpdateOrderStatusInput, userId: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<OrderRow[]>(
      'SELECT order_id, order_number, status FROM orders WHERE order_id = ? FOR UPDATE', [orderId]
    );
    const order = rows[0];
    if (!order) throw new OrderServiceError('Order not found.', 404);
    const current = order.status;
    const next = input.status;
    const transitions: Record<string, string[]> = {
      pending: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed'],
      completed: [],
      cancelled: []
    };
    if (!transitions[current]?.includes(next)) {
      throw new OrderServiceError(`Cannot change order status from ${current} to ${next}.`, 409);
    }
    if (next === 'completed') {
      const [paidRows] = await connection.execute<RowDataPacket[]>(
        `SELECT payment_id FROM payments WHERE order_id = ? AND payment_status = 'paid' LIMIT 1`, [orderId]
      );
      if (!paidRows.length) throw new OrderServiceError('An order must be paid before it can be completed.', 409);
    }
    await connection.execute('UPDATE orders SET status = ? WHERE order_id = ?', [next, orderId]);
    await connection.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, current, next, userId, input.note ?? null]
    );
    await insertActivityLog(connection, userId, 'order_status_updated', orderId, `${order.order_number}: ${current} -> ${next}`);
    await connection.commit();
    return getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

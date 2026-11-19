import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
interface DashboardStatsRow extends RowDataPacket {
  todayRevenue: number | string;
  totalOrders: number | string;
  productsSold: number | string;
  pendingOrders: number | string;
}

interface OrderSummaryRow extends RowDataPacket {
  status: string;
  total: number | string;
}

interface WeeklySalesRow extends RowDataPacket {
  day: string;
  revenue: number | string;
}

interface RecentOrderRow extends RowDataPacket {
  orderId: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number | string;
  status: string;
  orderType: string;
  createdAt: Date;
}

export async function getDashboardOverview() {
  // Today's summary
  const [statsRows] = await pool.query<DashboardStatsRow[]>(`
    SELECT
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        INNER JOIN orders o ON o.order_id = p.order_id
        WHERE p.payment_status = 'paid'
          AND o.status <> 'cancelled'
          AND DATE(p.paid_at) = CURDATE()
      ), 0) AS todayRevenue,

      (
        SELECT COUNT(*)
        FROM orders
        WHERE DATE(created_at) = CURDATE()
          AND status <> 'cancelled'
      ) AS totalOrders,

      COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        INNER JOIN orders o ON o.order_id = oi.order_id
        WHERE DATE(o.created_at) = CURDATE()
          AND o.status <> 'cancelled'
          AND EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.order_id = o.order_id
              AND p.payment_status = 'paid'
          )
      ), 0) AS productsSold,

      (
        SELECT COUNT(*)
        FROM orders
        WHERE DATE(created_at) = CURDATE()
          AND status = 'pending'
      ) AS pendingOrders
  `);

  const stats = statsRows[0];

  // Today's order status summary
  const [statusRows] = await pool.query<OrderSummaryRow[]>(`
    SELECT
      status,
      COUNT(*) AS total
    FROM orders
    WHERE DATE(created_at) = CURDATE()
      AND status <> 'cancelled'
    GROUP BY status
  `);

  const orderSummary = {
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0
  };

  for (const row of statusRows) {
    if (row.status in orderSummary) {
      orderSummary[row.status as keyof typeof orderSummary] =
        Number(row.total);
    }
  }

  // Last seven days of paid sales
  const [weeklyRows] = await pool.query<WeeklySalesRow[]>(`
    SELECT
      DATE_FORMAT(p.paid_at, '%a') AS day,
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM payments p
    INNER JOIN orders o ON o.order_id = p.order_id
    WHERE p.payment_status = 'paid'
      AND o.status <> 'cancelled'
      AND p.paid_at >= CURDATE() - INTERVAL 6 DAY
      AND p.paid_at < CURDATE() + INTERVAL 1 DAY
    GROUP BY DATE(p.paid_at)
    ORDER BY DATE(p.paid_at)
  `);

  const weeklySales = weeklyRows.map((row) => ({
    day: row.day,
    revenue: Number(row.revenue)
  }));

  // Latest five orders
  const [recentRows] = await pool.query<RecentOrderRow[]>(`
    SELECT
      o.order_id AS orderId,
      o.order_number AS orderNumber,
      COALESCE(c.full_name, o.customer_name, 'Walk-in Customer')
        AS customerName,
      o.total_amount AS totalAmount,
      o.status,
      o.order_type AS orderType,
      o.created_at AS createdAt
    FROM orders o
    LEFT JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.status <> 'cancelled'
    ORDER BY o.created_at DESC
    LIMIT 5
  `);

  const recentOrders = recentRows.map((row) => ({
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    totalAmount: Number(row.totalAmount),
    status: row.status,
    orderType: row.orderType,
    createdAt: row.createdAt
  }));

  return {
    summary: {
      todayRevenue: Number(stats.todayRevenue),
      totalOrders: Number(stats.totalOrders),
      productsSold: Number(stats.productsSold),
      pendingOrders: Number(stats.pendingOrders)
    },
    orderSummary,
    weeklySales,
    recentOrders
  };
}

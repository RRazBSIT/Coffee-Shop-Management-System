import pool from '../config/db';
import type { RowDataPacket } from 'mysql2';

export async function listCustomers(search = '') {
  const term = `%${search}%`;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.customer_id, c.full_name, c.email, c.phone, c.is_registered, c.created_at,
       COUNT(DISTINCT o.order_id) AS order_count,
       COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) AS total_spent
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.customer_id
     LEFT JOIN payments p ON p.order_id = o.order_id
     WHERE (? = '' OR c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)
     GROUP BY c.customer_id
     ORDER BY c.created_at DESC`,
    [search, term, term, term],
  );
  return rows;
}

export async function getCustomerOrders(customerId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.order_id, o.order_number, o.order_type, o.status, o.total_amount, o.created_at
     FROM orders o
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC
     LIMIT 100`,
    [customerId],
  );
  return rows;
}

export async function customerExists(customerId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1',
    [customerId],
  );
  return rows.length > 0;
}

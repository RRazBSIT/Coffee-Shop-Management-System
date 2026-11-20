import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import type { EmployeeInput } from '../validators/employees.validator';

class EmployeeServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'EmployeeServiceError';
    this.status = status;
  }
}

export async function listEmployees(search?: string) {
  const term = search?.trim();
  const params: string[] = [];
  let where = '';

  if (term) {
    where = 'WHERE first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, " ", last_name) LIKE ? OR phone LIKE ?';
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT employee_id, first_name, last_name, phone, created_at
     FROM employees ${where}
     ORDER BY created_at DESC, employee_id DESC`,
    params
  );

  return rows;
}

export async function getEmployeeById(employeeId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT employee_id, first_name, last_name, phone, created_at
     FROM employees WHERE employee_id = ? LIMIT 1`,
    [employeeId]
  );

  if (!rows.length) throw new EmployeeServiceError('Employee not found.', 404);
  return rows[0];
}

export async function createEmployee(input: EmployeeInput) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO employees (first_name, last_name, phone)
     VALUES (?, ?, ?)`,
    [input.firstName, input.lastName, input.phone || null]
  );

  return getEmployeeById(result.insertId);
}

export async function updateEmployee(employeeId: number, input: EmployeeInput) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE employees
     SET first_name = ?, last_name = ?, phone = ?
     WHERE employee_id = ?`,
    [input.firstName, input.lastName, input.phone || null, employeeId]
  );

  if (!result.affectedRows) throw new EmployeeServiceError('Employee not found.', 404);
  return getEmployeeById(employeeId);
}

export async function deleteEmployee(employeeId: number) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.execute<RowDataPacket[]>(
      'SELECT employee_id FROM employees WHERE employee_id = ? FOR UPDATE',
      [employeeId]
    );

    if (!employeeRows.length) throw new EmployeeServiceError('Employee not found.', 404);

    const [userRows] = await connection.execute<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE employee_id = ? LIMIT 1',
      [employeeId]
    );

    if (userRows.length) {
      throw new EmployeeServiceError(
        'This employee has a linked login account. Deactivate or manage the account before deleting this employee.',
        409
      );
    }

    await connection.execute('DELETE FROM employees WHERE employee_id = ?', [employeeId]);
    await connection.commit();
    return { employeeId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

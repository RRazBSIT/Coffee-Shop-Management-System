import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { generateToken } from '../utils/jwt';

// CUSTOMER REGISTRATION INPUT
interface RegisterCustomerInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

// STAFF ACCOUNT INPUT
interface CreateStaffInput {
  firstName: string;
  lastName: string;
  phone?: string;
  username: string;
  password: string;
}

// CUSTOMER REGISTRATION
export async function registerCustomer(input: RegisterCustomerInput) {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT customer_id FROM customers WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('Email address is already registered.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO customers
       (full_name, email, phone, password_hash, is_registered)
       VALUES (?, ?, ?, ?, 1)`,
      [fullName, email, phone, passwordHash]
    );

    await connection.commit();

    const customerId = result.insertId;

    const token = generateToken({
      accountType: 'customer',
      customerId
    });

    return {
      customerId,
      fullName,
      email,
      phone,
      accountType: 'customer',
      token
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// CUSTOMER LOGIN
export async function loginCustomer(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT customer_id, full_name, email, phone, password_hash,
            is_registered
     FROM customers
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  if (rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const customer = rows[0];

  if (Number(customer.is_registered) !== 1 || !customer.password_hash) {
    throw new Error('Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    customer.password_hash
  );

  if (!passwordMatches) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken({
    accountType: 'customer',
    customerId: Number(customer.customer_id)
  });

  return {
    customerId: Number(customer.customer_id),
    fullName: customer.full_name,
    email: customer.email,
    phone: customer.phone,
    accountType: 'customer',
    token
  };
}

// STAFF LOGIN (ADMIN AND CASHIER)
export async function loginStaff(username: string, password: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       u.user_id,
       u.employee_id,
       u.role_id,
       u.username,
       u.password_hash,
       u.is_active,
       e.first_name,
       e.last_name,
       r.role_name
     FROM users u
     INNER JOIN employees e ON u.employee_id = e.employee_id
     INNER JOIN roles r ON u.role_id = r.role_id
     WHERE u.username = ?
     LIMIT 1`,
    [username.trim()]
  );

  if (rows.length === 0) {
    throw new Error('Invalid username or password.');
  }

  const staff = rows[0];

  if (Number(staff.is_active) !== 1) {
    throw new Error('This account is inactive.');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    staff.password_hash
  );

  if (!passwordMatches) {
    throw new Error('Invalid username or password.');
  }

  const roleName = String(staff.role_name).toLowerCase();

  if (!['admin', 'cashier'].includes(roleName)) {
    throw new Error('Invalid staff role.');
  }

  const token = generateToken({
    accountType: 'staff',
    userId: Number(staff.user_id),
    employeeId: Number(staff.employee_id),
    roleId: Number(staff.role_id),
    roleName
  });

  return {
    userId: Number(staff.user_id),
    employeeId: Number(staff.employee_id),
    username: staff.username,
    firstName: staff.first_name,
    lastName: staff.last_name,
    roleId: Number(staff.role_id),
    roleName,
    accountType: 'staff',
    token
  };
}

// CREATE CASHIER ACCOUNT
// This function will only be exposed through an Admin-protected route.
export async function createStaffAccount(input: CreateStaffInput) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const username = input.username.trim();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if username already exists.
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing.length > 0) {
      throw new Error('Username is already taken.');
    }

    // Hash password.
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create employee profile.
    const [employeeResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO employees (first_name, last_name, phone)
         VALUES (?, ?, ?)`,
        [firstName, lastName, input.phone?.trim() || null]
      );

    const employeeId = employeeResult.insertId;

    // Role ID 2 is the confirmed Cashier role.
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users
       (employee_id, role_id, username, password_hash, is_active)
       VALUES (?, 2, ?, ?, 1)`,
      [employeeId, username, passwordHash]
    );

    await connection.commit();

    return {
      userId: userResult.insertId,
      employeeId,
      firstName,
      lastName,
      username,
      roleId: 2,
      roleName: 'cashier'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

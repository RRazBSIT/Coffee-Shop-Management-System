import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';

async function initializeAdmin(): Promise<void> {
  const firstName = process.env.MR_ADMIN_FIRST_NAME?.trim();
  const lastName = process.env.MR_ADMIN_LAST_NAME?.trim();
  const username = process.env.MR_ADMIN_USERNAME?.trim();
  const password = process.env.MR_ADMIN_PASSWORD;

  if (!firstName || !lastName || !username || !password) {
    throw new Error(
      'Please provide MR_ADMIN_FIRST_NAME, MR_ADMIN_LAST_NAME, ' +
      'MR_ADMIN_USERNAME and MR_ADMIN_PASSWORD.'
    );
  }

  if (Buffer.byteLength(password, 'utf8') > 72 || password.length < 8) {
    throw new Error('Password must be at least 8 characters and no more than 72 bytes.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the Admin role row to prevent concurrent initialization.
    const [roles] = await connection.execute<RowDataPacket[]>(
      `SELECT role_id, role_name
       FROM roles
       WHERE role_id = 1
       FOR UPDATE`
    );

    if (
      roles.length === 0 ||
      String(roles[0].role_name).toLowerCase() !== 'admin'
    ) {
      throw new Error('Admin role (role_id = 1) was not found.');
    }

    // Refuse to create another Admin account.
    const [admins] = await connection.execute<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE role_id = 1 LIMIT 1'
    );

    if (admins.length > 0) {
      throw new Error('An Admin account already exists. Initialization stopped.');
    }

    // Check username availability.
    const [existingUsers] = await connection.execute<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existingUsers.length > 0) {
      throw new Error('This username is already in use.');
    }

    // Hash the password.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create employee profile.
    const [employeeResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO employees (first_name, last_name)
         VALUES (?, ?)`,
        [firstName, lastName]
      );

    const employeeId = employeeResult.insertId;

    // Create Admin login account.
    const [userResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO users
         (employee_id, role_id, username, password_hash, is_active)
         VALUES (?, 1, ?, ?, 1)`,
        [employeeId, username, passwordHash]
      );

    await connection.commit();

    console.log('\nMR Cafe Admin initialized successfully!');
    console.log(`Employee ID: ${employeeId}`);
    console.log(`User ID: ${userResult.insertId}`);
    console.log(`Username: ${username}`);
    console.log('Role: Admin');
    console.log('Password: Not displayed.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

initializeAdmin()
  .catch((error: unknown) => {
    console.error(
      '\nAdmin initialization failed:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

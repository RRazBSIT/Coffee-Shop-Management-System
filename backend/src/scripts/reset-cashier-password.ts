import bcrypt from 'bcryptjs';
import pool from '../config/db';

async function resetCashierPassword() {
  const username = process.env.CASHIER_USERNAME?.trim();
  const newPassword = process.env.CASHIER_NEW_PASSWORD;

  if (!username || !newPassword) {
    throw new Error('Cashier username and new password are required.');
  }

  if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw new Error('Password must be at least 8 characters and no more than 72 bytes.');
  }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT user_id, username, role_id
       FROM users
       WHERE username = ? AND role_id = 2
       LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      throw new Error('Cashier account not found.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?, is_active = 1
       WHERE user_id = ? AND role_id = 2`,
      [passwordHash, rows[0].user_id]
    );

    console.log('Cashier password reset successfully!');
    console.log(`Username: ${username}`);
    console.log(`User ID: ${rows[0].user_id}`);
    console.log('Role: Cashier');
  } finally {
    await pool.end();
  }
}

resetCashierPassword().catch((error: unknown) => {
  console.error(
    'Password reset failed:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});

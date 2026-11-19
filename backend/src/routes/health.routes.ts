import { Router } from 'express';
import pool from '../config/db';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'MR Cafe API is running',
      database: 'connected'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

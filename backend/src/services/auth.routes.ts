import { Router } from 'express';

import {
  registerCustomerController,
  loginCustomerController,
  loginStaffController,
  createStaffController
} from '../controllers/auth.controller';

import {
  authenticateToken,
  authorizeRoles
} from '../middleware/auth.middleware';

const router = Router();

// CUSTOMER REGISTRATION
router.post('/register', registerCustomerController);

// CUSTOMER LOGIN
router.post('/customer/login', loginCustomerController);

// STAFF LOGIN
router.post('/staff/login', loginStaffController);

// CREATE CASHIER ACCOUNT (ADMIN ONLY)
router.post(
  '/staff',
  authenticateToken,
  authorizeRoles('admin'),
  createStaffController
);

export default router;

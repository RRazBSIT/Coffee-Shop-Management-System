import { Router } from 'express';
import { getDashboardOverviewController } from '../controllers/dashboard.controller';
import {
  authenticateToken,
  authorizeRoles
} from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/overview',
  authenticateToken,
  authorizeRoles('admin'),
  getDashboardOverviewController
);

export default router;

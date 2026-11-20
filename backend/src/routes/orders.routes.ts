import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  createOrderController,
  getOrderController,
  listOrdersController,
  updateOrderStatusController
} from '../controllers/orders.controller';

const router = Router();
router.use(authenticateToken, authorizeRoles('admin', 'cashier'));
router.get('/', listOrdersController);
router.get('/:id', getOrderController);
router.post('/', createOrderController);
router.patch('/:id/status', updateOrderStatusController);

export default router;

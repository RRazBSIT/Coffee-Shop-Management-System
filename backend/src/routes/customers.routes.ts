import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { listCustomersController, getCustomerOrdersController } from '../controllers/customers.controller';

const router = Router();
router.use(authenticateToken, authorizeRoles('admin'));
router.get('/', listCustomersController);
router.get('/:id/orders', getCustomerOrdersController);

export default router;

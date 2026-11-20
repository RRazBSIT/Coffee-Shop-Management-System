
import { Router } from 'express';
import {
  authenticateToken,
  authorizeRoles
} from '../middleware/auth.middleware';

import {
  categoriesController,
  listProductsController,
  getProductController,
  createProductController,
  updateProductController,
  productAvailabilityController
} from '../controllers/products.controller';

const router = Router();

router.use(
  authenticateToken,
  authorizeRoles('admin', 'cashier')
);

router.get('/categories', categoriesController);
router.get('/', listProductsController);
router.get('/:id', getProductController);

// Only Admin can create, edit, or change product availability.
router.post(
  '/',
  authorizeRoles('admin'),
  createProductController
);

router.put(
  '/:id',
  authorizeRoles('admin'),
  updateProductController
);

router.patch(
  '/:id/availability',
  authorizeRoles('admin'),
  productAvailabilityController
);

export default router;

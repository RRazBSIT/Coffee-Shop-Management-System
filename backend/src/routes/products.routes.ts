
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

// PUBLIC CATALOG
// Customers can browse categories and products without staff login.
router.get('/categories', categoriesController);
router.get('/', listProductsController);
router.get('/:id', getProductController);

// ADMIN ONLY: Product management
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  createProductController
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  updateProductController
);

router.patch(
  '/:id/availability',
  authenticateToken,
  authorizeRoles('admin'),
  productAvailabilityController
);

export default router;

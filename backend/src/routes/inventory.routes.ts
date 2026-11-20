import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  createIngredientController,
  createStockMovementController,
  listIngredientsController,
  listInventoryMovementsController,
  updateIngredientController
} from '../controllers/inventory.controller';

const router = Router();
router.use(authenticateToken, authorizeRoles('admin'));
router.get('/ingredients', listIngredientsController);
router.post('/ingredients', createIngredientController);
router.put('/ingredients/:id', updateIngredientController);
router.get('/movements', listInventoryMovementsController);
router.post('/movements', createStockMovementController);

export default router;

import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  listEmployeesController, getEmployeeController, createEmployeeController,
  updateEmployeeController, deleteEmployeeController
} from '../controllers/employees.controller';

const router = Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', listEmployeesController);
router.get('/:id', getEmployeeController);
router.post('/', createEmployeeController);
router.put('/:id', updateEmployeeController);
router.delete('/:id', deleteEmployeeController);

export default router;

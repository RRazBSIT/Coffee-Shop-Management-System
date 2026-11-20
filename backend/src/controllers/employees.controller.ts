import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { employeeSchema } from '../validators/employees.validator';
import {
  listEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee
} from '../services/employees.service';

function validationError(error: ZodError, res: Response) {
  res.status(400).json({
    success: false,
    message: 'Please check the employee information.',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  });
}

function getId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function listEmployeesController(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const data = await listEmployees(search);
    res.status(200).json({ success: true, message: 'Employees retrieved successfully.', data });
  } catch (error) { next(error); }
}

export async function getEmployeeController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid employee ID.' });
      return;
    }
    const data = await getEmployeeById(id);
    res.status(200).json({ success: true, message: 'Employee retrieved successfully.', data });
  } catch (error) { next(error); }
}

export async function createEmployeeController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) { validationError(parsed.error, res); return; }
    const data = await createEmployee(parsed.data);
    res.status(201).json({ success: true, message: 'Employee created successfully.', data });
  } catch (error) { next(error); }
}

export async function updateEmployeeController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid employee ID.' });
      return;
    }
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) { validationError(parsed.error, res); return; }
    const data = await updateEmployee(id, parsed.data);
    res.status(200).json({ success: true, message: 'Employee updated successfully.', data });
  } catch (error) { next(error); }
}

export async function deleteEmployeeController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid employee ID.' });
      return;
    }
    const data = await deleteEmployee(id);
    res.status(200).json({ success: true, message: 'Employee deleted successfully.', data });
  } catch (error) { next(error); }
}

import type { Request, Response } from 'express';
import {
  createIngredient, createStockMovement, InventoryServiceError,
  listIngredients, listInventoryMovements, updateIngredient
} from '../services/inventory.service';
import { ingredientSchema, stockMovementSchema } from '../validators/inventory.validator';

const sendError = (res: Response, error: unknown) => {
  if (error instanceof InventoryServiceError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error('Inventory API error:', error);
  return res.status(500).json({ success: false, message: 'An unexpected inventory error occurred.' });
};

export async function listIngredientsController(req: Request, res: Response) {
  try {
    const data = await listIngredients(String(req.query.search || ''), String(req.query.stockStatus || 'all'));
    return res.json({ success: true, data });
  } catch (error) { return sendError(res, error); }
}

export async function createIngredientController(req: Request, res: Response) {
  const parsed = ingredientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid ingredient data.' });
  try {
    const data = await createIngredient(parsed.data);
    return res.status(201).json({ success: true, message: 'Ingredient created successfully.', data });
  } catch (error) { return sendError(res, error); }
}

export async function updateIngredientController(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid ingredient ID.' });
  const parsed = ingredientSchema.omit({ currentStock: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid ingredient data.' });
  try {
    const data = await updateIngredient(id, parsed.data);
    return res.json({ success: true, message: 'Ingredient updated successfully.', data });
  } catch (error) { return sendError(res, error); }
}

export async function createStockMovementController(req: Request, res: Response) {
  const parsed = stockMovementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid stock movement.' });
  try {
    const authUser = (req as Request & { user?: { userId?: number } }).user;
    const data = await createStockMovement(parsed.data, authUser?.userId ?? null);
    return res.status(201).json({ success: true, message: 'Stock movement recorded successfully.', data });
  } catch (error) { return sendError(res, error); }
}

export async function listInventoryMovementsController(req: Request, res: Response) {
  try {
    const data = await listInventoryMovements(Number(req.query.limit) || 100);
    return res.json({ success: true, data });
  } catch (error) { return sendError(res, error); }
}


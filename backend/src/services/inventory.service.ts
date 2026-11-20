import pool from '../config/db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export class InventoryServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'InventoryServiceError';
    this.statusCode = statusCode;
  }
}

export async function listIngredients(search = '', stockStatus = 'all') {
  const conditions: string[] = ['i.is_active = 1'];
  const values: Array<string> = [];

  if (search.trim()) {
    conditions.push('(i.ingredient_name LIKE ? OR i.unit LIKE ?)');
    values.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (stockStatus === 'low') conditions.push('i.current_stock <= i.reorder_level');
  if (stockStatus === 'healthy') conditions.push('i.current_stock > i.reorder_level');

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT i.ingredient_id AS ingredientId,
            i.ingredient_name AS ingredientName,
            i.unit,
            i.current_stock AS currentStock,
            i.reorder_level AS reorderLevel,
            i.is_active AS isActive,
            CASE WHEN i.current_stock <= i.reorder_level THEN 1 ELSE 0 END AS isLowStock
       FROM ingredients i
      WHERE ${conditions.join(' AND ')}
      ORDER BY isLowStock DESC, i.ingredient_name ASC`,
    values
  );
  return rows;
}

export async function createIngredient(input: {
  ingredientName: string; unit: string; currentStock: number; reorderLevel: number; isActive: boolean;
}) {
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT ingredient_id FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?) LIMIT 1',
    [input.ingredientName]
  );
  if (existing.length) throw new InventoryServiceError('An ingredient with this name already exists.', 409);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO ingredients (ingredient_name, unit, current_stock, reorder_level, is_active)
       VALUES (?, ?, 0, ?, ?)`,
      [input.ingredientName, input.unit, input.reorderLevel, input.isActive ? 1 : 0]
    );
    if (input.currentStock > 0) {
      await connection.execute(
        `UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?`,
        [input.currentStock, result.insertId]
      );
      await connection.execute(
        `INSERT INTO inventory_movements
          (ingredient_id, movement_type, quantity, reference_order_id, notes, created_by)
         VALUES (?, 'stock_in', ?, NULL, 'Opening stock', NULL)`,
        [result.insertId, input.currentStock]
      );
    }
    await connection.commit();
    return { ingredientId: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateIngredient(
  ingredientId: number,
  input: { ingredientName: string; unit: string; reorderLevel: number; isActive: boolean }
) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE ingredients
        SET ingredient_name = ?, unit = ?, reorder_level = ?, is_active = ?
      WHERE ingredient_id = ?`,
    [input.ingredientName, input.unit, input.reorderLevel, input.isActive ? 1 : 0, ingredientId]
  );
  if (!result.affectedRows) throw new InventoryServiceError('Ingredient not found.', 404);
  return { ingredientId };
}

export async function createStockMovement(input: {
  ingredientId: number; movementType: 'stock_in' | 'adjustment' | 'wastage';
  quantity: number; adjustmentDirection?: 'increase' | 'decrease'; notes?: string | null;
}, createdBy: number | null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT ingredient_id, current_stock FROM ingredients WHERE ingredient_id = ? AND is_active = 1 FOR UPDATE',
      [input.ingredientId]
    );
    if (!rows.length) throw new InventoryServiceError('Active ingredient not found.', 404);

    const currentStock = Number(rows[0].current_stock);
    let nextStock = currentStock;
    let movementType = input.movementType;

    if (movementType === 'stock_in') nextStock += input.quantity;
    if (movementType === 'wastage') nextStock -= input.quantity;
    if (movementType === 'adjustment') {
      nextStock += input.adjustmentDirection === 'increase' ? input.quantity : -input.quantity;
    }
    if (nextStock < 0) throw new InventoryServiceError('Insufficient stock. The movement would make stock negative.');

    await connection.execute(
      'UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?',
      [nextStock, input.ingredientId]
    );
    const movementNote = movementType === 'adjustment'
      ? `${input.adjustmentDirection === 'increase' ? 'Increase' : 'Decrease'} adjustment${input.notes ? `: ${input.notes}` : ''}`
      : (input.notes || null);

    await connection.execute(
      `INSERT INTO inventory_movements
        (ingredient_id, movement_type, quantity, reference_order_id, notes, created_by)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      [input.ingredientId, movementType, input.quantity, movementNote, createdBy]
    );
    await connection.commit();
    return { ingredientId: input.ingredientId, previousStock: currentStock, currentStock: nextStock };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listInventoryMovements(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.movement_id AS movementId,
            m.ingredient_id AS ingredientId,
            i.ingredient_name AS ingredientName,
            i.unit,
            m.movement_type AS movementType,
            m.quantity,
            m.notes,
            m.created_at AS createdAt,
            u.username AS createdBy
       FROM inventory_movements m
       INNER JOIN ingredients i ON i.ingredient_id = m.ingredient_id
       LEFT JOIN users u ON u.user_id = m.created_by
      WHERE m.movement_type IN ('stock_in', 'adjustment', 'wastage')
      ORDER BY m.created_at DESC
      LIMIT ${safeLimit}`
  );
  return rows;
}

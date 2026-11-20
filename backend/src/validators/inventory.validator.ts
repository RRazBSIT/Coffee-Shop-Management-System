import { z } from 'zod';

export const ingredientSchema = z.object({
  ingredientName: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(30),
  currentStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const stockMovementSchema = z.object({
  ingredientId: z.number().int().positive(),
  movementType: z.enum(['stock_in', 'adjustment', 'wastage']),
  quantity: z.number().positive(),
  adjustmentDirection: z.enum(['increase', 'decrease']).optional(),
  notes: z.string().trim().max(255).optional().nullable()
}).superRefine((value, ctx) => {
  if (value.movementType === 'adjustment' && !value.adjustmentDirection) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose whether the adjustment increases or decreases stock.', path: ['adjustmentDirection'] });
  }
});

export type IngredientInput = z.infer<typeof ingredientSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

import { z } from 'zod';

export const createOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway']),
  customerId: z.number().int().positive().optional().nullable(),
  customerName: z.string().trim().max(150).optional().nullable(),
  customerPhone: z.string().trim().max(25).optional().nullable(),
  customerNotes: z.string().trim().max(2000).optional().nullable(),
  discountAmount: z.number().min(0).default(0),
  items: z.array(z.object({
    sizeId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(99),
    addonIds: z.array(z.number().int().positive()).max(20).default([])
  })).min(1).max(50)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['preparing', 'ready', 'completed', 'cancelled']),
  note: z.string().trim().max(255).optional()
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

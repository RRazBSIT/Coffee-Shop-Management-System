
import { z } from 'zod';

const productSizeSchema = z.object({
  sizeName: z.string().trim().min(1).max(40),
  price: z.number().min(0),
  isAvailable: z.boolean().default(true)
});

export const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  productName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  isAvailable: z.boolean().default(true),
  sizes: z.array(productSizeSchema).min(1).max(20)
});

export const updateProductSchema = createProductSchema;

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

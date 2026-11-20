import { z } from 'zod';

export const customerSearchSchema = z.object({
  search: z.string().trim().max(150).optional().default(''),
});

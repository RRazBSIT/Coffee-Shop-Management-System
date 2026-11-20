import { z } from 'zod';

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  phone: z.string().trim().max(25).nullable().optional()
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

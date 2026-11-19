import { Request, Response } from 'express';
import { z } from 'zod';

import {
  registerCustomer,
  loginCustomer,
  loginStaff,
  createStaffAccount
} from '../services/auth.service';

// Validation schemas
const customerRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().max(25).optional(),
  password: z.string().min(8).max(72)
});

const customerLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const staffLoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1)
});

const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(25).optional(),
  username: z.string().trim().min(3).max(60),
  password: z.string().min(8).max(72)
});

// Helper for validation errors
function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    success: false,
    message: 'Please check your submitted information.',
    errors: error.flatten().fieldErrors
  });
}

// CUSTOMER REGISTRATION
export async function registerCustomerController(
  req: Request,
  res: Response
): Promise<void> {
  const validation = customerRegistrationSchema.safeParse(req.body);

  if (!validation.success) {
    validationError(res, validation.error);
    return;
  }

  try {
    const result = await registerCustomer(validation.data);

    res.status(201).json({
      success: true,
      message: 'Customer account created successfully.',
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message === 'Email address is already registered.') {
      res.status(409).json({ success: false, message });
      return;
    }

    console.error('Customer registration error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to register customer.'
    });
  }
}

// CUSTOMER LOGIN
export async function loginCustomerController(
  req: Request,
  res: Response
): Promise<void> {
  const validation = customerLoginSchema.safeParse(req.body);

  if (!validation.success) {
    validationError(res, validation.error);
    return;
  }

  try {
    const result = await loginCustomer(
      validation.data.email,
      validation.data.password
    );

    res.status(200).json({
      success: true,
      message: 'Customer login successful.',
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message === 'Invalid email or password.') {
      res.status(401).json({ success: false, message });
      return;
    }

    console.error('Customer login error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to process customer login.'
    });
  }
}

// STAFF LOGIN
export async function loginStaffController(
  req: Request,
  res: Response
): Promise<void> {
  const validation = staffLoginSchema.safeParse(req.body);

  if (!validation.success) {
    validationError(res, validation.error);
    return;
  }

  try {
    const result = await loginStaff(
      validation.data.username,
      validation.data.password
    );

    res.status(200).json({
      success: true,
      message: 'Staff login successful.',
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (
      message === 'Invalid username or password.' ||
      message === 'This account is inactive.' ||
      message === 'Invalid staff role.'
    ) {
      res.status(401).json({
        success: false,
        message
      });
      return;
    }

    console.error('Staff login error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to process staff login.'
    });
  }
}

// CREATE CASHIER ACCOUNT
export async function createStaffController(
  req: Request,
  res: Response
): Promise<void> {
  const validation = createStaffSchema.safeParse(req.body);

  if (!validation.success) {
    validationError(res, validation.error);
    return;
  }

  try {
    const result = await createStaffAccount(validation.data);

    res.status(201).json({
      success: true,
      message: 'Cashier account created successfully.',
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message === 'Username is already taken.') {
      res.status(409).json({ success: false, message });
      return;
    }

    console.error('Staff account creation error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to create cashier account.'
    });
  }
}

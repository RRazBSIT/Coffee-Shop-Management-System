import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';
import { createPosOrder, getOrderById, listOrders, updateOrderStatus } from '../services/orders.service';

function sendValidationError(error: ZodError, res: Response) {
  res.status(400).json({
    success: false,
    message: 'Please check the order information.',
    errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
  });
}

export async function listOrdersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const orderType = typeof req.query.orderType === 'string' ? req.query.orderType : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (status && !['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid order status filter.' }); return;
    }
    if (orderType && !['dine_in', 'takeaway'].includes(orderType)) {
      res.status(400).json({ success: false, message: 'Invalid order type filter.' }); return;
    }
    const data = await listOrders({ page, limit, status, orderType, search });
    res.status(200).json({ success: true, message: 'Orders retrieved successfully.', data });
  } catch (error) { next(error); }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      res.status(400).json({ success: false, message: 'Invalid order ID.' }); return;
    }
    const data = await getOrderById(orderId);
    res.status(200).json({ success: true, message: 'Order retrieved successfully.', data });
  } catch (error) { next(error); }
}

export async function createOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) { sendValidationError(parsed.error, res); return; }
    const userId = req.auth?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'Staff account information is missing from the token.' }); return; }
    const data = await createPosOrder(parsed.data, userId);
    res.status(201).json({ success: true, message: 'Order created successfully.', data });
  } catch (error) { next(error); }
}

export async function updateOrderStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      res.status(400).json({ success: false, message: 'Invalid order ID.' }); return;
    }
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) { sendValidationError(parsed.error, res); return; }
    const userId = req.auth?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'Staff account information is missing from the token.' }); return; }
    const data = await updateOrderStatus(orderId, parsed.data, userId);
    res.status(200).json({ success: true, message: 'Order status updated successfully.', data });
  } catch (error) { next(error); }
}

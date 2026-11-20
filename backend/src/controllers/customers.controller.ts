import type { Request, Response, NextFunction } from 'express';
import { listCustomers, getCustomerOrders, customerExists } from '../services/customers.service';

export async function listCustomersController(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const data = await listCustomers(search);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getCustomerOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
      res.status(400).json({ success: false, message: 'Invalid customer ID.' });
      return;
    }
    if (!(await customerExists(customerId))) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }
    const data = await getCustomerOrders(customerId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

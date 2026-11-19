import { Request, Response, NextFunction } from 'express';
import { getDashboardOverview } from '../services/dashboard.service';

export async function getDashboardOverviewController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const overview = await getDashboardOverview();

    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully.',
      data: overview
    });
  } catch (error) {
    next(error);
  }
}

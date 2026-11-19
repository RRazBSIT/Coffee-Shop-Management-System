import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token is required.'
    });
    return;
  }

  const token = authorization.split(' ')[1];

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || req.auth.accountType !== 'staff') {
      res.status(403).json({
        success: false,
        message: 'Staff access is required.'
      });
      return;
    }

    const role = req.auth.roleName?.toLowerCase();

    if (!role || !allowedRoles.map((item) => item.toLowerCase()).includes(role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.'
      });
      return;
    }

    next();
  };
}

export function authorizeAccountType(...allowedTypes: Array<'staff' | 'customer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !allowedTypes.includes(req.auth.accountType)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.'
      });
      return;
    }

    next();
  };
}

import type { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  const status = typeof error?.status === 'number' ? error.status : 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : error.message
  });
};

export default errorHandler;

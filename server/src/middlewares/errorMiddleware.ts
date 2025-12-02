import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ ERROR CAPTURADO:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    isAppError: err instanceof AppError
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      message: err.message
    });
  }

  // Error no manejado
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorMiddleware;
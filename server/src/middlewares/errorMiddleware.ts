import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
      },
    });
  }

  console.error('Error no manejado:', err);
  res.status(500).json({
    error: {
      message: 'Error interno del servidor',
    },
  });
};

export default errorMiddleware;
import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
    statusCode?: number;
    status?: string;
}

const errorMiddleware = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    console.log(err.stack);

    res.status(err.statusCode || 500).json({
        error: {
            message: err.message || "¡Ups! Algo salió mal en el servidor."
        }
    });
}

export default errorMiddleware;
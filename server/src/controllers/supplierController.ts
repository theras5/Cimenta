import { NextFunction, Request, Response } from "express";
import { getSuppliersService } from "../services/supplierService"

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getSuppliersService();
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};
import { NextFunction, Request, Response } from "express";
import {
    getAllPurchasesService,
    getPurchaseByIdService,
    createPurchaseService,
    updatePurchaseByIdService,
    deletePurchaseByIdService,
    getPurchasesBySiteService,
    getPurchasesByStatusService,
    getPurchasesByUserService,
    updatePurchaseStatusService
} from "../services/purchaseService";

export const getAllPurchases = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getAllPurchasesService();
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const getPurchaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        console.log(`Obteniendo compra con ID: ${id}`);
        const data = await getPurchaseByIdService(id);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const purchaseToCreate = req.body;

        // Verificar campos requeridos
        if (!purchaseToCreate.product || !purchaseToCreate.category) {
            return res.status(400).json({
                error: "product y category son campos requeridos"
            });
        }

        const data = await createPurchaseService(purchaseToCreate);
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

export const updatePurchaseById = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    try {
        const purchaseToUpdate = req.body;
        console.log(`Actualizando compra ${id} con datos:`, JSON.stringify(purchaseToUpdate, null, 2));
        const data = await updatePurchaseByIdService(id, purchaseToUpdate);
        console.log(`Compra ${id} actualizada exitosamente`);
        res.status(200).json(data);
    } catch (error) {
        console.error(`Error actualizando compra ${id}:`, error);
        next(error);
    }
};

export const deletePurchaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await deletePurchaseByIdService(id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const getPurchasesBySite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const siteId = req.params.siteId;
        console.log(`Obteniendo compras para el sitio: ${siteId}`);
        const data = await getPurchasesBySiteService(siteId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

// export const getPurchasesByStatus = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const status = req.params.status;
//         console.log(`Obteniendo compras con estado: ${status}`);
//         const data = await getPurchasesByStatusService(status);
//         res.status(200).json(data);
//     } catch (err) {
//         next(err);
//     }
// };

export const getPurchasesByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;
        console.log(`Obteniendo compras para el usuario: ${userId}`);
        const data = await getPurchasesByUserService(userId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const updatePurchaseStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                error: "El campo status es requerido"
            });
        }
        
        console.log(`Actualizando estado de compra ${id} a: ${status}`);
        const data = await updatePurchaseStatusService(id, status);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};
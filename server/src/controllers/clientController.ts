import { Request, Response, NextFunction } from "express";
import {
  getClientsByUserService,
  getClientByIdService,
  createClientService,
  updateClientByIdService,
  deleteClientByIdService
} from "../services/clientService";

export const getClientsByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const data = await getClientsByUserService(userId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await getClientByIdService(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createClientService(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateClientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await updateClientByIdService(id, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteClientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await deleteClientByIdService(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

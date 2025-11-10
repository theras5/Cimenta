import { NextFunction, Request, Response } from "express";
import { 
  getEmployeesByUserService,
  getEmployeeByIdService, 
  createEmployeeService, 
  updateEmployeeByIdService, 
  deleteEmployeeByIdService 
} from "../services/employeeService";

export const getEmployeesByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    const data = await getEmployeesByUserService(userId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const data = await getEmployeeByIdService(id);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { first_name, last_name, phone, user_id } = req.body;

    if (!first_name) {
      return res.status(400).json({ error: "first_name is required" });
    }
    if (!last_name) {
      return res.status(400).json({ error: "last_name is required" });
    }
    if (!phone) {
      return res.status(400).json({ error: "phone is required" });
    }
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const data = await createEmployeeService({ first_name, last_name, phone, user_id });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const employeeToUpdate = req.body;
    const data = await updateEmployeeByIdService(id, employeeToUpdate);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    await deleteEmployeeByIdService(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

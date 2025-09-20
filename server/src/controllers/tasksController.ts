import { NextFunction, Request, Response } from "express";
import { createTaskService, deleteTaskByIdService, updateTaskByIdService, getTaskByIdService, getAllTasksService } from "../services/taskService";

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getAllTasksService();
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id);
        const data = await getTaskByIdService(id);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

// tenemos que tener definido un TaskT
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const taskToCreate = req.body;
        const data = await createTaskService(taskToCreate);
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// 3. Implementa la ruta PUT
export const updateTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id);
        const taskToUpdate = req.body;
        const data = await updateTaskByIdService(id, taskToUpdate);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// 4. Implementa la ruta DELETE
export const deleteTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id);
        await deleteTaskByIdService(id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
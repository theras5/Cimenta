import { NextFunction, Request, Response } from "express";
import {
    assignWorkerToTaskService,
    getWorkersByTaskService,
    getTasksByWorkerService,
    unassignWorkerFromTaskService,
    unassignAllWorkersFromTaskService,
    assignMultipleWorkersToTaskService
} from "../services/assignedToService";

// POST /assigned-to - Asignar un worker a una task
export const assignWorkerToTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { worker_id, task_id } = req.body;

        if (!worker_id) {
            return res.status(400).json({ error: "worker_id is required" });
        }
        if (!task_id) {
            return res.status(400).json({ error: "task_id is required" });
        }

        const data = await assignWorkerToTaskService({ worker_id, task_id });
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// POST /assigned-to/multiple - Asignar múltiples workers a una task
export const assignMultipleWorkersToTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { task_id, worker_ids } = req.body;

        if (!task_id) {
            return res.status(400).json({ error: "task_id is required" });
        }
        if (!worker_ids || !Array.isArray(worker_ids) || worker_ids.length === 0) {
            return res.status(400).json({ error: "worker_ids must be a non-empty array" });
        }

        const data = await assignMultipleWorkersToTaskService(task_id, worker_ids);
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// GET /assigned-to/task/:taskId - Obtener workers asignados a una task
export const getWorkersByTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const taskId = req.params.taskId;
        const data = await getWorkersByTaskService(taskId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// GET /assigned-to/worker/:workerId - Obtener tasks asignadas a un worker
export const getTasksByWorker = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workerId = req.params.workerId;
        const data = await getTasksByWorkerService(workerId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// DELETE /assigned-to - Desasignar un worker de una task
export const unassignWorkerFromTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { worker_id, task_id } = req.body;

        if (!worker_id) {
            return res.status(400).json({ error: "worker_id is required" });
        }
        if (!task_id) {
            return res.status(400).json({ error: "task_id is required" });
        }

        await unassignWorkerFromTaskService(worker_id, task_id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// DELETE /assigned-to/task/:taskId - Desasignar todos los workers de una task
export const unassignAllWorkersFromTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const taskId = req.params.taskId;
        await unassignAllWorkersFromTaskService(taskId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
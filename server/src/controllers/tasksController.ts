import { NextFunction, Request, Response } from "express";
import { 
    getAllTasksService, 
    getTasksBySiteService, 
    getTaskByIdService, 
    createTaskService, 
    updateTaskByIdService, 
    deleteTaskByIdService,
    getTaskDependenciesService,
    updateTaskStatusService
} from "../services/taskService";

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getAllTasksService();
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const getTasksBySite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const siteId = req.params.siteId;
        const data = await getTasksBySiteService(siteId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        console.log(id);
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


        /*
            A FUTURO DESCOMENTAR ESTO
        */
        // if (!taskToCreate.site_id) {
        //     return res.status(400).json({ 
        //         error: "site_id is required" 
        //     });
        // }

        const data = await createTaskService(taskToCreate);
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// 3. Implementa la ruta PUT
export const updateTaskById = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    try {
        const taskToUpdate = req.body;
        console.log(`Actualizando tarea ${id} con datos:`, JSON.stringify(taskToUpdate, null, 2));
        const data = await updateTaskByIdService(id, taskToUpdate);
        console.log(`Tarea ${id} actualizada exitosamente`);
        res.status(200).json(data);
    } catch (error) {
        console.error(`Error actualizando tarea ${id}:`, error);
        next(error);
    }
};

// 4. Implementa la ruta DELETE
export const deleteTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await deleteTaskByIdService(id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// Obtener dependencias de una tarea (tareas que dependen de esta)
export const getTaskDependencies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const blockerId = req.query.blocker_id as string;
        if (!blockerId) {
            return res.status(400).json({ error: 'blocker_id es requerido' });
        }
        const data = await getTaskDependenciesService(blockerId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Actualizar solo el estado de una tarea
export const updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'status es requerido' });
        }

        const data = await updateTaskStatusService(id, status);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};
import { Request, Response, NextFunction } from 'express';
import { getWorkersBySiteService, assignTaskToWorkersService, getWorkerByIdService } from '../services/workerService';

/**
 * Obtiene todos los workers de una obra específica
 * GET /workers/site/:siteId
 */
export const getWorkersBySite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { siteId } = req.params;
        
        if (!siteId) {
            return res.status(400).json({ error: 'siteId es requerido' });
        }

        const workers = await getWorkersBySiteService(siteId);
        res.status(200).json(workers);
    } catch (err) {
        next(err);
    }
};

/**
 * Asigna una tarea a uno o más workers
 * POST /workers/assign
 * Body: { taskId: string, workerIds: string[] }
 */
export const assignTaskToWorkers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { taskId, workerIds } = req.body;
        
        if (!taskId) {
            return res.status(400).json({ error: 'taskId es requerido' });
        }
        if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
            return res.status(400).json({ error: 'workerIds es requerido y debe ser un array con al menos un worker' });
        }

        const assignments = await assignTaskToWorkersService(taskId, workerIds);
        res.status(201).json(assignments);
    } catch (err) {
        next(err);
    }
};

/**
 * Obtiene un worker por su ID
 * GET /workers/:workerId
 */
export const getWorkerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { workerId } = req.params;
        
        if (!workerId) {
            return res.status(400).json({ error: 'workerId es requerido' });
        }

        const worker = await getWorkerByIdService(workerId);
        if (!worker) {
            return res.status(404).json({ error: 'Worker no encontrado' });
        }

        res.status(200).json(worker);
    } catch (err) {
        next(err);
    }
};



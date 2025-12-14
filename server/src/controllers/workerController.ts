import { NextFunction, Request, Response } from "express";
import { 
  getAllWorkersService,
  getWorkersByEmployerService,
  getWorkerByIdService, 
  createWorkerService, 
  updateWorkerByIdService, 
  deleteWorkerByIdService, 
  getWorkersBySiteService, 
  assignTaskToWorkersService
} from "../services/workerService";

export const getAllWorkers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAllWorkersService();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const getWorkersByEmployer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employerId = req.params.employerId;
    const data = await getWorkersByEmployerService(employerId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};


export const createWorker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employer_id, worker_name, worker_surname, worker_cellnumber, profession } = req.body;

    if (!employer_id) {
      return res.status(400).json({ error: "employer_id is required" });
    }
    if (!worker_name) {
      return res.status(400).json({ error: "worker_name is required" });
    }
    if (!worker_cellnumber) {
      return res.status(400).json({ error: "worker_cellnumber is required" });
    }

    const data = await createWorkerService({ 
      employer_id, 
      worker_name, 
      worker_surname: worker_surname || null,
      worker_cellnumber, 
      profession: profession || 'other'
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateWorkerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.workerId;
    const workerToUpdate = req.body;
    const data = await updateWorkerByIdService(id, workerToUpdate);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteWorkerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.workerId;
    await deleteWorkerByIdService(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
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

//whisper
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

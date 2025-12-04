import { NextFunction, Request, Response } from "express";
import { 
  getAllWorkersService,
  getWorkersByEmployerService,
  getWorkerByIdService, 
  createWorkerService, 
  updateWorkerByIdService, 
  deleteWorkerByIdService 
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

export const getWorkerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.workerId;
    const data = await getWorkerByIdService(id);
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
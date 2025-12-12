import express from 'express';
import { getWorkersBySite, assignTaskToWorkers, getWorkerById } from '../controllers/workerController';

const workersRouter = express.Router();

workersRouter.get("/site/:siteId", getWorkersBySite);
workersRouter.post("/assign", assignTaskToWorkers);
workersRouter.get("/:workerId", getWorkerById);

export default workersRouter;



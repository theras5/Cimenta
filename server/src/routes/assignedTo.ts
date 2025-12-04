import { Router } from "express";
import {
    assignWorkerToTask,
    assignMultipleWorkersToTask,
    getWorkersByTask,
    getTasksByWorker,
    unassignWorkerFromTask,
    unassignAllWorkersFromTask
} from "../controllers/assignedToController";

const router = Router();

// POST /assigned-to - Asignar un worker a una task
router.post("/", assignWorkerToTask);

// POST /assigned-to/multiple - Asignar múltiples workers a una task
router.post("/multiple", assignMultipleWorkersToTask);

// GET /assigned-to/task/:taskId - Obtener workers asignados a una task
router.get("/task/:taskId", getWorkersByTask);

// GET /assigned-to/worker/:workerId - Obtener tasks asignadas a un worker
router.get("/worker/:workerId", getTasksByWorker);

// DELETE /assigned-to - Desasignar un worker de una task
router.delete("/", unassignWorkerFromTask);

// DELETE /assigned-to/task/:taskId - Desasignar todos los workers de una task
router.delete("/task/:taskId", unassignAllWorkersFromTask);

export default router;
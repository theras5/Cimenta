import { Router } from "express";
import {
  getAllWorkers,
  getWorkersByEmployer,
  getWorkerById,
  createWorker,
  updateWorkerById,
  deleteWorkerById,
  getWorkersBySite,
  assignTaskToWorkers
} from "../controllers/workerController";

const router = Router();

// GET /workers - Obtener todos los trabajadores
router.get("/", getAllWorkers);

// GET /workers/employer/:employerId - Obtener trabajadores por empleador
router.get("/employer/:employerId", getWorkersByEmployer);

// GET /workers/site/:siteId - Obtener trabajadores por obra
router.get("/site/:siteId", getWorkersBySite);

// GET /workers/:workerId - Obtener trabajador por ID
router.get("/:workerId", getWorkerById);

// POST /workers - Crear nuevo trabajador
router.post("/", createWorker);

// POST /workers/assign - Asignar tarea a trabajadores
router.post("/assign", assignTaskToWorkers);

// PUT /workers/:workerId - Actualizar trabajador
router.put("/:workerId", updateWorkerById);

// DELETE /workers/:workerId - Eliminar trabajador
router.delete("/:workerId", deleteWorkerById);

export default router;

import { Router } from "express";
import {
  getAllWorkers,
  getWorkersByEmployer,
  getWorkerById,
  createWorker,
  updateWorkerById,
  deleteWorkerById
} from "../controllers/workerController";

const router = Router();

// GET /workers - Obtener todos los trabajadores
router.get("/", getAllWorkers);

// GET /workers/employer/:employerId - Obtener trabajadores por empleador
router.get("/employer/:employerId", getWorkersByEmployer);

// GET /workers/:workerId - Obtener trabajador por ID
router.get("/:workerId", getWorkerById);

// POST /workers - Crear nuevo trabajador
router.post("/", createWorker);

// PUT /workers/:workerId - Actualizar trabajador
router.put("/:workerId", updateWorkerById);

// DELETE /workers/:workerId - Eliminar trabajador
router.delete("/:workerId", deleteWorkerById);

export default router;
import express from 'express';
import { 
    getAllTasks, 
    getTaskById, 
    createTask, 
    updateTaskById, 
    deleteTaskById, 
    getTasksBySite,
    getTaskDependencies,
    updateTaskStatus
} from '../controllers/tasksController';

const tasksRouter = express.Router();

/*

GET /tasks/ (te trae todas las tasks creadas)
GET /task/:id (te trae una task con el id indicado)
POST /task (toma un objeto del tipo {id, title, description})
PUT /task:id (modifica un task con el id indicado)
DELETE /task:id (elimina un task con el id indicado)

*/

tasksRouter.get("/", getAllTasks);

tasksRouter.get("/site/:siteId", getTasksBySite);

// Ruta para obtener dependencias de tareas (debe ir antes de /:id para evitar conflictos)
tasksRouter.get("/dependencies", getTaskDependencies);

// Ruta para actualizar solo el estado de una tarea (debe ir antes de /:id para evitar conflictos)
tasksRouter.patch("/:id/status", updateTaskStatus);

tasksRouter.get("/:id", getTaskById);

// tenemos que tener definido un TaskT
tasksRouter.post("/", createTask);

// 3. Implementa la ruta PUT
tasksRouter.put("/:id", updateTaskById);

// 4. Implementa la ruta DELETE
tasksRouter.delete("/:id", deleteTaskById);

export default tasksRouter;
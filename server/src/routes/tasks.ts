import express from 'express';
import { 
    getAllTasks, 
    getTaskById, 
    createTask, 
    updateTaskById, 
    deleteTaskById, 
    getTasksBySite 
} from '../controllers/tasksController';

const tasksRouter = express.Router();

/*

GET /tasks/ (te trae todas las tasks creadas)
GET /task/:id (te trae una task con el id indicado)
POST /task (toma un objeto del tipo {id, title, description})
PUT /task:id (modifica un task con el id indicado)
DELETE /task:id (elimina un task con el id indicado)

*/

tasksRouter.get("/tasks", getAllTasks);

tasksRouter.get("/tasks/site/:siteId", getTasksBySite);

tasksRouter.get("/task/:id", getTaskById);

// tenemos que tener definido un TaskT
tasksRouter.post("/task", createTask);

// 3. Implementa la ruta PUT
tasksRouter.put("/task/:id", updateTaskById);

// 4. Implementa la ruta DELETE
tasksRouter.delete("/task/:id", deleteTaskById);

export default tasksRouter;
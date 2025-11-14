import { Router } from "express";
import {
  getClientsByUser,
  getClientById,
  createClient,
  updateClientById,
  deleteClientById
} from "../controllers/clientController";

const clientRouter = Router();

// GET /clients/user/:userId - Obtener todos los clientes de un usuario
clientRouter.get("/user/:userId", getClientsByUser);

// GET /clients/:id - Obtener un cliente por ID
clientRouter.get("/:id", getClientById);

// POST /clients - Crear un nuevo cliente
clientRouter.post("/", createClient);

// PATCH /clients/:id - Actualizar un cliente
clientRouter.patch("/:id", updateClientById);

// DELETE /clients/:id - Eliminar un cliente
clientRouter.delete("/:id", deleteClientById);

export default clientRouter;

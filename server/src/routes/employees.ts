import { Router } from "express";
import {
  getEmployeesByUser,
  getEmployeeById,
  createEmployee,
  updateEmployeeById,
  deleteEmployeeById
} from "../controllers/employeeController";

const employeeRouter = Router();

// GET /employees/user/:userId - Obtener todos los empleados de un usuario
employeeRouter.get("/user/:userId", getEmployeesByUser);

// GET /employees/:id - Obtener un empleado por ID
employeeRouter.get("/:id", getEmployeeById);

// POST /employees - Crear un nuevo empleado
employeeRouter.post("/", createEmployee);

// PATCH /employees/:id - Actualizar un empleado
employeeRouter.patch("/:id", updateEmployeeById);

// DELETE /employees/:id - Eliminar un empleado
employeeRouter.delete("/:id", deleteEmployeeById);

export default employeeRouter;

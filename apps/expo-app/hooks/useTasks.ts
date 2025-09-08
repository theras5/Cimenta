import { useState, useEffect, useCallback } from "react";
import { TaskService, Task, CreateTaskDTO } from "../services/taskService";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await TaskService.getTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar las tareas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar tareas al iniciar
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Crear una nueva tarea
  const createTask = async (taskData: CreateTaskDTO): Promise<Task> => {
    try {
      const newTask = await TaskService.createTask(taskData);
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    } catch (err: any) {
      setError(err.message || "Error al crear la tarea");
      throw err;
    }
  };

  // Actualizar una tarea
  const updateTask = async (
    id: string,
    taskData: Partial<CreateTaskDTO>
  ): Promise<Task> => {
    try {
      const updatedTask = await TaskService.updateTask(id, taskData);
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updatedTask : task))
      );
      return updatedTask;
    } catch (err: any) {
      setError(err.message || "Error al actualizar la tarea");
      throw err;
    }
  };

  // Actualizar estado de tarea
  const updateTaskStatus = async (
    id: string,
    status: Task["status"]
  ): Promise<Task> => {
    try {
      const updatedTask = await TaskService.updateTaskStatus(id, status);
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updatedTask : task))
      );
      return updatedTask;
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado de la tarea");
      throw err;
    }
  };

  // Eliminar tarea
  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      await TaskService.deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || "Error al eliminar la tarea");
      throw err;
    }
  };

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}

export function useTask(id: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await TaskService.getTask(id);
      setTask(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar la tarea");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // Agrega esta función para actualizar la tarea
  const updateTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    if (!id || !task) return null;

    try {
      setIsLoading(true);
      setError(null);
      // Asumiendo que tienes un método updateTask en tu servicio
      const updatedTask = await TaskService.updateTask(id, taskData);
      setTask(updatedTask);
      return updatedTask;
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "No se pudo actualizar la tarea");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (): Promise<boolean> => {
    if (!id) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Asumiendo que tienes un método deleteTask en tu servicio
      const success = await TaskService.deleteTask(id);
      return success;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'No se pudo eliminar la tarea');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    task,
    isLoading,
    error,
    refetch: fetchTask,
    updateTask,
    deleteTask
  };
}

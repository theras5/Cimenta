import { useState, useCallback } from 'react';
import AssignedToService, { WorkerWithTask, TaskWithWorker } from '@/services/assignedToService';

export function useAssignedTo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Asignar un worker a una task
  const assignWorkerToTask = useCallback(async (workerId: string, taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await AssignedToService.assignWorkerToTask(workerId, taskId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Asignar múltiples workers a una task
  const assignMultipleWorkersToTask = useCallback(
    async (taskId: string, workerIds: string[]) => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await AssignedToService.assignMultipleWorkersToTask(taskId, workerIds);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Obtener workers asignados a una task
  const getWorkersByTask = useCallback(async (taskId: string): Promise<WorkerWithTask[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await AssignedToService.getWorkersByTask(taskId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obtener tasks asignadas a un worker
  const getTasksByWorker = useCallback(async (workerId: string): Promise<TaskWithWorker[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await AssignedToService.getTasksByWorker(workerId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Desasignar un worker de una task
  const unassignWorkerFromTask = useCallback(async (workerId: string, taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await AssignedToService.unassignWorkerFromTask(workerId, taskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Desasignar todos los workers de una task
  const unassignAllWorkersFromTask = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await AssignedToService.unassignAllWorkersFromTask(taskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    assignWorkerToTask,
    assignMultipleWorkersToTask,
    getWorkersByTask,
    getTasksByWorker,
    unassignWorkerFromTask,
    unassignAllWorkersFromTask,
    clearError,
  };
}
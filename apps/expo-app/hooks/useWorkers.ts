import { useState, useCallback, useEffect } from 'react';
import WorkerService, { Worker } from '@/services/workerService';

export function useWorkers(employerId?: string) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener workers por employer
  const fetchWorkersByEmployer = useCallback(async (empId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await WorkerService.getWorkersByEmployer(empId);
      setWorkers(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Crear worker
  const createWorker = useCallback(async (worker: Omit<Worker, 'worker_id'>) => {
    try {
      setIsLoading(true);
      setError(null);
      const newWorker = await WorkerService.createWorker(worker);
      setWorkers(prev => [...prev, newWorker]);
      return newWorker;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Actualizar worker
  const updateWorker = useCallback(async (workerId: string, data: Partial<Worker>) => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedWorker = await WorkerService.updateWorker(workerId, data);
      setWorkers(prev => prev.map(w => w.worker_id === workerId ? updatedWorker : w));
      return updatedWorker;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Eliminar worker
  const deleteWorker = useCallback(async (workerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await WorkerService.deleteWorker(workerId);
      setWorkers(prev => prev.filter(w => w.worker_id !== workerId));
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

  // Cargar workers automáticamente si se proporciona employerId
  useEffect(() => {
    if (employerId) {
      fetchWorkersByEmployer(employerId);
    }
  }, [employerId, fetchWorkersByEmployer]);

  return {
    workers,
    isLoading,
    error,
    fetchWorkersByEmployer,
    createWorker,
    updateWorker,
    deleteWorker,
    clearError,
  };
}
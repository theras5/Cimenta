"use client";

import { useState, useCallback } from "react";
import { Worker } from "./useWorkers";
import { Task } from "@cimenta/dtos";

export interface AssignedTo {
  worker_id: string;
  task_id: string;
}

export interface WorkerWithTask {
  worker_id: string;
  task_id: string;
  workers: Worker;
}

export interface TaskWithWorker {
  worker_id: string;
  task_id: string;
  tasks: Task;
}

export function useAssignedTo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignWorkerToTask = useCallback(async (workerId: string, taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/assigned-to", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ worker_id: workerId, task_id: taskId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error assigning worker to task:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignMultipleWorkersToTask = useCallback(async (taskId: string, workerIds: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/assigned-to/multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_id: taskId, worker_ids: workerIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error assigning multiple workers:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkersByTask = useCallback(async (taskId: string): Promise<WorkerWithTask[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/assigned-to/task/${taskId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching workers by task:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTasksByWorker = useCallback(async (workerId: string): Promise<TaskWithWorker[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/assigned-to/worker/${workerId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching tasks by worker:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignWorkerFromTask = useCallback(async (workerId: string, taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/assigned-to", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ worker_id: workerId, task_id: taskId }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error unassigning worker from task:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignAllWorkersFromTask = useCallback(async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/assigned-to/task/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error unassigning all workers from task:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    assignWorkerToTask,
    assignMultipleWorkersToTask,
    getWorkersByTask,
    getTasksByWorker,
    unassignWorkerFromTask,
    unassignAllWorkersFromTask,
  };
}
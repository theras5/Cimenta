"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService, Task } from "@/lib/api";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (siteId?: string) => {
    if (!siteId) {
      setError("No hay sitio seleccionado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ajustar la URL para filtrar por site_id
      const response = await fetch(`/api/tasks?site_id=${siteId}`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskData: Partial<Task>) => {
    if (!taskData.site_id) {
      setError("No hay sitio seleccionado para la tarea");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Debug: log payload being sent
      console.debug("createTask payload:", taskData);
      // Remove undefined/null/empty-string values to avoid sending invalid fields
      const filtered = Object.fromEntries(
        Object.entries(taskData).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        // Try to extract server error body for debugging
        let serverMessage = "";
        try {
          const errBody = await response.json();
          serverMessage = JSON.stringify(errBody);
        } catch (e) {
          try {
            serverMessage = await response.text();
          } catch (e2) {
            serverMessage = response.statusText;
          }
        }
        console.error("createTask server error:", response.status, serverMessage);
        throw new Error(`Error: ${response.status} ${serverMessage}`);
      }

      const newTask = await response.json();
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const updatedTask = await response.json();
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updatedTask : task))
      );
      return updatedTask;
    } catch (err) {
      console.error("Error updating task:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar la tarea";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setError(null);
      await apiService.deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al eliminar la tarea";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateTaskStatus = async (id: string, status: Task["status"]) => {
    return updateTask(id, { status });
  };

  const clearError = () => setError(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    clearError,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";

export interface Worker {
  worker_id: string;
  employer_id: string;
  worker_name: string;
  worker_surname: string | null;
  worker_cellnumber: string;
  profession: string;
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/workers");

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWorkers(data);
    } catch (err) {
      console.error("Error fetching workers:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkersByEmployer = useCallback(async (employerId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Usar la ruta de Next.js API con query parameter
      const response = await fetch(`/api/workers?employerId=${employerId}`);

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Si no es JSON, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setWorkers(data);
      return data;
    } catch (err) {
      console.error("Error fetching workers by employer:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkerById = useCallback(async (workerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workers/${workerId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching worker by id:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorker = useCallback(async (newWorker: Omit<Worker, "worker_id">) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newWorker),
      });

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const text = await response.text();
            // Si es HTML, extraer solo un mensaje breve
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              errorMessage = `Error ${response.status}: El servidor respondió con HTML en lugar de JSON`;
            } else {
              errorMessage = text || errorMessage;
            }
          }
        } catch (e) {
          // Si falla el parseo, usar el mensaje por defecto
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setWorkers((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("Error creating worker:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorker = useCallback(async (workerId: string, updatedWorker: Partial<Worker>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workers/${workerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedWorker),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWorkers((prev) =>
        prev.map((worker) => (worker.worker_id === workerId ? data : worker))
      );
      return data;
    } catch (err) {
      console.error("Error updating worker:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteWorker = useCallback(async (workerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workers/${workerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      setWorkers((prev) => prev.filter((worker) => worker.worker_id !== workerId));
    } catch (err) {
      console.error("Error deleting worker:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    workers,
    loading,
    error,
    fetchWorkers,
    fetchWorkersByEmployer,
    fetchWorkerById,
    createWorker,
    updateWorker,
    deleteWorker,
  };
}
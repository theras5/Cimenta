"use client";

import { useState, useEffect } from 'react';
import { apiService, Update } from '@/lib/api';

export function useUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getUpdates();
      setUpdates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los avances');
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUpdate = async (updateData: Omit<Update, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const newUpdate = await apiService.createUpdate(updateData);
      setUpdates(prev => [newUpdate, ...prev]); // Nuevos updates al principio
      return newUpdate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el avance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateUpdate = async (id: string, updates: Partial<Update>) => {
    try {
      setError(null);
      const updatedUpdate = await apiService.updateUpdate(id, updates);
      setUpdates(prev => prev.map(update => update.id === id ? updatedUpdate : update));
      return updatedUpdate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el avance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteUpdate = async (id: string) => {
    try {
      setError(null);
      await apiService.deleteUpdate(id);
      setUpdates(prev => prev.filter(update => update.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el avance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const clearError = () => setError(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  return {
    updates,
    loading,
    error,
    fetchUpdates,
    createUpdate,
    updateUpdate,
    deleteUpdate,
    clearError,
  };
}
"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiService, Update } from '@/lib/api';

export function useUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Obtener el site seleccionado de localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const siteId = localStorage.getItem('selectedSiteId');
      setSelectedSiteId(siteId);
    }
  }, []);

  const fetchUpdates = useCallback(async (siteId?: string | null) => {
    // Usar el siteId pasado como parámetro o el del estado
    const useSiteId = siteId || selectedSiteId;
    
    if (!useSiteId) {
      setError("No hay sitio seleccionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Usar la versión actualizada del método que ahora acepta siteId
      const data = await apiService.getUpdates(useSiteId);
      setUpdates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los avances');
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  const createUpdate = async (updateData: Omit<Update, 'id' | 'created_at' | 'updated_at'>) => {
    // Asegurar que se incluya el siteId
    if (!updateData.site_id && selectedSiteId) {
      updateData = { ...updateData, site_id: selectedSiteId };
    }

    if (!updateData.site_id) {
      throw new Error("No hay sitio seleccionado para crear el avance");
    }

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
    if (selectedSiteId) {
      fetchUpdates(selectedSiteId);
    }
  }, [selectedSiteId, fetchUpdates]);

  return {
    updates,
    loading,
    error,
    fetchUpdates,
    createUpdate,
    updateUpdate,
    deleteUpdate,
    clearError,
    selectedSiteId
  };
}
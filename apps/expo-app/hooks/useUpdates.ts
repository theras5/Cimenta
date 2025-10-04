import { CreateUpdateDTO, Update, UpdateService } from "@/services/updateService";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


export function useUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const fetchUpdates = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    const siteId = await AsyncStorage.getItem("selectedSiteId");
    if (!siteId) {
      setUpdates([]);
      setIsLoading(false);
      return;
    }
    const data = await UpdateService.getUpdatesBySite(siteId);
    setUpdates(data);
  } catch (err: any) {
    setError(err.message || "Error al cargar los avances");
  } finally {
    setIsLoading(false);
  }
}, []);

  // Cargar updates al iniciar
  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  // Crear un nuevo update
  const createUpdate = async (updateData: CreateUpdateDTO): Promise<Update> => {
    try {
      const newUpdate = await UpdateService.createUpdate(updateData);
      setUpdates((prev) => [...prev, newUpdate]);
      return newUpdate;
    } catch (err: any) {
      setError(err.message || "Error al crear el avance");
      throw err;
    }
  };

  // Actualizar un update
  const updateUpdate = async (
    id: string,
    updateData: Partial<CreateUpdateDTO>
  ): Promise<Update> => {
    try {
      const updatedUpdate = await UpdateService.updateUpdate(id, updateData);
      setUpdates((prev) =>
        prev.map((update) => (update.id === id ? updatedUpdate : update))
      );
      return updatedUpdate;
    } catch (err: any) {
      setError(err.message || "Error al actualizar el avance");
      throw err;
    }
  };

  // Eliminar update
  const deleteUpdate = async (id: string): Promise<boolean> => {
    try {
      await UpdateService.deleteUpdate(id);
      setUpdates((prev) => prev.filter((update) => update.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || "Error al eliminar el avance");
      throw err;
    }
  };

  return {
    updates,
    isLoading,
    error,
    fetchUpdates,
    createUpdate,
    updateUpdate,
    deleteUpdate,
  };
}

export function useUpdate(id: string | undefined) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdate = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await UpdateService.getUpdate(id);
      setUpdate(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar el avance");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUpdate();
  }, [fetchUpdate]);

  // Agrega esta función para actualizar la tarea
  const updateUpdate = async (updateData: Partial<Update>): Promise<Update | null> => {
    if (!id || !update) return null;

    try {
      setIsLoading(true);
      setError(null);
      // Asumiendo que tienes un método updateTask en tu servicio
      const updatedUpdate = await UpdateService.updateUpdate(id, updateData);
      setUpdate(updatedUpdate);
      return updatedUpdate;
    } catch (err: any) {
      console.error("Error updating update:", err);
      setError(err.message || "No se pudo actualizar el avance");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUpdate = async (): Promise<boolean> => {
    if (!id) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Asumiendo que tienes un método deleteTask en tu servicio
      const success = await UpdateService.deleteUpdate(id);
      return success;
    } catch (err: any) {
      console.error('Error deleting update:', err);
      setError(err.message || 'No se pudo eliminar el avance');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    update,
    isLoading,
    error,
    refetch: fetchUpdate,
    updateUpdate,
    deleteUpdate
  };
}
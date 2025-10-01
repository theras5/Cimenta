import { useState, useEffect, useCallback } from "react";
import { ChangeService, ChangeRequest, CreateChangeRequestDTO } from "../services/changeService";
import AsyncStorage from "@react-native-async-storage/async-storage";



export function useChangeRequests() {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChangeRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const siteId = await AsyncStorage.getItem("selectedSiteId");
      if (!siteId) {
        setChangeRequests([]);
        setIsLoading(false);
        return;
      }
      const data = await ChangeService.getChangeRequestsBySite(siteId);
      setChangeRequests(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar las solicitudes de cambio");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar solicitudes al iniciar
  useEffect(() => {
    fetchChangeRequests();
  }, [fetchChangeRequests]);

  // Crear una nueva solicitud de cambio
  const createChangeRequest = async (changeData: CreateChangeRequestDTO): Promise<ChangeRequest> => {
    try {
      const newChangeRequest = await ChangeService.createChangeRequest(changeData);
      setChangeRequests((prev) => [...prev, newChangeRequest]);
      return newChangeRequest;
    } catch (err: any) {
      setError(err.message || "Error al crear la solicitud de cambio");
      throw err;
    }
  };

  // Actualizar una solicitud de cambio
  const updateChangeRequest = async (
    id: string,
    changeData: Partial<CreateChangeRequestDTO>
  ): Promise<ChangeRequest> => {
    try {
      const updatedChangeRequest = await ChangeService.updateChangeRequest(id, changeData);
      setChangeRequests((prev) =>
        prev.map((change) => (change.id === id ? updatedChangeRequest : change))
      );
      return updatedChangeRequest;
    } catch (err: any) {
      setError(err.message || "Error al actualizar la solicitud de cambio");
      throw err;
    }
  };

  // Eliminar solicitud de cambio
  const deleteChangeRequest = async (id: string): Promise<boolean> => {
    try {
      await ChangeService.deleteChangeRequest(id);
      setChangeRequests((prev) => prev.filter((change) => change.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || "Error al eliminar la solicitud de cambio");
      throw err;
    }
  };

  return {
    changeRequests,
    isLoading,
    error,
    fetchChangeRequests,
    createChangeRequest,
    updateChangeRequest,
    deleteChangeRequest,
  };
}

export function useChangeRequest(id: string | undefined) {
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChangeRequest = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await ChangeService.getChangeRequest(id);
      setChangeRequest(data);
    } catch (err: any) {
      // Solo mostrar error si no es un 404 simple
      if (err.message && !err.message.includes('404')) {
        setError(err.message || "Error al cargar la solicitud de cambio");
      } else {
        console.log(`Change request with ID ${id} not found`);
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChangeRequest();
  }, [fetchChangeRequest]);

  // Actualizar la solicitud de cambio
  const updateChangeRequest = async (changeData: Partial<ChangeRequest>): Promise<ChangeRequest | null> => {
    if (!id || !changeRequest) return null;

    try {
      setIsLoading(true);
      setError(null);
      const updatedChangeRequest = await ChangeService.updateChangeRequest(id, changeData);
      setChangeRequest(updatedChangeRequest);
      return updatedChangeRequest;
    } catch (err: any) {
      console.error("Error updating change request:", err);
      setError(err.message || "No se pudo actualizar la solicitud de cambio");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChangeRequest = async (): Promise<boolean> => {
    if (!id) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await ChangeService.deleteChangeRequest(id);
      return success;
    } catch (err: any) {
      console.error('Error deleting change request:', err);
      setError(err.message || 'No se pudo eliminar la solicitud de cambio');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    changeRequest,
    isLoading,
    error,
    refetch: fetchChangeRequest,
    updateChangeRequest,
    deleteChangeRequest
  };
}
"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Site, CreateSiteParams, UpdateSiteParams } from "@/lib/types/site";
import { siteService } from "@/lib/services/siteService";

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar sitios de un usuario
  const loadUserSites = useCallback(async (userId: string) => {
    if (!userId) {
      setError("ID de usuario no proporcionado");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await siteService.getUserSites(userId);
      setSites(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "No se pudieron cargar las obras",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Crear un nuevo sitio
  const createSite = async (siteData: CreateSiteParams) => {
    if (!siteData.address.trim()) {
      toast({
        title: "Error",
        description: "La dirección no puede estar vacía",
        variant: "destructive",
      });
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const newSite = await siteService.createSite(siteData);
      setSites(prev => [...prev, newSite]);
      
      toast({
        title: "Éxito",
        description: "Obra creada correctamente",
      });
      
      return newSite;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "No se pudo crear la obra",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar un sitio
  const updateSite = async (siteId: string, updateData: UpdateSiteParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedSite = await siteService.updateSite(siteId, updateData);
      
      setSites(prev => 
        prev.map(site => site.id === siteId ? updatedSite : site)
      );
      
      toast({
        title: "Éxito",
        description: "Obra actualizada correctamente",
      });
      
      return updatedSite;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "No se pudo actualizar la obra",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar un sitio
  const deleteSite = async (siteId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await siteService.deleteSite(siteId);
      
      setSites(prev => prev.filter(site => site.id !== siteId));
      
      toast({
        title: "Éxito",
        description: "Obra eliminada correctamente",
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: "No se pudo eliminar la obra",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Limpiar error
  const clearError = () => setError(null);

  return {
    sites,
    loading,
    error,
    loadUserSites,
    createSite,
    updateSite,
    deleteSite,
    clearError,
  };
}
// apps/web-app/lib/services/siteService.ts
import { Site, CreateSiteParams, UpdateSiteParams } from "../types/site";

class SiteService {
  // Obtener todos los sitios de un usuario
  async getUserSites(userId: string): Promise<Site[]> {
    try {
      const response = await fetch(`/api/sites/user/${userId}`); // ← Agregar /api/
      console.log('Cliente: Solicitando sitios para usuario:', userId);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      return response.json();
    } catch (error) {
      console.error("Error fetching user sites:", error);
      throw error;
    }
  }

  // Obtener un sitio específico por ID
  async getSite(siteId: string): Promise<Site> {
    try {
      const response = await fetch(`/api/sites/${siteId}`); // ← Agregar /api/
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error fetching site:", error);
      throw error;
    }
  }

  // Crear un nuevo sitio
  async createSite(siteData: CreateSiteParams): Promise<Site> {
    try {
      const response = await fetch('/api/sites', { // ← Agregar /api/
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siteData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error creating site:", error);
      throw error;
    }
  }

  // Actualizar un sitio existente
  async updateSite(siteId: string, siteData: UpdateSiteParams): Promise<Site> {
    try {
      const response = await fetch(`/api/sites/${siteId}`, { // ← Agregar /api/
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siteData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error updating site:", error);
      throw error;
    }
  }

  // Eliminar un sitio
  async deleteSite(siteId: string): Promise<void> {
    try {
      const response = await fetch(`/api/sites/${siteId}`, { // ← Agregar /api/
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting site:", error);
      throw error;
    }
  }
}

export const siteService = new SiteService();
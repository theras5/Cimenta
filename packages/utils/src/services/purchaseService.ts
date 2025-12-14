import { Purchase, CreatePurchaseDTO } from "packages/dtos/src/types/purchase.dto";

export const createPurchaseService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  // Obtener todas las compras
  async getPurchases(): Promise<Purchase[]> {
    const response = await fetch(`${apiUrl}/purchases`); 
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Obtener una compra por ID
  async getPurchase(id: string): Promise<Purchase> {
    const response = await fetch(`${apiUrl}/purchases/${id}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Crear una nueva compra
  async createPurchase(purchase: CreatePurchaseDTO): Promise<Purchase> {
    const response = await fetch(`${apiUrl}/purchases`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        ...purchase,
      })
    });
    
    if (!response.ok) {
      // Intentar obtener el mensaje de error del body si está disponible
      let errorMessage = `${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (e) {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
      }
      throw new Error(`Error ${errorMessage}`);
    }
    
    return await response.json();
  },

  // Obtener compras por sitio
  async getPurchasesBySite(siteId: string): Promise<Purchase[]> {
    const response = await fetch(`${apiUrl}/purchases/site/${siteId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Actualizar una compra
  async updatePurchase(id: string, purchase: Partial<CreatePurchaseDTO>): Promise<Purchase> {
    const response = await fetch(`${apiUrl}/purchases/${id}`, {
      method: 'PUT',
      headers: baseHeaders,
      body: JSON.stringify(purchase),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Eliminar una compra
  async deletePurchase(id: string): Promise<boolean> {
    const response = await fetch(`${apiUrl}/purchases/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return true;
  },
  
  // Actualizar estado de una compra
  async updatePurchaseStatus(id: string, status: Purchase['status']): Promise<Purchase> {
    const response = await fetch(`${apiUrl}/purchases/${id}/status`, {
      method: 'PATCH',
      headers: baseHeaders,
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Método adicional: filtrar compras por estado
  async getPurchasesByStatus(status: Purchase['status']): Promise<Purchase[]> {
    const response = await fetch(`${apiUrl}/purchases/status/${status}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Obtener compras de un usuario
  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    const response = await fetch(`${apiUrl}/purchases/user/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
});
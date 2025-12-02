import { Supplier } from "../types/supplier";

class SupplierService {
  // Obtener todos los suppliers
  async getUserSites(userId: string): Promise<Supplier[]> {
    try {
      const response = await fetch(`/api/suppliers`);
      console.log('Cliente: Solicitando suppliers');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      return response.json();
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      throw error;
    }
}
}

export const supplierService = new SupplierService();
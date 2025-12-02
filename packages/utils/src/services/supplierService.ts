import { Supplier } from "packages/dtos/src/types/supplier.dto";


export const createSupplierService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  // Obtener todas los suppliers
  async getAllSuppliers(): Promise<Supplier[]> {
      const response = await fetch(`${apiUrl}/suppliers`); 
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  }
});
// apps/web-app/lib/services/clientService.ts

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

export interface CreateClientParams {
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

class ClientService {
  // Obtener todos los clientes de un usuario
  async getUserClients(userId: string): Promise<Client[]> {
    try {
      const response = await fetch(`/api/clients/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error fetching user clients:", error);
      throw error;
    }
  }

  // Crear un nuevo cliente
  async createClient(clientData: CreateClientParams): Promise<Client> {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  }

  // Eliminar un cliente
  async deleteClient(clientId: string): Promise<void> {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  }
}

export const clientService = new ClientService();

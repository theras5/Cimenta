import { Alert } from 'react-native';

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
  created_at?: string;
}

export interface CreateClientParams {
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  Alert.alert(
    'Error de conexión',
    'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  );
  throw error;
};

export const clientService = {
  // Obtener todos los clientes de un usuario
  async getUserClients(userId: string): Promise<Client[]> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/clients/user/${userId}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Crear un nuevo cliente
  async createClient(clientData: CreateClientParams): Promise<Client> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Eliminar un cliente
  async deleteClient(clientId: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/clients/${clientId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return handleApiError(error);
    }
  },
};

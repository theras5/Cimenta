import { Alert } from 'react-native';

// Interfaces para solicitudes de cambio
export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  is_urgent: boolean;
  user_id: string;
  created_at?: string;
}

export interface CreateChangeRequestDTO {
  title: string;
  description: string;
  category: string;
  status?: string;
  is_urgent?: boolean;
  user_id: string;
}

// Función para manejar errores de API
const handleApiError = (error: any, showAlert: boolean = true): never => {
  console.error('Change API Error:', error);
  
  if (showAlert) {
    Alert.alert(
      'Error de conexión',
      'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    );
  }
  
  throw error;
}

// Servicio para solicitudes de cambio
export const ChangeService = {
  // Obtener todas las solicitudes de cambio
  async getChangeRequests(): Promise<ChangeRequest[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/changes`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Obtener una solicitud de cambio por ID
  async getChangeRequest(id: string): Promise<ChangeRequest> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/change/${id}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error, false);
    }
  },
  
  // Crear una nueva solicitud de cambio
  async createChangeRequest(changeData: CreateChangeRequestDTO): Promise<ChangeRequest> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changeData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Actualizar una solicitud de cambio
  async updateChangeRequest(id: string, changeData: Partial<CreateChangeRequestDTO>): Promise<ChangeRequest> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/change/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changeData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Eliminar una solicitud de cambio
  async deleteChangeRequest(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/change/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Obtener solicitudes por estado
  async getChangeRequestsByStatus(status: ChangeRequest['status']): Promise<ChangeRequest[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/changes/status/${status}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Obtener solicitudes por usuario
  async getChangeRequestsByUser(userId: string): Promise<ChangeRequest[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/changes/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
};
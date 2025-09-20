import { Alert } from "react-native";

export interface Update {
  id: number;
  created_at: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
}

export interface CreateUpdateDTO {
  title: string;
  description?: string;
  image_url?: string;
}

// Función para manejar errores de API
const handleApiError = (error: any): never => {
  console.error("API Error:", error);
  Alert.alert(
    "Error de conexión",
    "No se pudo conectar con el servidor. Verifica tu conexión a internet."
  );
  throw error;
};

export const UpdateService = {
  // Obtener todas los updates
  async getUpdates(): Promise<Update[]> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/updates`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Obtener un update por ID
    async getUpdate(id: number): Promise<Update> {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/updates/${id}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        return handleApiError(error);
      }
    },

    // Crear un nuevo update
      async createUpdate(update: CreateUpdateDTO): Promise<Update> {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/updates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
          });
          
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          return handleApiError(error);
        }
      },

    // Actualizar una tarea
      async updateUpdate(id: number, update: Partial<CreateUpdateDTO>): Promise<Update> {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/updates/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
          });
          
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          return handleApiError(error);
        }
      },
      
      // Eliminar una tarea
      async deleteUpdate(id: number): Promise<boolean> {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/updates/${id}`, {
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
};

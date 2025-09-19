import { Alert } from 'react-native';

// Interfaces para los datos
export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor?: string;
  status: 'changes' | 'pending' | 'in_progress' | 'completed' | 'blocked';
  startDate: string;
  endDate: string;
  assignedMembers: string[];
  mediaFiles?: string[];
  createdAt?: string;
//   updatedAt?: string;
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  assignedMembers?: string[];
  mediaFiles?: string[];
}

// Función para manejar errores de API
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  Alert.alert(
    'Error de conexión',
    'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  );
  throw error;
}

// Servicio principal
export const TaskService = {
  // Obtener todas las tareas
  async getTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/tasks`); 
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Obtener una tarea por ID
  async getTask(id: string): Promise<Task> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/task/${id}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Crear una nueva tarea
  async createTask(task: CreateTaskDTO): Promise<Task> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
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
  async updateTask(id: string, task: Partial<CreateTaskDTO>): Promise<Task> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/task/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
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
  async deleteTask(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/task/${id}`, {
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
  
  // Actualizar estado de una tarea
  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/task/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
};
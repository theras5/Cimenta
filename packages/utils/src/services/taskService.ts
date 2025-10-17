import { Task, CreateTaskDTO } from '@cimenta/dtos';

export const createTaskService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  // Obtener todas las tareas
  async getTasks(): Promise<Task[]> {
      const response = await fetch(`${apiUrl}/tasks`); 
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  },
  
  // Obtener una tarea por ID
  async getTask(id: string): Promise<Task> {
      const response = await fetch(`${apiUrl}/tasks/${id}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  },
  
  // Crear una nueva tarea
  async createTask(task: CreateTaskDTO): Promise<Task> {

      const response = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          ...task,
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  },

  async getTasksBySite(siteId: string): Promise<Task[]> {
      const response = await fetch(`${apiUrl}/api/tasks/site/${siteId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  },
  
  // Actualizar una tarea
  async updateTask(id: string, task: Partial<CreateTaskDTO>): Promise<Task> {
      const response = await fetch(`${apiUrl}/tasks/${id}`, {
        method: 'PUT',
        headers: baseHeaders,
        body: JSON.stringify(task),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  },
  
  // Eliminar una tarea
  async deleteTask(id: string): Promise<boolean> {
      const response = await fetch(`${apiUrl}/tasks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
  },
  
  // Actualizar estado de una tarea
  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
      const response = await fetch(`${apiUrl}/tasks/${id}/status`, {
        method: 'PATCH',
        headers: baseHeaders,
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
  }
});


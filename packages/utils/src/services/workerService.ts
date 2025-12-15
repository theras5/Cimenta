import { Worker, CreateWorkerDTO, UpdateWorkerDTO } from '@cimenta/dtos';

export const createWorkerService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  // Obtener todos los workers
  async getWorkers(): Promise<Worker[]> {
    const response = await fetch(`${apiUrl}/workers`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener workers por empleador
  async getWorkersByEmployer(employerId: string): Promise<Worker[]> {
    const response = await fetch(`${apiUrl}/workers/employer/${employerId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener workers por obra
  async getWorkersBySite(siteId: string): Promise<Worker[]> {
    const response = await fetch(`${apiUrl}/workers/site/${siteId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener un worker por ID
  async getWorker(workerId: string): Promise<Worker> {
    const response = await fetch(`${apiUrl}/workers/${workerId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Crear un nuevo worker
  async createWorker(worker: CreateWorkerDTO): Promise<Worker> {
    const response = await fetch(`${apiUrl}/workers`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(worker),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Actualizar un worker
  async updateWorker(workerId: string, worker: UpdateWorkerDTO): Promise<Worker> {
    const response = await fetch(`${apiUrl}/workers/${workerId}`, {
      method: 'PUT',
      headers: baseHeaders,
      body: JSON.stringify(worker),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Eliminar un worker
  async deleteWorker(workerId: string): Promise<boolean> {
    const response = await fetch(`${apiUrl}/workers/${workerId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return true;
  },

  // Asignar tarea a workers
  async assignTaskToWorkers(taskId: string, workerIds: string[]): Promise<any> {
    const response = await fetch(`${apiUrl}/workers/assign`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ taskId, workerIds }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
});
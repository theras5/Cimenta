import { 
  AssignedTo, 
  WorkerWithDetails, 
  TaskWithDetails,
  AssignWorkerToTaskDTO,
  AssignMultipleWorkersDTO
} from '@cimenta/dtos';

export const createAssignedToService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  // Asignar un worker a una task
  async assignWorkerToTask(assignment: AssignWorkerToTaskDTO): Promise<AssignedTo> {
    const response = await fetch(`${apiUrl}/assigned-to`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(assignment),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Asignar múltiples workers a una task
  async assignMultipleWorkersToTask(assignment: AssignMultipleWorkersDTO): Promise<AssignedTo[]> {
    const response = await fetch(`${apiUrl}/assigned-to/multiple`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(assignment),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener workers asignados a una task
  async getWorkersByTask(taskId: string): Promise<WorkerWithDetails[]> {
    const response = await fetch(`${apiUrl}/assigned-to/task/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener tasks asignadas a un worker
  async getTasksByWorker(workerId: string): Promise<TaskWithDetails[]> {
    const response = await fetch(`${apiUrl}/assigned-to/worker/${workerId}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Desasignar un worker de una task
  async unassignWorkerFromTask(workerId: string, taskId: string): Promise<boolean> {
    const response = await fetch(`${apiUrl}/assigned-to`, {
      method: 'DELETE',
      headers: baseHeaders,
      body: JSON.stringify({ worker_id: workerId, task_id: taskId }),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return true;
  },

  // Desasignar todos los workers de una task
  async unassignAllWorkersFromTask(taskId: string): Promise<boolean> {
    const response = await fetch(`${apiUrl}/assigned-to/task/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }
});
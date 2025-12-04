export const createWorkerService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  /**
   * Obtiene todos los workers de una obra específica
   */
  async getWorkersBySite(siteId: string): Promise<any[]> {
    const response = await fetch(`${apiUrl}/workers/site/${siteId}`, {
      headers: baseHeaders,
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Asigna una tarea a uno o más workers
   */
  async assignTaskToWorkers(taskId: string, workerIds: string[]): Promise<any[]> {
    const response = await fetch(`${apiUrl}/workers/assign`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ taskId, workerIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Obtiene un worker por su ID
   */
  async getWorkerById(workerId: string): Promise<any> {
    const response = await fetch(`${apiUrl}/workers/${workerId}`, {
      headers: baseHeaders,
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
});


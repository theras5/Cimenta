const API_URL = /* process.env.EXPO_PUBLIC_API_URL ||  */'http://localhost:3000';

export interface Worker {
  worker_id: string;
  worker_fullname: string;
  worker_cellnumber: string;
  profession: string;
  employer_id: string;
}

class WorkerService {
  // Obtener workers por employer
  static async getWorkersByEmployer(employerId: string): Promise<Worker[]> {
    const response = await fetch(`${API_URL}/workers/employer/${employerId}`);

    if (!response.ok) {
      throw new Error('Error al obtener trabajadores');
    }

    return response.json();
  }

  // Crear worker
  static async createWorker(worker: Omit<Worker, 'worker_id'>): Promise<Worker> {
    const response = await fetch(`${API_URL}/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(worker),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear trabajador');
    }

    return response.json();
  }

  // Actualizar worker
  static async updateWorker(workerId: string, data: Partial<Worker>): Promise<Worker> {
    const response = await fetch(`${API_URL}/workers/${workerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar trabajador');
    }

    return response.json();
  }

  // Eliminar worker
  static async deleteWorker(workerId: string): Promise<void> {
    const response = await fetch(`${API_URL}/workers/${workerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar trabajador');
    }
  }
}

export default WorkerService;
const API_URL =/*  process.env.EXPO_PUBLIC_API_URL ||  */'http://localhost:3000';

export interface AssignedTo {
  worker_id: string;
  task_id: string;
}

export interface WorkerWithTask {
  worker_id: string;
  task_id: string;
  workers: {
    worker_id: string;
    worker_name: string;
    worker_surname: string | null;
    worker_cellnumber: string;
    profession: string;
    employer_id: string;
  };
}

export interface TaskWithWorker {
  worker_id: string;
  task_id: string;
  tasks: {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    start_date?: string;
    end_date?: string;
    site_id?: string;
    user_id?: string;
  };
}

class AssignedToService {
  // Asignar un worker a una task
  static async assignWorkerToTask(workerId: string, taskId: string): Promise<AssignedTo> {
    const response = await fetch(`${API_URL}/assigned-to`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ worker_id: workerId, task_id: taskId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al asignar trabajador');
    }

    return response.json();
  }

  // Asignar múltiples workers a una task
  static async assignMultipleWorkersToTask(
    taskId: string, 
    workerIds: string[]
  ): Promise<AssignedTo[]> {
    const response = await fetch(`${API_URL}/assigned-to/multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task_id: taskId, worker_ids: workerIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al asignar trabajadores');
    }

    return response.json();
  }

  // Obtener workers asignados a una task
  static async getWorkersByTask(taskId: string): Promise<WorkerWithTask[]> {
    const response = await fetch(`${API_URL}/assigned-to/task/${taskId}`);

    if (!response.ok) {
      throw new Error('Error al obtener trabajadores asignados');
    }

    return response.json();
  }

  // Obtener tasks asignadas a un worker
  static async getTasksByWorker(workerId: string): Promise<TaskWithWorker[]> {
    const response = await fetch(`${API_URL}/assigned-to/worker/${workerId}`);

    if (!response.ok) {
      throw new Error('Error al obtener tareas asignadas');
    }

    return response.json();
  }

  // Desasignar un worker de una task
  static async unassignWorkerFromTask(workerId: string, taskId: string): Promise<void> {
    const response = await fetch(`${API_URL}/assigned-to`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ worker_id: workerId, task_id: taskId }),
    });

    if (!response.ok) {
      throw new Error('Error al desasignar trabajador');
    }
  }

  // Desasignar todos los workers de una task
  static async unassignAllWorkersFromTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_URL}/assigned-to/task/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al desasignar todos los trabajadores');
    }
  }
}

export default AssignedToService;
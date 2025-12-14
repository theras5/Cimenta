import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export interface Worker {
    worker_id: string;
    employer_id: string;
    worker_name: string;
    worker_surname: string | null;
    worker_cellnumber: string;
    profession: string;
}

export async function getAllWorkersService() {
    const { data, error } = await supabase
        .from("workers")
        .select(`
            *
        `)
        .order('worker_name', { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
}

export async function getWorkerByIdService(workerId: string) {
    try {
        if (!workerId) {
            throw new AppError('workerId es requerido', 400);
        }

        const { data, error } = await supabase
            .from('workers')
            .select('*')
            .eq('worker_id', workerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No encontrado
                return null;
            }
            throw new AppError(error.message, 500);
        }

        return data;
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[getWorkerByIdService] Error inesperado:', error);
        throw new AppError(`Error al obtener worker: ${error.message || 'Error desconocido'}`, 500);
    }
}

export async function getWorkersByEmployerService(employerId: string) {
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('employer_id', employerId)
        .order('worker_name', { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function createWorkerService(newWorker: Omit<Worker, 'worker_id'>) {
    // Validaciones
    if (!newWorker.employer_id || !newWorker.worker_name || !newWorker.worker_cellnumber) {
        throw new AppError("employer_id, worker_name y worker_cellnumber son campos obligatorios.", 400);
    }

    if (newWorker.worker_name.length > 50) {
        throw new AppError("worker_name no puede exceder 50 caracteres.", 400);
    }

    if (newWorker.worker_surname && newWorker.worker_surname.length > 50) {
        throw new AppError("worker_surname no puede exceder 50 caracteres.", 400);
    }

    if (newWorker.worker_cellnumber.length > 20) {
        throw new AppError("worker_cellnumber no puede exceder 20 caracteres.", 400);
    }

    if (newWorker.profession && newWorker.profession.length > 40) {
        throw new AppError("profession no puede exceder 40 caracteres.", 400);
    }

    const { data, error } = await supabase
        .from('workers')
        .insert([{
            employer_id: newWorker.employer_id,
            worker_name: newWorker.worker_name,
            worker_surname: newWorker.worker_surname,
            worker_cellnumber: newWorker.worker_cellnumber,
            profession: newWorker.profession || 'other'
        }])
        .select()
        .single();

    if (error) {
        console.error('createWorkerService - Supabase error:', error, 'payload:', JSON.stringify(newWorker));
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function updateWorkerByIdService(workerId: string, updatedWorker: Partial<Worker>) {
    console.log(`updateWorkerByIdService - ID: ${workerId}`);
    console.log(`updateWorkerByIdService - Datos recibidos:`, JSON.stringify(updatedWorker, null, 2));
    
    // Validaciones
    if (updatedWorker.worker_name && updatedWorker.worker_name.length > 50) {
        throw new AppError("worker_name no puede exceder 50 caracteres.", 400);
    }

    if (updatedWorker.worker_cellnumber && updatedWorker.worker_cellnumber.length > 20) {
        throw new AppError("worker_cellnumber no puede exceder 20 caracteres.", 400);
    }

    if (updatedWorker.profession && updatedWorker.profession.length > 40) {
        throw new AppError("profession no puede exceder 40 caracteres.", 400);
    }

    // Filtrar campos que existen en la tabla
    const allowedFields = {
        employer_id: updatedWorker.employer_id,
        worker_name: updatedWorker.worker_name,
        worker_surname: updatedWorker.worker_surname,
        worker_cellnumber: updatedWorker.worker_cellnumber,
        profession: updatedWorker.profession
    };

    // Remover campos undefined/null/empty strings
    const filteredWorker = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => 
            value !== undefined && 
            value !== null && 
            value !== ""
        )
    );

    console.log(`updateWorkerByIdService - Datos filtrados:`, JSON.stringify(filteredWorker, null, 2));

    const { data, error } = await supabase
        .from("workers")
        .update(filteredWorker)
        .eq("worker_id", workerId)
        .select()
        .single();

    if (error) {
        console.error(`updateWorkerByIdService - Error de Supabase:`, error);
        throw new AppError(error.message, 500);
    }

    if (!data) {
        console.error(`updateWorkerByIdService - No se encontró el trabajador`);
        throw new AppError(`No se encontró el trabajador con el id ${workerId}`, 404);
    }

    console.log(`updateWorkerByIdService - Trabajador actualizado:`, JSON.stringify(data, null, 2));
    return data;
}

export async function deleteWorkerByIdService(workerId: string) {
    const { error } = await supabase
        .from("workers")
        .delete()
        .eq("worker_id", workerId);

    if (error) {
        throw new AppError(error.message, 500);
    }
}

/**
 * Obtiene todos los workers que trabajan en una obra específica
 * @param siteId ID de la obra
 * @returns Array de workers con sus datos completos
 */
export async function getWorkersBySiteService(siteId: string) {
    try {
        if (!siteId) {
            throw new AppError('siteId es requerido', 400);
        }

        // 1. Obtener worker_ids desde working_at para este site_id
        const { data: workingAtData, error: workingAtError } = await supabase
            .from('working_at')
            .select('worker_id')
            .eq('site_id', siteId);

        if (workingAtError) {
            console.error('[getWorkersBySiteService] Error en working_at:', workingAtError);
            throw new AppError(`Error al obtener workers de la obra: ${workingAtError.message}`, 500);
        }

        if (!workingAtData || workingAtData.length === 0) {
            console.log(`[getWorkersBySiteService] No hay workers asignados a la obra ${siteId}`);
            return [];
        }

        // 2. Extraer los worker_ids
        const workerIds = workingAtData.map(row => row.worker_id);
        console.log(`[getWorkersBySiteService] Worker IDs encontrados:`, workerIds);

        // 3. Obtener los workers completos
        const { data: workers, error: workersError } = await supabase
            .from('workers')
            .select('*')
            .in('worker_id', workerIds);

        if (workersError) {
            console.error('[getWorkersBySiteService] Error al obtener workers:', workersError);
            throw new AppError(`Error al obtener datos de workers: ${workersError.message}`, 500);
        }

        console.log(`[getWorkersBySiteService] Workers encontrados: ${workers?.length || 0}`);
        return workers || [];
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[getWorkersBySiteService] Error inesperado:', error);
        throw new AppError(`Error al obtener workers de la obra: ${error.message || 'Error desconocido'}`, 500);
    }
}

/**
 * Asigna una tarea a uno o más workers
 * @param taskId ID de la tarea
 * @param workerIds Array de IDs de workers
 */
export async function assignTaskToWorkersService(taskId: string, workerIds: string[]) {
    try {
        if (!taskId) {
            throw new AppError('taskId es requerido', 400);
        }
        if (!workerIds || workerIds.length === 0) {
            throw new AppError('workerIds es requerido y debe tener al menos un worker', 400);
        }

        // Crear las asignaciones
        const assignments = workerIds.map(workerId => ({
            task_id: taskId,
            worker_id: workerId
        }));

        const { data, error } = await supabase
            .from('assigned_to')
            .insert(assignments)
            .select();

        if (error) {
            console.error('[assignTaskToWorkersService] Error insertando asignaciones:', error);
            throw new AppError(`Error al asignar tarea a workers: ${error.message}`, 500);
        }

        console.log(`[assignTaskToWorkersService] Tarea ${taskId} asignada a ${workerIds.length} workers`);
        return data;
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[assignTaskToWorkersService] Error inesperado:', error);
        throw new AppError(`Error al asignar tarea: ${error.message || 'Error desconocido'}`, 500);
    }
}

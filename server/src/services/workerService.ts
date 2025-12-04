import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

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

/**
 * Obtiene un worker por su ID
 * @param workerId ID del worker
 * @returns Datos del worker
 */
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


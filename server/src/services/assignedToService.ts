import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export interface AssignedTo {
    worker_id: string;
    task_id: string;
}

// Asignar un worker a una task
export async function assignWorkerToTaskService(assignment: AssignedTo) {
    // Validar que exista el worker
    const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('worker_id')
        .eq('worker_id', assignment.worker_id)
        .single();

    if (workerError || !worker) {
        throw new AppError("Worker no encontrado", 404);
    }

    // Validar que exista la task
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', assignment.task_id)
        .single();

    if (taskError || !task) {
        throw new AppError("Task no encontrada", 404);
    }

    // Crear la asignación
    const { data, error } = await supabase
        .from('assigned_to')
        .insert([{
            worker_id: assignment.worker_id,
            task_id: assignment.task_id
        }])
        .select()
        .single();

    if (error) {
        // Si ya existe la asignación
        if (error.code === '23505') {
            throw new AppError("El worker ya está asignado a esta task", 409);
        }
        console.error('assignWorkerToTaskService - Supabase error:', error);
        throw new AppError(error.message, 500);
    }

    return data;
}

// Obtener todos los workers asignados a una task
export async function getWorkersByTaskService(taskId: string) {
    const { data, error } = await supabase
        .from('assigned_to')
        .select(`
            worker_id,
            task_id,
            workers:worker_id (
                worker_id,
                worker_fullname,
                worker_cellnumber,
                profession,
                employer_id
            )
        `)
        .eq('task_id', taskId);

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

// Obtener todas las tasks asignadas a un worker
export async function getTasksByWorkerService(workerId: string) {
    const { data, error } = await supabase
        .from('assigned_to')
        .select(`
            worker_id,
            task_id,
            tasks:task_id (
                id,
                title,
                description,
                category,
                status,
                start_date,
                end_date,
                site_id,
                user_id
            )
        `)
        .eq('worker_id', workerId);

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

// Desasignar un worker de una task
export async function unassignWorkerFromTaskService(workerId: string, taskId: string) {
    const { error } = await supabase
        .from('assigned_to')
        .delete()
        .eq('worker_id', workerId)
        .eq('task_id', taskId);

    if (error) {
        throw new AppError(error.message, 500);
    }
}

// Desasignar todos los workers de una task
export async function unassignAllWorkersFromTaskService(taskId: string) {
    const { error } = await supabase
        .from('assigned_to')
        .delete()
        .eq('task_id', taskId);

    if (error) {
        throw new AppError(error.message, 500);
    }
}

// Asignar múltiples workers a una task
export async function assignMultipleWorkersToTaskService(taskId: string, workerIds: string[]) {
    const assignments = workerIds.map(workerId => ({
        worker_id: workerId,
        task_id: taskId
    }));

    const { data, error } = await supabase
        .from('assigned_to')
        .insert(assignments)
        .select();

    if (error) {
        console.error('assignMultipleWorkersToTaskService - Supabase error:', error);
        throw new AppError(error.message, 500);
    }

    return data;
}
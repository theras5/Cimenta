import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";
import { Task } from "@cimenta/dtos";

const DEFAULT_SITE_ID = 'e43d720c-8b2f-454f-8b41-55019ffef012';
const DEFAULT_USER_ID = 'bf118bdb-6c44-469e-bdc9-0c46a4aa6737';

export async function getAllTasksService() {
    const { data, error } = await supabase.from("tasks").select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
}

export async function getTaskByIdService(taskId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .eq('id', taskId)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function createTaskService(newTask: Omit<Task, 'id' | 'created_at'>) {
    if (!newTask.title || !newTask.category) {
        throw new AppError("Title y category son campos obligatorios.", 400);
    }

    const { data, error } = await supabase
        .from('tasks')
        .insert([{
            title: newTask.title,
            description: newTask.description,
            category: newTask.category,
            status: newTask.status,
            start_date: newTask.start_date,
            end_date: newTask.end_date,                
            site_id: newTask.site_id,
            user_id: newTask.user_id
        }])
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

//le meti mucho loggeo porque al principio no me andaba y no sabia por que pero se puede sacar. -dali
export async function updateTaskByIdService(taskId: string, newTask: Partial<Task>) {
    console.log(`updateTaskByIdService - ID: ${taskId}`);
    console.log(`updateTaskByIdService - Datos recibidos:`, JSON.stringify(newTask, null, 2));
    
    // Filtrar campos que existen en la tabla de la base de datos
    const allowedFields = {
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        status: newTask.status,
        start_date: newTask.start_date,
        end_date: newTask.end_date,
        site_id: newTask.site_id,
        user_id: newTask.user_id
    };

    // Remover campos undefined/null/empty strings
    const filteredTask = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => 
            value !== undefined && 
            value !== null && 
            value !== ""
        )
    );

    console.log(`updateTaskByIdService - Datos filtrados:`, JSON.stringify(filteredTask, null, 2));

    const { data, error } = await supabase
        .from("tasks")
        .update(filteredTask)
        .eq("id", taskId)
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .single();

    if (error) {
        console.error(`updateTaskByIdService - Error de Supabase:`, error);
        throw new AppError(error.message, 500);
    }

    if (!data) {
        console.error(`updateTaskByIdService - No se encontró la tarea`);
        throw new AppError(`No se encontró la tarea con el id ${taskId}`, 404);
    }

    console.log(`updateTaskByIdService - Tarea actualizada:`, JSON.stringify(data, null, 2));
    return data;
}

export async function deleteTaskByIdService(taskId: string) {
    const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

    if (error) {
        throw new AppError(error.message, 500);
    }
}


export const getTasksBySiteService = async (siteId: string) => {
    const { data, error } = await supabase
        .from('tasks')
        .select(`
            *,
            site:site_id (
                id,
                address
            )
        `)
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
};
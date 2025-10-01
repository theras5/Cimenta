import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

const DEFAULT_SITE_ID = 'e43d720c-8b2f-454f-8b41-55019ffef012';
const DEFAULT_USER_ID = 'bf118bdb-6c44-469e-bdc9-0c46a4aa6737';

export interface Task {
    id: string;
    created_at: string;
    title: string;
    category: "electricidad" | "plomeria" | "construccion" | "pintura";
    description?: string;
    // is_urgent: boolean;
    status: "changes" | "pending" | "in_progress" | "completed" | "blocked" | "rejected";
    start_date?: string;
    end_date?: string;
    site_id: string;
    user_id: string; 
}

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
            site_id: newTask.site_id || DEFAULT_SITE_ID,
            user_id: newTask.user_id || DEFAULT_USER_ID
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

export async function updateTaskByIdService(taskId: string, newTask: Partial<Task>) {
    const { data, error } = await supabase
        .from("tasks")
        .update(newTask)
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
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError(`No se encontró la tarea con el id ${taskId}`, 404);
    }

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
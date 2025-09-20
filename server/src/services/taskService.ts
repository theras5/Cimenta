import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

interface Task {
    id: number;
    user_id: string; // o el tipo que corresponda
    created_at: string;
    title: string;
    description?: string;
    is_urgent: boolean;
    status: "changes" | "pending" | "in-progress" | "done";
    start_date?: string;
    end_date?: string;
}

export async function getAllTasksService() {
    const { data, error } = await supabase.from("tasks").select("*");

    if (error) {
        return error;
    }
    return data;
}

export async function getTaskByIdService(taskId: number) {
    const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

    if (error) {
        return new AppError(error.message, 404);
    }

    return data;
}

export async function createTaskService(newTask: Omit<Task, 'id' | 'created_at'>) {
    if (!newTask.title) {
        return new AppError("El campo 'title' es obligatorio.", 400);
    }

    const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

    if (error) {
        return error;
    }

    return data;
}

export async function updateTaskByIdService(taskId: number, newTask: Partial<Task>) {
    if (isNaN(taskId)) {
        return new AppError("El ID proporcionado no es un número.", 400);
    }

    const { data, error } = await supabase
        .from("tasks")
        .update(newTask)
        .eq("id", taskId)
        .select()
        .single();

    if (error) {
        return error;
    }

    if (!data) {
        return new AppError(`No se encontró la tarea con el id ${taskId}`, 404);
    }

    return data;
}

export async function deleteTaskByIdService(taskId: number) {
    if (isNaN(taskId)) {
        return new AppError("El ID proporcionado no es un número.", 400);
    }

    const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

    if (error) {
        return error;
    }
}
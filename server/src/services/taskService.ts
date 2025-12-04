import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";
import { Task } from "@cimenta/dtos";

const DEFAULT_SITE_ID = 'e43d720c-8b2f-454f-8b41-55019ffef012';
const DEFAULT_USER_ID = 'bf118bdb-6c44-469e-bdc9-0c46a4aa6737';

// export interface Task {
//     id: string;
//     created_at: string;
//     title: string;
//     category: "electricidad" | "plomeria" | "construccion" | "pintura";
//     description?: string;
//     // is_urgent: boolean;
//     status: "changes" | "pending" | "in_progress" | "completed" | "blocked" | "rejected";
//     start_date?: string;
//     end_date?: string;
//     site_id: string;
//     user_id: string; 
// }

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

    console.log('[createTaskService] Creando tarea con datos:', JSON.stringify(newTask, null, 2));

    const { data, error } = await supabase
        .from('tasks')
        .insert([{
            title: newTask.title,
            description: newTask.description || null,
            category: newTask.category,
            status: newTask.status || 'pending',
            start_date: newTask.start_date || null,
            end_date: newTask.end_date || null,                
            site_id: newTask.site_id || null,
            user_id: newTask.user_id || null
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
        console.error('[createTaskService] Error de Supabase:', error);
        console.error('[createTaskService] Datos enviados:', JSON.stringify(newTask, null, 2));
        throw new AppError(error.message, 500);
    }

    console.log('[createTaskService] Tarea creada exitosamente:', data?.id);
    return data;
}

//le meti mucho loggeo porque al principio no me andaba y no sabia por que pero se puede sacar. -dali
export async function updateTaskByIdService(taskId: string, newTask: Partial<Task>) {
    console.log(`updateTaskByIdService - ID: ${taskId}`);
    console.log(`updateTaskByIdService - Datos recibidos:`, JSON.stringify(newTask, null, 2));
    
    // Obtener la tarea actual para comparar el status
    const currentTask = await getTaskByIdService(taskId);
    const previousStatus = currentTask?.status;
    const newStatus = newTask.status;
    
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
    
    // Detectar si la tarea cambió a "blocked" y notificar al dueño
    if (newStatus === 'blocked' && previousStatus !== 'blocked' && data.user_id) {
        try {
            await notifyTaskBlocked(data);
        } catch (notifyError) {
            // No fallar la actualización si la notificación falla
            console.error('Error notificando tarea bloqueada:', notifyError);
        }
    }
    
    return data;
}

// Actualizar solo el estado de una tarea
export async function updateTaskStatusService(taskId: string, status: Task['status']) {
    if (!taskId || !status) {
        throw new AppError("taskId y status son requeridos", 400);
    }

    // Validar que el status sea válido
    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'changes'];
    if (!validStatuses.includes(status)) {
        throw new AppError(`Status inválido: ${status}. Debe ser uno de: ${validStatuses.join(', ')}`, 400);
    }

    // Obtener la tarea actual para comparar el status
    const currentTask = await getTaskByIdService(taskId);
    if (!currentTask) {
        throw new AppError(`No se encontró la tarea con el id ${taskId}`, 404);
    }
    const previousStatus = currentTask.status;

    // Actualizar solo el status
    const { data, error } = await supabase
        .from("tasks")
        .update({ status })
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
        console.error(`updateTaskStatusService - Error de Supabase:`, error);
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError(`No se encontró la tarea con el id ${taskId}`, 404);
    }

    console.log(`updateTaskStatusService - Tarea ${taskId} actualizada de ${previousStatus} a ${status}`);
    
    // Detectar si la tarea cambió a "blocked" y notificar al dueño
    if (status === 'blocked' && previousStatus !== 'blocked' && data.user_id) {
        try {
            await notifyTaskBlocked(data);
        } catch (notifyError) {
            // No fallar la actualización si la notificación falla
            console.error('Error notificando tarea bloqueada:', notifyError);
        }
    }
    
    return data;
}

// Función para notificar cuando una tarea pasa a blocked
async function notifyTaskBlocked(task: Task) {
    const { getProfileById } = await import('./profileService');
    const { getSiteAdminsService } = await import('./siteService');
    const botUrl = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
    
    try {
        // Obtener el perfil del dueño de la tarea (quien bloqueó)
        if (!task.user_id) {
            console.log(`Tarea ${task.id} no tiene user_id, no se enviará notificación`);
            return;
        }
        const blockerProfile = await getProfileById(task.user_id);
        const blockerName = blockerProfile.name || 'Usuario desconocido';
        
        if (!task.site_id) {
            console.log(`Tarea ${task.id} no tiene site_id, no se enviará notificación a administradores`);
            // Aún así notificar al dueño si tiene WhatsApp
            if (blockerProfile.whatsapp_jid) {
                await sendBlockedTaskNotification(
                    botUrl,
                    blockerProfile.whatsapp_jid,
                    task,
                    blockerName,
                    false // no es administrador
                );
            }
            return;
        }
        
        // Notificar al dueño de la tarea (quien la bloqueó)
        if (blockerProfile.whatsapp_jid) {
            await sendBlockedTaskNotification(
                botUrl,
                blockerProfile.whatsapp_jid,
                task,
                blockerName,
                false // no es administrador
            );
        }
        
        // Obtener administradores de la obra y notificarles
        try {
            const admins = await getSiteAdminsService(task.site_id);
            
            for (const admin of admins) {
                // No notificar al mismo usuario si es administrador y dueño de la tarea
                if (admin.id === task.user_id) {
                    continue;
                }
                
                if (admin.whatsapp_jid) {
                    await sendBlockedTaskNotification(
                        botUrl,
                        admin.whatsapp_jid,
                        task,
                        blockerName,
                        true // es administrador
                    );
                }
            }
        } catch (adminError: any) {
            console.error('Error obteniendo administradores, continuando sin notificar a admins:', adminError.message);
            // No fallar si no se pueden obtener los administradores
        }
        
    } catch (error: any) {
        console.error('Error en notifyTaskBlocked:', error.message);
        throw error;
    }
}

// Función auxiliar para enviar notificación de tarea bloqueada
async function sendBlockedTaskNotification(
    botUrl: string,
    whatsappJid: string,
    task: Task,
    blockerName: string,
    isAdmin: boolean
) {
    try {
        const response = await fetch(`${botUrl}/notify/blocked-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                whatsappJid: whatsappJid,
                taskId: task.id,
                taskTitle: task.title,
                taskDescription: task.description,
                siteAddress: (task as any).site?.address || 'Obra no especificada',
                blockerName: blockerName,
                isAdmin: isAdmin
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Error al notificar: ${response.status} ${response.statusText}`);
        }
        
        console.log(`Notificación enviada a ${whatsappJid} por tarea bloqueada ${task.id} (${isAdmin ? 'admin' : 'dueño'})`);
    } catch (error: any) {
        console.error(`Error enviando notificación a ${whatsappJid}:`, error.message);
        // No lanzar el error para no interrumpir otras notificaciones
    }
}

/**
 * Obtiene las tareas que dependen de una tarea bloqueada
 * La tabla task_dependencies tiene: blocker_id (tarea que bloquea) y blocked_id (tarea bloqueada)
 * Cuando una tarea se bloquea, buscamos todas las tareas donde blocker_id = tarea bloqueada
 */
export async function getTaskDependenciesService(blockerId: string) {
    try {
        const { data, error } = await supabase
            .from('task_dependencies')
            .select('blocked_id')
            .eq('blocker_id', blockerId);

        if (error) {
            throw new AppError(error.message, 500);
        }

        return data || [];
    } catch (error: any) {
        console.error('Error obteniendo dependencias de tarea:', error);
        throw error;
    }
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

    if (error) throw new AppError(error.message, 500);
    return data;
};

import { supabase } from "../config/supabase";
import { AppError } from "../errors/AppError";

export interface Worker {
    worker_id: string;
    employer_id: string;
    worker_fullname: string;
    worker_cellnumber: string;
    profession: string;
}

export async function getAllWorkersService() {
    const { data, error } = await supabase
        .from("workers")
        .select(`
            *
        `)
        .order('worker_fullname', { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }
    return data;
}

export async function getWorkerByIdService(workerId: string) {
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('worker_id', workerId)
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function getWorkersByEmployerService(employerId: string) {
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('employer_id', employerId)
        .order('worker_fullname', { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
}

export async function createWorkerService(newWorker: Omit<Worker, 'worker_id'>) {
    // Validaciones
    if (!newWorker.employer_id || !newWorker.worker_fullname || !newWorker.worker_cellnumber) {
        throw new AppError("employer_id, worker_fullname y worker_cellnumber son campos obligatorios.", 400);
    }

    if (newWorker.worker_fullname.length > 50) {
        throw new AppError("worker_fullname no puede exceder 50 caracteres.", 400);
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
            worker_fullname: newWorker.worker_fullname,
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
    if (updatedWorker.worker_fullname && updatedWorker.worker_fullname.length > 50) {
        throw new AppError("worker_fullname no puede exceder 50 caracteres.", 400);
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
        worker_fullname: updatedWorker.worker_fullname,
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
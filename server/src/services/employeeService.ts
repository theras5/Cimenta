import { supabase } from '../config/supabase';

export interface Employee {
  worker_id?: string;
  worker_name: string;
  worker_surname: string | null;
  worker_cellnumber: string;
  employer_id: string;
  profession?: string;
}

export interface CreateEmployeeRequest {
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

export interface UpdateEmployeeRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export const getEmployeesByUserService = async (userId: string) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('employer_id', userId);
  
  if (error) {
    console.error('Error en getEmployeesByUserService:', error);
    throw error;
  }
  
  // Transformar datos de la DB al formato esperado
  const transformedData = data?.map(worker => ({
    id: worker.worker_id,
    first_name: worker.worker_name,
    last_name: worker.worker_surname,
    phone: worker.worker_cellnumber,
    user_id: worker.employer_id,
    profession: worker.profession
  }));
  
  return transformedData;
};

export const getEmployeeByIdService = async (id: string) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('worker_id', id)
    .single();
  
  if (error) throw error;
  
  // Transformar datos
  return {
    id: data.worker_id,
    first_name: data.worker_name,
    last_name: data.worker_surname,
    phone: data.worker_cellnumber,
    user_id: data.employer_id,
    profession: data.profession
  };
};

export const createEmployeeService = async (employee: CreateEmployeeRequest) => {
  const { data, error } = await supabase
    .from('workers')
    .insert([{
      worker_name: employee.first_name,
      worker_surname: employee.last_name,
      worker_cellnumber: employee.phone,
      employer_id: employee.user_id
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error en createEmployeeService:', error);
    throw error;
  }
  
  // Transformar datos de vuelta
  return {
    id: data.worker_id,
    first_name: data.worker_name,
    last_name: data.worker_surname,
    phone: data.worker_cellnumber,
    user_id: data.employer_id,
    profession: data.profession
  };
};

export const updateEmployeeByIdService = async (id: string, employee: UpdateEmployeeRequest) => {
  const { data, error } = await supabase
    .from('workers')
    .update({
      worker_name: employee.first_name,
      worker_surname: employee.last_name,
      worker_cellnumber: employee.phone
    })
    .eq('worker_id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.worker_id,
    first_name: data.worker_name,
    last_name: data.worker_surname,
    phone: data.worker_cellnumber,
    user_id: data.employer_id,
    profession: data.profession
  };
};

export const deleteEmployeeByIdService = async (id: string) => {
  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('worker_id', id);
  
  if (error) throw error;
};

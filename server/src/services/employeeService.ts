import { supabase } from '../config/supabase';

export interface Employee {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
  created_at?: string;
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
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error en getEmployeesByUserService:', error);
    throw error;
  }
  
  return data;
};

export const getEmployeeByIdService = async (id: string) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const createEmployeeService = async (employee: CreateEmployeeRequest) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([{
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone,
      user_id: employee.user_id
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error en createEmployeeService:', error);
    throw error;
  }
  
  return data;
};

export const updateEmployeeByIdService = async (id: string, employee: UpdateEmployeeRequest) => {
  const { data, error } = await supabase
    .from('employees')
    .update({
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteEmployeeByIdService = async (id: string) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

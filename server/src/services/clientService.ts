import { supabase } from '../config/supabase';

export interface Client {
  id?: string;
  client_name: string;
  client_surname: string;
  client_cellnumber: string;
  admin_id: string;
}

export interface CreateClientRequest {
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

export interface UpdateClientRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export const getClientsByUserService = async (userId: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('admin_id', userId);
  
  if (error) {
    console.error('Error en getClientsByUserService:', error);
    throw error;
  }
  
  // Transformar datos de la DB al formato esperado
  const transformedData = data?.map(client => ({
    id: client.id,
    first_name: client.client_name,
    last_name: client.client_surname,
    phone: client.client_cellnumber,
    user_id: client.admin_id
  }));
  
  return transformedData;
};

export const getClientByIdService = async (id: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    first_name: data.client_name,
    last_name: data.client_surname,
    phone: data.client_cellnumber,
    user_id: data.admin_id
  };
};

export const createClientService = async (client: CreateClientRequest) => {
  const { data, error } = await supabase
    .from('clients')
    .insert([{
      client_name: client.first_name,
      client_surname: client.last_name,
      client_cellnumber: client.phone,
      admin_id: client.user_id
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error en createClientService:', error);
    throw error;
  }
  
  return {
    id: data.id,
    first_name: data.client_name,
    last_name: data.client_surname,
    phone: data.client_cellnumber,
    user_id: data.admin_id
  };
};

export const updateClientByIdService = async (id: string, client: UpdateClientRequest) => {
  const { data, error } = await supabase
    .from('clients')
    .update({
      client_name: client.first_name,
      client_surname: client.last_name,
      client_cellnumber: client.phone
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    first_name: data.client_name,
    last_name: data.client_surname,
    phone: data.client_cellnumber,
    user_id: data.admin_id
  };
};

export const deleteClientByIdService = async (id: string) => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

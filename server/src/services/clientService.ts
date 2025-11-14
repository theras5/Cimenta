import { supabase } from '../config/supabase';

export interface Client {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
  created_at?: string;
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error en getClientsByUserService:', error);
    throw error;
  }
  
  return data;
};

export const getClientByIdService = async (id: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const createClientService = async (client: CreateClientRequest) => {
  const { data, error } = await supabase
    .from('clients')
    .insert([{
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      user_id: client.user_id
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error en createClientService:', error);
    throw error;
  }
  
  return data;
};

export const updateClientByIdService = async (id: string, client: UpdateClientRequest) => {
  const { data, error } = await supabase
    .from('clients')
    .update({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteClientByIdService = async (id: string) => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

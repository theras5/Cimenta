import { supabase } from '../config/supabase';
import crypto from 'crypto';

export interface Invitation {
  id?: string;
  email: string;
  site_id: string;
  role: 'admin' | 'client';
  token: string;
  expires_at: string;
  accepted: boolean;
  created_at?: string;
}

export interface CreateInvitationRequest {
  email: string;
  site_id: string;
  role: 'admin' | 'client';
}

// Generar token único para la invitación
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Crear una invitación
export const createInvitationService = async (data: CreateInvitationRequest) => {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert([{
      email: data.email.toLowerCase(),
      site_id: data.site_id,
      role: data.role,
      token: token,
      expires_at: expiresAt.toISOString(),
      accepted: false
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }

  return invitation;
};

// Obtener invitación por token
export const getInvitationByTokenService = async (token: string) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, sites(address)')
    .eq('token', token)
    .eq('accepted', false)
    .single();

  if (error) throw error;
  
  // Verificar si expiró
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('La invitación ha expirado');
  }

  return data;
};

// Aceptar invitación
export const acceptInvitationService = async (token: string, userId: string) => {
  // Obtener la invitación
  const invitation = await getInvitationByTokenService(token);

  // Verificar si el usuario ya pertenece a la obra
  const { data: existingMembership } = await supabase
    .from('belongs_to')
    .select('*')
    .eq('user_id', userId)
    .eq('site_id', invitation.site_id)
    .single();

  
  // Si ya pertenece, marcamos la invitación como aceptada y devolvemos OK (idempotente)
  if (existingMembership) {
    await supabase
      .from('invitations')
      .update({ accepted: true })
      .eq('token', token);

    return invitation;
  }

  // Agregar usuario a la obra
  const { error: belongsError } = await supabase
    .from('belongs_to')
    .insert([{
      user_id: userId,
      site_id: invitation.site_id,
      role: invitation.role
    }]);

  if (belongsError) {
    console.error('Error adding user to site:', belongsError);
    throw belongsError;
  }

  // Marcar la invitación como aceptada
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ accepted: true })
    .eq('token', token);

  if (updateError) {
    console.error('Error updating invitation:', updateError);
    throw updateError;
  }

  return invitation;
};

// Obtener invitaciones pendientes de una obra
export const getPendingInvitationsBySiteService = async (siteId: string) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('site_id', siteId)
    .eq('accepted', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

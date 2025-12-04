import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';

export interface Site {
  id?: string;
  address: string;
  created_at?: string;
}

export interface CreateSiteRequest {
  address: string;
}

export interface UpdateSiteRequest {
  address?: string;
}

export const getAllSitesService = async () => {
    
    const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
    
    
    if (error) {
        console.error('Error en getAllSitesService:', error);
        throw error;
    }
    
    return data;
};

export const getSiteByIdService = async (id: string) => {
    const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
};

export const createSiteService = async (site: CreateSiteRequest) => {
    const { data, error } = await supabase
        .from('sites')
        .insert([{
            address: site.address
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const updateSiteByIdService = async (id: string, site: UpdateSiteRequest) => {
    const { data, error } = await supabase
        .from('sites')
        .update({
            address: site.address
        })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const deleteSiteByIdService = async (id: string) => {
    const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
};

export const createBelongsToService = async ({ user_id, site_id, role }: { user_id: string, site_id: string, role: string }) => {
    const { error } = await supabase
        .from("belongs_to")
        .insert([{ user_id, site_id, role }]);
    if (error) throw error;
};



export const getSitesByUserService = async (userId: string) => {
    try {
        if (!userId) {
            throw new AppError('userId es requerido', 400);
        }

        console.log(`[getSitesByUserService] Buscando sitios para usuario: ${userId}`);
        
        // 1. Verificar qué hay en belongs_to para este usuario
        const { data: belongsData, error } = await supabase
            .from('belongs_to')
            .select('site_id')        
            .eq('user_id', userId);

        if (error) {
            console.error('[getSitesByUserService] Error en belongs_to:', error);
            throw new AppError(`Error al obtener relaciones de usuario: ${error.message}`, 500);
        }
        
        if (!belongsData || belongsData.length === 0) {
            console.log(`[getSitesByUserService] Usuario ${userId} no tiene sitios asignados`);
            return [];
        }
        
        // 2. Extraer los site_ids
        const siteIds = belongsData.map(row => row.site_id);
        console.log(`[getSitesByUserService] Site IDs encontrados:`, siteIds);
        
        // 3. Obtener los sites completos
        const { data: sites, error: sitesError } = await supabase
            .from('sites')
            .select('*')
            .in('id', siteIds)
            .order('created_at', { ascending: false });
        
        if (sitesError) {
            console.error('[getSitesByUserService] Error al obtener sites:', sitesError);
            throw new AppError(`Error al obtener sitios: ${sitesError.message}`, 500);
        }
        
        console.log(`[getSitesByUserService] Sitios encontrados: ${sites?.length || 0}`);
        return sites || [];
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[getSitesByUserService] Error inesperado:', error);
        throw new AppError(`Error al obtener sitios del usuario: ${error.message || 'Error desconocido'}`, 500);
    }
};

/**
 * Obtiene solo las obras donde el usuario tiene rol de administrador
 * @param userId ID del usuario
 * @returns Array de obras donde el usuario es admin
 */
export const getAdminSitesByUserService = async (userId: string) => {
    try {
        if (!userId) {
            throw new AppError('userId es requerido', 400);
        }

        console.log(`[getAdminSitesByUserService] Buscando sitios de admin para usuario: ${userId}`);
        
        // 1. Buscar en belongs_to solo relaciones donde el usuario es admin
        const { data: belongsData, error } = await supabase
            .from('belongs_to')
            .select('site_id')        
            .eq('user_id', userId)
            .eq('role', 'admin');

        if (error) {
            console.error('[getAdminSitesByUserService] Error en belongs_to:', error);
            throw new AppError(`Error al obtener relaciones de administrador: ${error.message}`, 500);
        }
        
        if (!belongsData || belongsData.length === 0) {
            console.log(`[getAdminSitesByUserService] Usuario ${userId} no tiene sitios como administrador`);
            return [];
        }
        
        // 2. Extraer los site_ids
        const siteIds = belongsData.map(row => row.site_id);
        console.log(`[getAdminSitesByUserService] Admin Site IDs encontrados:`, siteIds);
        
        // 3. Obtener los sites completos
        const { data: sites, error: sitesError } = await supabase
            .from('sites')
            .select('*')
            .in('id', siteIds)
            .order('created_at', { ascending: false });
        
        if (sitesError) {
            console.error('[getAdminSitesByUserService] Error al obtener sites:', sitesError);
            throw new AppError(`Error al obtener sitios: ${sitesError.message}`, 500);
        }
        
        console.log(`[getAdminSitesByUserService] Sitios de admin encontrados: ${sites?.length || 0}`);
        return sites || [];
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[getAdminSitesByUserService] Error inesperado:', error);
        throw new AppError(`Error al obtener sitios de administrador del usuario: ${error.message || 'Error desconocido'}`, 500);
    }
};

/**
 * Valida si un usuario es administrador de una obra específica
 * @param userId ID del usuario
 * @param siteId ID de la obra
 * @returns true si el usuario es admin, false en caso contrario
 */
export const validateUserIsAdminService = async (userId: string, siteId: string): Promise<boolean> => {
    try {
        if (!userId || !siteId) {
            return false;
        }

        console.log(`[validateUserIsAdminService] Verificando si usuario ${userId} es admin del sitio ${siteId}`);
        
        const { data, error } = await supabase
            .from('belongs_to')
            .select('role')
            .eq('user_id', userId)
            .eq('site_id', siteId)
            .eq('role', 'admin')
            .maybeSingle(); // Usar maybeSingle en lugar de single para manejar casos donde no hay resultado

        if (error) {
            console.error(`[validateUserIsAdminService] Error en la consulta:`, error);
            return false;
        }

        if (!data) {
            console.log(`[validateUserIsAdminService] No se encontró relación admin para usuario ${userId} en sitio ${siteId}`);
            return false;
        }

        const isAdmin = data.role === 'admin';
        console.log(`[validateUserIsAdminService] Usuario ${userId} es admin del sitio ${siteId}: ${isAdmin}`);
        return isAdmin;
    } catch (error) {
        console.error('[validateUserIsAdminService] Error validando permisos:', error);
        return false;
    }
};

/**
 * Obtiene los administradores de una obra específica
 * @param siteId ID de la obra
 * @returns Array de perfiles de administradores con sus whatsapp_jid
 */
export const getSiteAdminsService = async (siteId: string) => {
    try {
        if (!siteId) {
            throw new AppError('siteId es requerido', 400);
        }

        console.log(`[getSiteAdminsService] Buscando administradores para obra: ${siteId}`);
        
        // 1. Buscar usuarios con rol 'admin' en belongs_to para este site_id
        const { data: belongsData, error } = await supabase
            .from('belongs_to')
            .select('user_id')
            .eq('site_id', siteId)
            .eq('role', 'admin');

        if (error) {
            console.error('[getSiteAdminsService] Error en belongs_to:', error);
            throw new AppError(`Error al obtener administradores: ${error.message}`, 500);
        }
        
        if (!belongsData || belongsData.length === 0) {
            console.log(`[getSiteAdminsService] No se encontraron administradores para la obra ${siteId}`);
            return [];
        }
        
        // 2. Extraer los user_ids
        const userIds = belongsData.map(row => row.user_id);
        console.log(`[getSiteAdminsService] Admin user IDs encontrados:`, userIds);
        
        // 3. Obtener los perfiles completos con whatsapp_jid
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, whatsapp_jid')
            .in('id', userIds)
            .not('whatsapp_jid', 'is', null);
        
        if (profilesError) {
            console.error('[getSiteAdminsService] Error al obtener perfiles:', profilesError);
            throw new AppError(`Error al obtener perfiles de administradores: ${profilesError.message}`, 500);
        }
        
        console.log(`[getSiteAdminsService] Administradores encontrados: ${profiles?.length || 0}`);
        return profiles || [];
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error('[getSiteAdminsService] Error inesperado:', error);
        throw new AppError(`Error al obtener administradores: ${error.message || 'Error desconocido'}`, 500);
    }
};
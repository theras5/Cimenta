import { supabase } from '../config/supabase';

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
        .from('site')
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
        .from('site')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
};

export const createSiteService = async (site: CreateSiteRequest) => {
    const { data, error } = await supabase
        .from('site')
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
        .from('site')
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
        .from('site')
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
    
    // 1. Verificar qué hay en belongs_to para este usuario
    const { data: belongsData, error } = await supabase
        .from('belongs_to')
        .select('site_id')        
        .eq('user_id', userId);

 
    if (error) throw error;
    if (!belongsData || belongsData.length === 0) {
        return [];
    }
    
    // 2. Extraer los site_ids
    const siteIds = belongsData.map(row => row.site_id);
    
    // 3. Obtener los sites completos
    const { data: sites, error: sitesError } = await supabase
        .from('site')
        .select('*')
        .in('id', siteIds)
        .order('created_at', { ascending: false });
    
    
    if (sitesError) throw sitesError;
    
    return sites || [];
};
import { Alert } from 'react-native';

export interface Site {
  id: string; 
  address: string;
  created_at?: string;
}

export interface CreateSiteRequest {
  address: string;
  role?: string;
  user_id?: string;}

export interface UpdateSiteRequest {
  address: string;
  role?: string;
  user_id?: string;}

const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  Alert.alert(
    'Error de conexión',
    'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  );
  throw error;
}

export const SiteService = {
  async getSites(): Promise<Site[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites`); 
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  async getSite(id: string): Promise<Site> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites/${id}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  async createSite(site: CreateSiteRequest): Promise<Site> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(site),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  async updateSite(id: string, site: UpdateSiteRequest): Promise<Site> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(site),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  async deleteSite(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      return handleApiError(error);
    }
  },


async getSitesForUser(userId: string): Promise<Site[]> {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sites/user/${userId}`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    return handleApiError(error);
  }
}

};
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

// Obtener URL base sin trailing slash
const getApiUrl = () => (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

// Headers comunes para evitar página de interstitial de ngrok
const getHeaders = (contentType = false) => ({
  ...(contentType && { 'Content-Type': 'application/json' }),
  'ngrok-skip-browser-warning': 'true',
});

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
      const response = await fetch(`${getApiUrl()}/sites`, {
        headers: getHeaders(),
      }); 
      
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
      const response = await fetch(`${getApiUrl()}/sites/${id}`, {
        headers: getHeaders(),
      });
      
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
      const response = await fetch(`${getApiUrl()}/sites`, {
        method: 'POST',
        headers: getHeaders(true),
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
      const response = await fetch(`${getApiUrl()}/sites/${id}`, {
        method: 'PUT',
        headers: getHeaders(true),
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
      const response = await fetch(`${getApiUrl()}/sites/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
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
    const response = await fetch(`${getApiUrl()}/sites/user/${userId}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    return handleApiError(error);
  }
}

};
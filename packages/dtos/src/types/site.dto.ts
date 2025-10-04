export interface Site {
  id: string; 
  address: string;
  created_at?: string;
}

export interface CreateSiteRequest {
  address: string;
}

export interface UpdateSiteRequest {
  address?: string;
}
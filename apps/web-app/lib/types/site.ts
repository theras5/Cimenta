// apps/web-app/lib/types/site.ts
export interface Site {
  id: string;
  address: string;
  // role?: string;
  // user_id: string;
  // name?: string;
  // description?: string;
  created_at?: string;
  // updated_at?: string;
}

export interface CreateSiteParams {
  address: string;
  role: string;
  user_id: string;
  name?: string;
  description?: string;
}

export interface UpdateSiteParams {
  address?: string;
  role?: string;
  name?: string;
  description?: string;
}
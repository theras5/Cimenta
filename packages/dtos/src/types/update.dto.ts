export interface Update {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
  site_id: string;
}

export interface CreateUpdateDTO {
  title: string;
  description?: string;
  image_url?: string;
  user_id: string;
  site_id?: string; 
}
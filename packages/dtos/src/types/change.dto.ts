export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  is_urgent: boolean;
  user_id: string;
  created_at?: string;
}

export interface CreateChangeRequestDTO {
  title: string;
  description: string;
  category: string;
  status?: string;
  is_urgent?: boolean;
  user_id: string;
}
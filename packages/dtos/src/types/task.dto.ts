export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor?: string;
  status: 'changes' | 'pending' | 'in_progress' | 'completed' | 'blocked';
  start_date?: string;
  end_date?: string;
  assignedMembers?: string[];
  mediaFiles?: string[];
  createdAt?: string;
  site_id?: string;
  user_id?: string;
//   updatedAt?: string;
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  category: string;
  status: string;
  start_date?: string;
  end_date?: string;
  assignedMembers?: string[];
  mediaFiles?: string[];
}
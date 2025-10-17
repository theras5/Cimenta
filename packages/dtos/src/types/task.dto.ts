export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  categoryColor?: string;
  status: TaskStatus;
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
  user_id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  start_date?: string;
  end_date?: string;
  assignedMembers?: string[];
  mediaFiles?: string[];
}

const taskStatus = ['changes', 'pending', 'in_progress', 'completed', 'blocked'] as const;

const taskCategories = ['pintura', 'construccion', 'electricidad'] as const;

export type TaskCategory = typeof taskCategories[number];

// Fix: TaskStatus should be based on taskStatus, not taskCategories
export type TaskStatus = typeof taskStatus[number];

export function isTaskStatus(value: any): value is TaskStatus {
  return taskStatus.includes(value);
}

export function isTaskCategory(value: any): value is TaskCategory {
  return taskCategories.includes(value);
}

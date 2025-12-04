// Ahora los clientes llaman a las API routes de Next.js, no directamente al backend

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "changes" | "blocked" | "rejected";
  category: string;
//   priority?: "low" | "medium" | "high";
  site_id?: string;
  // Optional start and end datetimes from Supabase (ISO strings)
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface Update {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  user_id?: string;
  user_name?: string;
  site_id: string | null;
  created_at: string;
  updated_at?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `/api${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error instanceof Error ? error : new Error('Connection error');
    }
  }

  // Tasks endpoints
  async getTasks(): Promise<Task[]> {
    return this.request<Task[]>('/tasks');
  }

  async getTaskById(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Updates endpoints
  async getUpdates(siteId?: string): Promise<Update[]> {
    // Construir endpoint con query parameter si hay siteId
    const endpoint = siteId 
      ? `/updates?site_id=${encodeURIComponent(siteId)}` 
      : '/updates';
      
    return this.request<Update[]>(endpoint);
  }

  async getUpdateById(id: string): Promise<Update> {
    return this.request<Update>(`/updates/${id}`);
  }

  async createUpdate(update: Omit<Update, 'id' | 'created_at' | 'updated_at'>): Promise<Update> {
    return this.request<Update>('/updates', {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  async updateUpdate(id: string, updates: Partial<Update>): Promise<Update> {
    return this.request<Update>(`/updates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUpdate(id: string): Promise<void> {
    return this.request<void>(`/updates/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
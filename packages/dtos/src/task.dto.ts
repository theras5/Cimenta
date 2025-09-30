export interface Task {
    id: string;
    created_at: string;
    title: string;
    category: "electricidad" | "plomeria" | "construccion" | "pintura";
    description?: string;
    status: "changes" | "pending" | "in_progress" | "completed" | "blocked";
    start_date?: string;
    end_date?: string;
    site_id: string;
    user_id: string; 
}
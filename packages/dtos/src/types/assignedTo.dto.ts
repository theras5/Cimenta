export interface AssignedTo {
    worker_id: string;
    task_id: string;
}

export interface WorkerWithDetails extends AssignedTo {
    workers: {
        worker_id: string;
        worker_name: string;
        worker_surname: string | null;
        worker_cellnumber: string;
        profession: string;
        employer_id: string;
    };
}

export interface TaskWithDetails extends AssignedTo {
    tasks: {
        id: string;
        title: string;
        description: string | null;
        category: string;
        status: string;
        start_date: string | null;
        end_date: string | null;
        site_id: string;
        user_id: string;
    };
}

export interface AssignWorkerToTaskDTO {
    worker_id: string;
    task_id: string;
}

export interface AssignMultipleWorkersDTO {
    task_id: string;
    worker_ids: string[];
}
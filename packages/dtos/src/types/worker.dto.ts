export interface Worker {
    worker_id: string;
    employer_id: string;
    worker_name: string;
    worker_surname: string | null;
    worker_cellnumber: string;
    profession: string;
}

export interface CreateWorkerDTO {
    employer_id: string;
    worker_name: string;
    worker_surname?: string | null;
    worker_cellnumber: string;
    profession?: string;
}

export interface UpdateWorkerDTO {
    employer_id?: string;
    worker_name?: string;
    worker_surname?: string | null;
    worker_cellnumber?: string;
    profession?: string;
}
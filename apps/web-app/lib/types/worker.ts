export interface Worker {
  worker_id: string;
  employer_id: string;
  worker_name: string;
  worker_surname: string | null;
  worker_cellnumber: string;
  profession: string;
}
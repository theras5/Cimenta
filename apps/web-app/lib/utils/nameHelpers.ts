/**
 * Obtiene el nombre completo de un trabajador
 * Maneja casos donde worker_surname puede ser null o vacío
 */
export function getFullName(worker_name: string, worker_surname: string | null | undefined): string {
  if (!worker_surname) {
    return worker_name;
  }
  return `${worker_name} ${worker_surname}`.trim();
}

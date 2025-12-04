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

/**
 * Obtiene las iniciales del trabajador
 * Si worker_surname es null/undefined, solo usa la inicial de worker_name
 */
export function getInitials(worker_name: string, worker_surname: string | null | undefined): string {
  if (!worker_surname) {
    return worker_name.charAt(0).toUpperCase();
  }
  return (worker_name.charAt(0) + worker_surname.charAt(0)).toUpperCase();
}

/**
 * Normaliza la URL del API para evitar barras duplicadas
 * @param url URL base del API (puede tener o no barra al final)
 * @returns URL normalizada sin barra al final
 */
export function normalizeApiUrl(url?: string): string {
  const defaultUrl = "http://localhost:3000";
  const baseUrl = url || defaultUrl;
  // Eliminar todas las barras al final
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Obtiene la URL del API normalizada desde las variables de entorno
 */
export function getApiUrl(): string {
  return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
}

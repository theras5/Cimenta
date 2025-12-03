import { createApiClient } from "@cimenta/utils";
import 'dotenv/config';

export const apiUrl = process.env.API_URL || 'http://localhost:3000';
const bypassToken = process.env.BYPASS_TOKEN;

// Número permitido para usar el bot (formato: número@s.whatsapp.net)
// Si no se configura, el bot responderá a cualquier número registrado en la app
export const ALLOWED_WHATSAPP_NUMBER = process.env.ALLOWED_WHATSAPP_NUMBER || undefined;

export const defaultHeaders: Record<string, string> = (() => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bypassToken) headers['x-vercel-protection-bypass'] = bypassToken;
  return headers;
})();

export const api = createApiClient(apiUrl, {bypassToken});

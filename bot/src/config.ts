import { createApiClient } from "@cimenta/utils";
import 'dotenv/config';

export const apiUrl = process.env.API_URL || 'http://localhost:3000';
const bypassToken = process.env.BYPASS_TOKEN;

// Números permitidos para usar el bot (formato: número@s.whatsapp.net o número@lid)
// Si no se configura, el bot responderá a cualquier número registrado en la app
// Números por defecto: 5491134249099 y 57161736548553@lid
// Para múltiples números, separar con comas en la variable de entorno
const allowedNumbersEnv = process.env.ALLOWED_WHATSAPP_NUMBER || '5491134249099@s.whatsapp.net,57161736548553@lid';
export const ALLOWED_WHATSAPP_NUMBERS = allowedNumbersEnv.split(',').map(num => num.trim()).filter(Boolean);

export const defaultHeaders: Record<string, string> = (() => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bypassToken) headers['x-vercel-protection-bypass'] = bypassToken;
  return headers;
})();

export const api = createApiClient(apiUrl, {bypassToken});

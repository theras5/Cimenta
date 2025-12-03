import { createApiClient } from "@cimenta/utils";
import 'dotenv/config';

export const apiUrl = process.env.API_URL || 'http://localhost:3000';
const bypassToken = process.env.BYPASS_TOKEN;

// Número permitido para usar el bot (formato: número@s.whatsapp.net)
export const ALLOWED_WHATSAPP_NUMBER = '5491122473956@s.whatsapp.net';

export const defaultHeaders: Record<string, string> = (() => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bypassToken) headers['x-vercel-protection-bypass'] = bypassToken;
  return headers;
})();

export const api = createApiClient(apiUrl, {bypassToken});

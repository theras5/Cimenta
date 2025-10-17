import { createApiClient } from "@cimenta/utils";
import 'dotenv/config';

export const apiUrl = process.env.API_URL || 'http://localhost:3000';
const bypassToken = process.env.BYPASS_TOKEN;

export const defaultHeaders: Record<string, string> = (() => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bypassToken) headers['x-vercel-protection-bypass'] = bypassToken;
  return headers;
})();

export const api = createApiClient(apiUrl, {bypassToken});

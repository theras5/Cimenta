import { createApiClient } from "@cimenta/utils";
import 'dotenv/config';

const apiUrl = process.env.API_URL || 'http://localhost:3000';
const bypassToken = process.env.BYPASS_TOKEN;

export const api = createApiClient(apiUrl, {bypassToken});
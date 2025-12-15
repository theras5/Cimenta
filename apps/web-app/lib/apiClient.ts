import { createApiClient } from "@cimenta/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const bypassToken = process.env.NEXT_PUBLIC_VERCEL_BYPASS_TOKEN;

export const apiClient = createApiClient(apiUrl, {
  bypassToken,
});

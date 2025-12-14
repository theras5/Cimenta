import { Profile } from "@cimenta/dtos";

export const createAuthService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
    async getProfileByWhatsapp(whatsappJid: string): Promise<Profile> {
        const response = await fetch(`${apiUrl}/auth/profile?whatsapp_jid=${encodeURIComponent(whatsappJid)}`, {
            method: 'GET',
            headers: baseHeaders,
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }
})
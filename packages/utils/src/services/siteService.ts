import { Site, CreateSiteRequest, UpdateSiteRequest } from '@cimenta/dtos';

export const createSiteService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
    async getSites(): Promise<Site[]> {
        const response = await fetch(`${apiUrl}/sites`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async getSite(id: string): Promise<Site> {
        const response = await fetch(`${apiUrl}/sites/${id}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async createSite(site: CreateSiteRequest): Promise<Site> {
        const response = await fetch(`${apiUrl}/sites`, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify(site),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async updateSite(id: string, site: UpdateSiteRequest): Promise<Site> {
        const response = await fetch(`${apiUrl}/sites/${id}`, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify(site),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async deleteSite(id: string): Promise<boolean> {
        const response = await fetch(`${apiUrl}/sites/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return true;
    },

    async getSitesByUser(userId: string): Promise<Site[]> {
        const response = await fetch(`${apiUrl}/sites/user/${userId}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    },

    async getAdminSitesByUser(userId: string): Promise<Site[]> {
        const response = await fetch(`${apiUrl}/sites/user/${userId}/admin`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    },

    async validateUserIsAdmin(userId: string, siteId: string): Promise<boolean> {
        const response = await fetch(`${apiUrl}/sites/${siteId}/admin/${userId}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.isAdmin || false;
    },

    async getSiteAdmins(siteId: string): Promise<Array<{ id: string; name: string; whatsapp_jid: string }>> {
        const response = await fetch(`${apiUrl}/sites/${siteId}/admins`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

});

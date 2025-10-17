import { Site, CreateSiteRequest, UpdateSiteRequest } from '@cimenta/dtos';

export const createSiteService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
    async getSites(): Promise<Site[]> {
        const response = await fetch(`${apiUrl}/api/sites`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async getSite(id: string): Promise<Site> {
        const response = await fetch(`${apiUrl}/api/sites/${id}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async createSite(site: CreateSiteRequest): Promise<Site> {
        const response = await fetch(`${apiUrl}/api/sites`, {
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
        const response = await fetch(`${apiUrl}/api/sites/${id}`, {
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
        const response = await fetch(`${apiUrl}/api/sites/${id}`, {
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
    }

});

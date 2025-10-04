import { Update, CreateUpdateDTO } from "@cimenta/dtos";



export const createUpdateService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
    // Obtener todas los updates
    async getUpdates(): Promise<Update[]> {
        const response = await fetch(
            `${apiUrl}/updates`
        );

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Obtener un update por ID
    async getUpdate(id: string): Promise<Update> {

        const response = await fetch(`${apiUrl}/updates/${id}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Crear un nuevo update
    async createUpdate(update: CreateUpdateDTO): Promise<Update> {

        const updateWithSiteId = {
            ...update,
            site_id: update.site_id || "e43d720c-8b2f-454f-8b41-55019ffef012" // ← Agregar site_id
        };

        const response = await fetch(`${apiUrl}/updates`, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify(updateWithSiteId),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Actualizar una tarea
    async updateUpdate(id: string, update: Partial<CreateUpdateDTO>): Promise<Update> {

        const response = await fetch(`${apiUrl}/updates/${id}`, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify(update),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Eliminar una tarea
    async deleteUpdate(id: string): Promise<boolean> {

        const response = await fetch(`${apiUrl}/updates/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return true;
    },
});

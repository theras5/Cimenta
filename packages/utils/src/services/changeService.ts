import { ChangeRequest, CreateChangeRequestDTO } from '@cimenta/dtos';

// Servicio para solicitudes de cambio
export const createChangeService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
    // Obtener todas las solicitudes de cambio
    async getChangeRequests(): Promise<ChangeRequest[]> {
        const response = await fetch(`${apiUrl}/changes`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Obtener una solicitud de cambio por ID
    async getChangeRequest(id: string): Promise<ChangeRequest> {
        const response = await fetch(`${apiUrl}/change/${id}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Crear una nueva solicitud de cambio
    async createChangeRequest(changeData: CreateChangeRequestDTO): Promise<ChangeRequest> {
        const response = await fetch(`${apiUrl}/change`, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify(changeData),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();

    },

    // Actualizar una solicitud de cambio
    async updateChangeRequest(id: string, changeData: Partial<CreateChangeRequestDTO>): Promise<ChangeRequest> {
        const response = await fetch(`${apiUrl}/change/${id}`, {
            method: 'PUT',
            headers: baseHeaders,
            body: JSON.stringify(changeData),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Eliminar una solicitud de cambio
    async deleteChangeRequest(id: string): Promise<boolean> {
        const response = await fetch(`${apiUrl}/change/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return true;
    },

    // Obtener solicitudes por estado
    async getChangeRequestsByStatus(status: ChangeRequest['status']): Promise<ChangeRequest[]> {
        const response = await fetch(`${apiUrl}/changes/status/${status}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    // Obtener solicitudes por usuario
    async getChangeRequestsByUser(userId: string): Promise<ChangeRequest[]> {
        const response = await fetch(`${apiUrl}/changes/user/${userId}`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }
});
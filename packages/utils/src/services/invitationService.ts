import {
  Invitation,
  CreateInvitationRequest,
  InvitationWithSite,
  AcceptInvitationRequest,
  InvitationResponse
} from "@cimenta/dtos";

export const createInvitationService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  /**
   * Crear una nueva invitación para unirse a una obra
   */
  async create(data: CreateInvitationRequest, token: string): Promise<InvitationResponse> {
    const response = await fetch(`${apiUrl}/invitations`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Obtener una invitación por su token
   */
  async getByToken(invitationToken: string): Promise<InvitationWithSite> {
    const response = await fetch(`${apiUrl}/invitations/${invitationToken}`, {
      method: 'GET',
      headers: baseHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Aceptar una invitación
   */
  async accept(data: AcceptInvitationRequest, token: string): Promise<InvitationResponse> {
    const response = await fetch(`${apiUrl}/invitations/${data.token}/accept`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: data.user_id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Obtener invitaciones pendientes de una obra
   */
  async getPendingBySite(siteId: string, token: string): Promise<Invitation[]> {
    const response = await fetch(`${apiUrl}/invitations/site/${siteId}`, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },
});

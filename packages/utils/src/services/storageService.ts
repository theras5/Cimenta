export const createStorageService = (apiUrl: string, baseHeaders: Record<string, string>) => ({
  /**
   * Subir foto de perfil del usuario
   */
  async uploadProfilePicture(file: File, token: string): Promise<{ url: string; path: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiUrl}/storage/upload-profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // No incluir Content-Type para que el navegador lo establezca automáticamente con el boundary
        ...Object.fromEntries(
          Object.entries(baseHeaders).filter(([key]) => key.toLowerCase() !== 'content-type')
        ),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Eliminar foto de perfil del usuario
   */
  async deleteProfilePicture(token: string): Promise<{ message: string }> {
    const response = await fetch(`${apiUrl}/storage/delete-profile-picture`, {
      method: 'DELETE',
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

  /**
   * Obtener perfil de usuario incluyendo avatar_url
   */
  async getUserProfile(userId: string, token: string): Promise<{ id: string; name: string; email: string; avatar_url?: string }> {
    const response = await fetch(`${apiUrl}/storage/user-profile/${userId}`, {
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

  /**
   * Obtener solo la URL del avatar del usuario
   */
  async getAvatarUrl(userId: string, token: string): Promise<{ avatarUrl: string | null }> {
    const response = await fetch(`${apiUrl}/storage/avatar/${userId}`, {
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

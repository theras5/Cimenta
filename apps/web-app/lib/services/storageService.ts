// apps/web-app/lib/services/storageService.ts
class StorageService {
  async uploadProfilePicture(file: File, userId: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/storage/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir la imagen');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();

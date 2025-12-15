import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Obtener URL base sin trailing slash
const getApiUrl = () => (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export interface SubscriptionResponse {
  success: boolean;
  data: {
    subscriptionId: string;
    initPoint: string;
    status: string;
  };
}

export const UserService = {
  /**
   * Verifica si el usuario tiene suscripción premium activa
   */
  async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${getApiUrl()}/payments/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.data?.isPremium || false;
    } catch (error) {
      console.error('Error verificando estado premium:', error);
      return false;
    }
  },

  /**
   * Inicia el proceso de suscripción
   * Abre el navegador con el checkout de MP
   * MP redirige a /mobile-callback que usa App Links para volver a la app
   */
  async startSubscription(userId: string, email: string): Promise<{ success: boolean; cancelled?: boolean }> {
    try {
      const apiUrl = getApiUrl();
      console.log('🚀 Iniciando suscripción:', { apiUrl, userId, email });
      
      // 1. Obtener URL de pago del backend
      const response = await fetch(`${apiUrl}/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ userId, email, platform: 'mobile' }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error al crear suscripción: ${response.status}`);
      }

      const data: SubscriptionResponse = await response.json();
      console.log('✅ Suscripción creada:', data);
      
      if (!data.data?.initPoint) {
        throw new Error('No se recibió URL de pago');
      }

      // 2. Abrir el navegador con el checkout de MP
      // MP redirigirá a /mobile-callback cuando termine
      // Ese endpoint usa App Links/Universal Links para abrir la app
      console.log('🌐 Abriendo WebBrowser con App Links...');
      const result = await WebBrowser.openBrowserAsync(data.data.initPoint, {
        showInRecents: true,
        // En Android, dismiss manual. En iOS, se cierra automáticamente con Universal Links
      });
      
      console.log('🌐 WebBrowser cerrado:', result.type);

      // 3. Verificar estado premium después de volver
      // El webhook debería haber actualizado el estado
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isPremium = await this.checkPremiumStatus(userId);
      console.log('💎 Estado premium después del pago:', isPremium);
      
      if (isPremium) {
        return { success: true };
      }

      // Si no es premium aún, puede ser que:
      // - El usuario canceló
      // - El webhook aún no llegó (darle un poco más de tiempo)
      if (result.type === 'cancel') {
        return { success: false, cancelled: true };
      }
      
      // Esperar un poco más por el webhook
      await new Promise(resolve => setTimeout(resolve, 2000));
      const finalCheck = await this.checkPremiumStatus(userId);
      
      return { success: finalCheck };
      
    } catch (error) {
      console.error('Error iniciando suscripción:', error);
      return { success: false };
    }
  },

    /**
   * Obtiene la URL del avatar del usuario
   */
  async getAvatarUrl(userId: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(`${getApiUrl()}/storage/avatar/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      const { avatarUrl } = await response.json();
      return avatarUrl || null;
    } catch (error) {
      console.error('Error obteniendo avatar:', error);
      return null;
    }
  },

  /**
   * Sube una nueva foto de perfil
   */
  async uploadAvatar(userId: string, uri: string, token: string): Promise<string | null> {
    try {
      const formData = new FormData();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}.${fileExt}`;
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);
      formData.append('userId', userId);

      const response = await fetch(`${getApiUrl()}/storage/upload-profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir la imagen');
      }
      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      throw error;
    }
  },

  /**
   * Elimina la foto de perfil del usuario
   */
  async deleteAvatar(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${getApiUrl()}/storage/avatar/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error eliminando avatar:', error);
      return false;
    }
  },
};

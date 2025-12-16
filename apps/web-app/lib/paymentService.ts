const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface SubscriptionStatus {
  isPremium: boolean;
}

class UserService {
  /**
   * Verifica si el usuario tiene suscripción premium activa
   * Agnóstico del proveedor de pagos - solo consulta el estado en la DB
   */
  async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      // Normalizar la URL para evitar dobles barras
      const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const statusUrl = `${baseUrl}/payments/status/${userId}`;
      console.log('[checkPremiumStatus] Checking premium status for user:', userId);
      console.log('[checkPremiumStatus] URL:', statusUrl);
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[checkPremiumStatus] Response status:', response.status);
      
      if (!response.ok) {
        console.error('[checkPremiumStatus] Response not OK:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('[checkPremiumStatus] Response data:', data);
      const isPremium = data.data?.isPremium || false;
      console.log('[checkPremiumStatus] Is premium:', isPremium);
      return isPremium;
    } catch (error) {
      console.error('Error verificando estado premium:', error);
      return false;
    }
  }

  /**
   * Inicia el proceso de suscripción y retorna la URL de pago
   */
  async startSubscription(userId: string, email: string): Promise<string | null> {
    try {
      // Normalizar la URL para evitar dobles barras
      const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const subscribeUrl = `${baseUrl}/payments/subscribe`;
      
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email }),
      });

      if (!response.ok) {
        throw new Error('Error al crear suscripción');
      }

      const data = await response.json();
      return data.data?.initPoint || null;
    } catch (error) {
      console.error('Error iniciando suscripción:', error);
      return null;
    }
  }
}

export const userService = new UserService();

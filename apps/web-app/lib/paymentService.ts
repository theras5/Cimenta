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
      const response = await fetch(`${API_URL}/payments/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
  }

  /**
   * Inicia el proceso de suscripción y retorna la URL de pago
   */
  async startSubscription(userId: string, email: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/payments/subscribe`, {
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

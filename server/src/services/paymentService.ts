import { PreApproval, Preference } from 'mercadopago';
import { mpClient } from '../config/mercadopago';
import { supabase } from '../config/supabase';

// Inicializar clientes de MercadoPago
const preApproval = new PreApproval(mpClient);
const preference = new Preference(mpClient);

// Configuración de la suscripción
const SUBSCRIPTION_CONFIG = {
  reason: 'Suscripción Premium Cimenta',
  currency_id: 'ARS', // Cambiar según tu país: 'MXN', 'CLP', 'COP', etc.
  transaction_amount: 9999, // Monto mensual
  frequency: 1,
  frequency_type: 'months' as const,
};

export interface CreateSubscriptionRequest {
  userId: string;
  email: string;
  platform?: 'web' | 'mobile';
}

export interface SubscriptionResponse {
  id: string;
  init_point: string;
  status: string;
}

/**
 * Crea una suscripción de Mercado Pago para un usuario
 * @param userId - ID del usuario en la base de datos
 * @param email - Email del usuario para la suscripción
 * @param platform - Plataforma desde donde se origina (web o mobile)
 * @returns URL de pago (init_point) y datos de la suscripción
 */
export const createSubscriptionService = async ({ userId, email, platform = 'web' }: CreateSubscriptionRequest): Promise<SubscriptionResponse> => {
  try {
    console.log('📧 Creando suscripción para:', { userId, email, platform });
    console.log('💰 Config:', SUBSCRIPTION_CONFIG);
    
    const isTestMode = process.env.MP_ACCESS_TOKEN?.startsWith('TEST-');
    
    // Para mobile, usamos el callback que redirige a la app via App Links
    // Para web, usamos la URL del frontend
    let backUrl: string;
    if (platform === 'mobile') {
      // Usar la URL del backend (ngrok en dev) + callback path
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      backUrl = `${apiBaseUrl}/payments/mobile-callback`;
    } else {
      backUrl = process.env.MP_BACK_URL || 'http://localhost:3001/paywall';
    }

    console.log('🔙 Back URL configurada:', backUrl, '(platform:', platform, ')');

    // En modo desarrollo (TEST_MODE=true), usar email de prueba de MP
    // En producción, usar el email real del usuario
    const isDevMode = process.env.TEST_MODE === 'true';
    const TEST_BUYER_EMAIL = 'test_user_8085113406163690698@testuser.com';
    const payerEmail = isDevMode ? TEST_BUYER_EMAIL : email;
    
    if (isDevMode) {
      console.log('🧪 Modo DEV: usando email de prueba:', payerEmail);
    } else {
      console.log('📧 Modo PROD: usando email del usuario:', payerEmail);
    }

    const response = await preApproval.create({
      body: {
        reason: SUBSCRIPTION_CONFIG.reason,
        external_reference: userId,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: SUBSCRIPTION_CONFIG.frequency,
          frequency_type: SUBSCRIPTION_CONFIG.frequency_type,
          transaction_amount: SUBSCRIPTION_CONFIG.transaction_amount,
          currency_id: SUBSCRIPTION_CONFIG.currency_id,
        },
        back_url: backUrl,
      },
    });

    // Log completo de la respuesta para debug
    console.log('📦 Respuesta completa de MP:', JSON.stringify(response, null, 2));

    if (!response.id) {
      throw new Error('Respuesta inválida de Mercado Pago');
    }

    // Para PreApproval (suscripciones) NO existe sandbox_init_point ni dominio sandbox
    // La URL de producción ES la correcta - para probar, el usuario debe
    // estar logueado con su cuenta de prueba COMPRADOR en Mercado Pago
    const paymentUrl = response.init_point;

    if (!paymentUrl) {
      console.error('❌ No se recibió URL de pago. Response:', response);
      throw new Error('No se recibió URL de pago de Mercado Pago');
    }

    console.log('✅ Suscripción creada:', {
      id: response.id,
      status: response.status,
      external_reference: response.external_reference,
      mode: isTestMode ? 'SANDBOX' : 'PRODUCTION',
      url: paymentUrl,
    });

    return {
      id: response.id,
      init_point: paymentUrl,
      status: response.status || 'pending',
    };
  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    throw error;
  }
};

/**
 * Obtiene los detalles de una suscripción desde Mercado Pago
 * @param preApprovalId - ID de la suscripción en Mercado Pago
 */
export const getSubscriptionService = async (preApprovalId: string) => {
  try {
    const response = await preApproval.get({ id: preApprovalId });
    return response;
  } catch (error) {
    console.error('❌ Error obteniendo suscripción:', error);
    throw error;
  }
};

/**
 * Actualiza el estado premium del usuario en la base de datos
 * @param userId - ID del usuario
 * @param isPremium - Estado premium a setear
 * @param subscriptionId - ID de la suscripción de MP (opcional)
 */
export const updateUserPremiumStatus = async (
  userId: string,
  isPremium: boolean,
  subscriptionId?: string
): Promise<void> => {
  try {
    const updateData: Record<string, unknown> = {
      is_premium: isPremium,
      updated_at: new Date().toISOString(),
    };

    // Guardar el ID de suscripción si está disponible
    if (subscriptionId) {
      updateData.mp_subscription_id = subscriptionId;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('❌ Error actualizando estado premium:', error);
      throw error;
    }

    console.log(`✅ Usuario ${userId} actualizado: is_premium = ${isPremium}`);
  } catch (error) {
    console.error('❌ Error en updateUserPremiumStatus:', error);
    throw error;
  }
};

/**
 * Procesa la notificación webhook de Mercado Pago
 * @param type - Tipo de notificación
 * @param dataId - ID del recurso en la notificación
 */
export const processWebhookService = async (type: string, dataId: string): Promise<void> => {
  console.log(`📨 Procesando webhook: type=${type}, dataId=${dataId}`);
  
  // Procesar pagos (payment) y suscripciones (preapproval)
  const validTypes = ['payment', 'subscription_preapproval', 'preapproval'];
  
  if (!validTypes.includes(type)) {
    console.log(`⏭️ Tipo de webhook ignorado: ${type}`);
    return;
  }

  try {
    if (type === 'payment') {
      // Procesar pago de Checkout Pro
      await processPaymentWebhook(dataId);
    } else {
      // Procesar suscripción
      await processSubscriptionWebhook(dataId);
    }
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    throw error;
  }
};

/**
 * Procesa webhook de pago (Checkout Pro)
 */
const processPaymentWebhook = async (paymentId: string): Promise<void> => {
  try {
    // Obtener detalles del pago desde la API de MP
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo pago: ${response.status}`);
    }

    const payment = await response.json();

    console.log('💰 Datos de pago recibidos:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
    });

    const userId = payment.external_reference;

    if (!userId) {
      console.error('❌ No se encontró external_reference en el pago');
      return;
    }

    // Si el pago fue aprobado, activar premium
    if (payment.status === 'approved') {
      await updateUserPremiumStatus(userId, true, payment.id?.toString());
      console.log(`✅ Usuario ${userId} ahora es PREMIUM (pago aprobado)`);
    } else {
      console.log(`⏳ Pago en estado: ${payment.status}`);
    }
  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    throw error;
  }
};

/**
 * Procesa webhook de suscripción (PreApproval)
 */
const processSubscriptionWebhook = async (subscriptionId: string): Promise<void> => {
  try {
    // Obtener los detalles de la suscripción desde MP
    const subscription = await getSubscriptionService(subscriptionId);
    
    console.log('📦 Datos de suscripción recibidos:', {
      id: subscription.id,
      status: subscription.status,
      external_reference: subscription.external_reference,
    });

    const userId = subscription.external_reference;

    if (!userId) {
      console.error('❌ No se encontró external_reference en la suscripción');
      return;
    }

    // Procesar según el estado de la suscripción
    switch (subscription.status) {
      case 'authorized':
        // Suscripción activa - usuario es premium
        await updateUserPremiumStatus(userId, true, subscription.id);
        console.log(`✅ Usuario ${userId} ahora es PREMIUM`);
        break;

      case 'paused':
        // Suscripción pausada - mantener premium pero marcar
        console.log(`⏸️ Suscripción pausada para usuario ${userId}`);
        break;

      case 'cancelled':
        // Suscripción cancelada - quitar premium
        await updateUserPremiumStatus(userId, false);
        console.log(`❌ Usuario ${userId} ya no es PREMIUM (cancelado)`);
        break;

      case 'pending':
        // Esperando pago
        console.log(`⏳ Suscripción pendiente para usuario ${userId}`);
        break;

      default:
        console.log(`❓ Estado desconocido: ${subscription.status}`);
    }
  } catch (error) {
    console.error('❌ Error procesando suscripción:', error);
    throw error;
  }
};

/**
 * Obtiene el estado de suscripción de un usuario
 * @param userId - ID del usuario
 */
export const getUserSubscriptionStatus = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium, mp_subscription_id')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      isPremium: data?.is_premium || false,
      subscriptionId: data?.mp_subscription_id || null,
    };
  } catch (error) {
    console.error('❌ Error obteniendo estado de suscripción:', error);
    throw error;
  }
};

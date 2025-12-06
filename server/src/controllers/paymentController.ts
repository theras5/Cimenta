import { Request, Response, NextFunction } from 'express';
import {
  createSubscriptionService,
  processWebhookService,
  getUserSubscriptionStatus,
} from '../services/paymentService';

/**
 * POST /payments/subscribe
 * Crea una suscripción de Mercado Pago y retorna el link de pago
 */
export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        error: 'userId y email son requeridos',
      });
    }

    console.log('🚀 Creando suscripción para:', { userId, email });

    const subscription = await createSubscriptionService({ userId, email });

    res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        initPoint: subscription.init_point,
        status: subscription.status,
      },
      message: 'Suscripción creada. Redirige al usuario al initPoint para completar el pago.',
    });
  } catch (error) {
    console.error('❌ Error en createSubscription:', error);
    next(error);
  }
};

/**
 * POST /payments/webhook
 * Recibe las notificaciones de Mercado Pago (IPN)
 * 
 * IMPORTANTE: Esta ruta debe ser pública (sin autenticación)
 * y debe responder 200 OK rápidamente para que MP no reintente.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    console.log('📨 Webhook recibido:', {
      type: req.body.type,
      action: req.body.action,
      data: req.body.data,
    });

    // Responder inmediatamente a MP para evitar reintentos
    res.status(200).json({ received: true });

    // Extraer datos del webhook
    // MP envía el tipo en 'type' o 'topic' dependiendo de la configuración
    const type = req.body.type || req.body.topic;
    const dataId = req.body.data?.id || req.body.id;

    if (!type || !dataId) {
      console.log('⚠️ Webhook sin type o data.id, ignorando');
      return;
    }

    // Procesar el webhook de forma asíncrona
    await processWebhookService(type, dataId);

  } catch (error) {
    console.error('❌ Error en handleWebhook:', error);
    // Ya respondimos 200, solo logueamos el error
  }
};

/**
 * GET /payments/status/:userId
 * Obtiene el estado de suscripción de un usuario
 */
export const getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const status = await getUserSubscriptionStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('❌ Error en getSubscriptionStatus:', error);
    next(error);
  }
};

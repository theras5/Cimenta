import { Router } from 'express';
import {
  createSubscription,
  handleWebhook,
  getSubscriptionStatus,
} from '../controllers/paymentController';

const router = Router();

// Crear suscripción - retorna el link de pago de MP
router.post('/subscribe', createSubscription);

// Webhook de Mercado Pago - DEBE ser público (sin auth)
router.post('/webhook', handleWebhook);

// Obtener estado de suscripción de un usuario
router.get('/status/:userId', getSubscriptionStatus);

export default router;

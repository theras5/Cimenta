import { Router, Request, Response } from 'express';
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

/**
 * Mobile callback - Mercado Pago redirige aquí después del pago
 * Este endpoint sirve como puente para App Links/Universal Links
 * En producción, el SO intercepta esta URL y abre la app automáticamente
 */
router.get('/mobile-callback', (req: Request, res: Response) => {
  const { preapproval_id, status, external_reference } = req.query;
  
  console.log('📱 Mobile callback recibido:', { 
    preapproval_id, 
    status, 
    external_reference 
  });

  // Deep link scheme de la app (configurado en app.json)
  const appScheme = process.env.APP_SCHEME || 'cimentademo';
  const deepLink = `${appScheme}://payment-success?status=${status || 'unknown'}&preapproval_id=${preapproval_id || ''}&user_id=${external_reference || ''}`;

  // HTML que intenta abrir la app automáticamente
  // En producción con App Links configurados, el SO abre la app antes de mostrar esto
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Volviendo a Cimenta...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        .container { padding: 40px; }
        h1 { margin-bottom: 20px; }
        p { opacity: 0.9; margin-bottom: 20px; }
        .btn {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 15px 30px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
        }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>¡Pago procesado! 🎉</h1>
        <p>Volviendo a la app...</p>
        <a href="${deepLink}" class="btn">Abrir Cimenta</a>
        <p style="margin-top: 30px; font-size: 13px; opacity: 0.7;">
          Si no se abre automáticamente,<br>tocá el botón o cerrá esta ventana.
        </p>
      </div>
      <script>
        // Intentar abrir la app automáticamente
        setTimeout(function() {
          window.location.href = "${deepLink}";
        }, 500);
      </script>
    </body>
    </html>
  `);
});

export default router;

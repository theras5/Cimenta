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
 * El navegador abre esta URL y el sistema operativo la intercepta
 * para abrir la app automáticamente
 */
router.get('/mobile-callback', (req: Request, res: Response) => {
  const { preapproval_id, status, external_reference } = req.query;
  
  console.log('📱 Mobile callback recibido:', { 
    preapproval_id, 
    status, 
    external_reference 
  });

  // El deep link scheme de la app
  const appScheme = 'cimentademo';
  const deepLink = `${appScheme}://payment-success?status=${status || 'unknown'}&preapproval_id=${preapproval_id || ''}&user_id=${external_reference || ''}`;

  // HTML que intenta abrir la app y fallback
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
        .container {
          padding: 40px;
        }
        h1 { margin-bottom: 20px; }
        p { opacity: 0.9; margin-bottom: 30px; }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        a {
          color: white;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>¡Pago procesado!</h1>
        <p>Volviendo a la app de Cimenta...</p>
        <p><small>Si no se abre automáticamente, <a href="${deepLink}">tocá aquí</a></small></p>
      </div>
      <script>
        // Intentar abrir la app inmediatamente
        window.location.href = "${deepLink}";
        
        // Fallback: si después de 2 segundos seguimos aquí, mostrar mensaje
        setTimeout(function() {
          document.querySelector('p').textContent = 'Podés cerrar esta ventana y volver a la app';
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

export default router;

import { MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const mpAccessToken = process.env.MP_ACCESS_TOKEN;

if (!mpAccessToken) {
  throw new Error('MP_ACCESS_TOKEN no está definido en las variables de entorno');
}

// Log para verificar que estamos usando credenciales de prueba
const isTestMode = mpAccessToken.startsWith('TEST-');
console.log(`🔐 Mercado Pago inicializado en modo: ${isTestMode ? 'PRUEBA ✅' : 'PRODUCCIÓN ⚠️'}`);

export const mpClient = new MercadoPagoConfig({
  accessToken: mpAccessToken,
});

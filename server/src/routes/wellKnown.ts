import { Router, Request, Response } from 'express';

const router = Router();

// Android App Links verification
// Este archivo permite a Android verificar que tu dominio está asociado a tu app
router.get('/assetlinks.json', (req: Request, res: Response) => {
  // Reemplazar con tu SHA256 fingerprint real cuando tengas el build
  // Para obtenerlo: keytool -list -v -keystore your-keystore.jks
  // O desde Google Play Console si usas App Signing
  const androidPackage = 'com.cimenta.demo';
  
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: androidPackage,
        // SHA256 fingerprints - agregar el real cuando tengas el keystore
        sha256_cert_fingerprints: [
          // Debug keystore fingerprint (temporal para desarrollo)
          'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C'
        ],
      },
    },
  ]);
});

// iOS Universal Links verification (Apple App Site Association)
router.get('/apple-app-site-association', (req: Request, res: Response) => {
  const teamId = 'YOUR_TEAM_ID'; // Reemplazar con tu Apple Team ID
  const bundleId = 'com.cimenta.demo';
  
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${bundleId}`,
          paths: ['/payments/mobile-callback*'],
        },
      ],
    },
  });
});

export default router;

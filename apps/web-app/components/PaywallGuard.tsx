'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { userService } from '@/lib/paymentService';

interface PaywallGuardProps {
  children: React.ReactNode;
}

export default function PaywallGuard({ children }: PaywallGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Verificar sesión usando el sistema de auth existente
        const token = authService.getToken();
        const user = authService.getUser();

        if (!token || !user) {
          router.push('/login');
          return;
        }

        // Consultar estado premium usando el backend
        const isPremium = await userService.checkPremiumStatus(user.id);

        if (!isPremium) {
          // No es premium, redirigir al paywall
          router.push('/paywall');
          return;
        }

        // Es premium, permitir acceso
        setIsPremium(true);
      } catch (error) {
        console.error('Error en verificación:', error);
        router.push('/paywall');
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [router]);

  // Estado: Cargando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">
            Verificando suscripción...
          </p>
        </div>
      </div>
    );
  }

  // Es Premium - renderizar children
  if (isPremium) {
    return <>{children}</>;
  }

  // Fallback mientras redirige
  return null;
}

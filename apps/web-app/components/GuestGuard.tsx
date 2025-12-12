'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Protege rutas de invitados (login, register)
 * Si está logueado → redirige a /select-site
 * El PaywallGuard en /select-site se encarga de verificar premium
 */
export default function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        const user = authService.getUser();

        if (token && user) {
          // Usuario ya autenticado, ir a select-site
          // El PaywallGuard ahí decidirá si redirigir a paywall
          router.replace('/select-site');
          return;
        }

        // No hay sesión, es un invitado
        setIsGuest(true);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        setIsGuest(true);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // No mostrar nada mientras verifica
  if (loading) {
    return null;
  }

  if (isGuest) {
    return <>{children}</>;
  }

  return null;
}

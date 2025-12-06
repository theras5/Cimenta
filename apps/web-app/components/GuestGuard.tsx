'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Protege rutas de invitados (login, register)
 * Si está logueado:
 *   - Si es premium → /select-site
 *   - Si no es premium → /paywall
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
          // Usuario ya autenticado, verificar si es premium
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .single();

          if (profile?.is_premium) {
            // Es premium, ir a seleccionar sitio
            router.push('/select-site');
          } else {
            // No es premium, ir al paywall
            router.push('/paywall');
          }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-600 mb-3"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return <>{children}</>;
  }

  return null;
}

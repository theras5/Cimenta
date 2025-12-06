'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';

export default function PaywallPage() {
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = authService.getToken();
        const savedUser = authService.getUser();

        if (!token || !savedUser) {
          router.push('/login');
          return;
        }

        // Verificar si ya es premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', savedUser.id)
          .single();

        if (profile?.is_premium) {
          // Ya es premium, redirigir al dashboard
          router.push('/select-site');
          return;
        }

        setUser({ id: savedUser.id, email: savedUser.email || '' });
      } catch (error) {
        console.error('Error verificando usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleSubscribe = async () => {
    if (!user) return;

    setIsSubscribing(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear suscripción');
      }

      const data = await response.json();

      if (data.data?.initPoint) {
        window.location.href = data.data.initPoint;
      } else {
        throw new Error('No se recibió el link de pago');
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      alert('Hubo un error al procesar tu suscripción. Intenta de nuevo.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleLogout = async () => {
    authService.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando...</p>
        </div>
      </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-lg w-full">
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                ¡Bienvenido a Cimenta!
              </h1>
              <p className="text-blue-100 text-lg">
                Activa tu suscripción para comenzar
              </p>
            </div>
          </div>

          {/* Contenido */}
          <div className="px-8 py-10">
            {/* Precio destacado */}
            <div className="text-center mb-8 pb-8 border-b border-gray-100">
              <p className="text-gray-500 text-sm mb-2">Plan Premium</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">$9.999</span>
                <span className="text-gray-500 text-lg">/mes</span>
              </div>
            </div>

            {/* Beneficios */}
            <div className="space-y-4 mb-10">
              <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Incluye:
              </p>
              <ul className="space-y-4">
                {[
                  'Gestión ilimitada de obras y proyectos',
                  'Reportes y estadísticas en tiempo real',
                  'Invita a todo tu equipo sin límites',
                  'Gestión de tareas y calendario integrado',
                  'Control de compras y presupuestos',
                  'Soporte prioritario 24/7',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Botón de suscripción */}
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubscribing ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Comenzar ahora'
              )}
            </button>

            {/* Info adicional */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-500">
                🔒 Pago seguro procesado por Mercado Pago
              </p>
              <p className="text-xs text-gray-400">
                Puedes cancelar tu suscripción en cualquier momento
              </p>
            </div>
          </div>
        </div>

        {/* Link para cerrar sesión */}
        <div className="text-center mt-6">
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}

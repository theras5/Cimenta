"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  site_id: string;
  role: string;
  sites: {
    address: string;
  };
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  
  const token = searchParams.get("token");

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setError("Token de invitación no válido");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/invitations/token/${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al cargar la invitación");
      }

      const data = await response.json();
      setInvitation(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  const handleAccept = async () => {
    if (!user?.id) {
      // Redirigir al login con return URL
      router.push(`/login?redirect=/accept-invitation?token=${token}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al aceptar la invitación");
      }

      setSuccess(true);
      
      // Guardar la obra como seleccionada
      localStorage.setItem("selectedSiteId", data.site_id);
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Invitación Aceptada!
              </h2>
              <p className="text-gray-600 mb-4">
                Ahora formas parte de la obra. Redirigiendo al dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Error
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => router.push("/")}>
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invitación a Obra
            </h2>
            <p className="text-gray-600 mb-1">
              Has sido invitado a colaborar en:
            </p>
            <p className="text-lg font-semibold text-blue-600 mb-2">
              {invitation?.sites?.address}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Rol: <span className="font-medium text-gray-700">{invitation?.role === 'admin' ? 'Administrador' : 'Cliente'}</span>
            </p>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Debes iniciar sesión para aceptar esta invitación
                </p>
                <Button
                  onClick={() => router.push(`/login?redirect=/accept-invitation?token=${token}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={() => router.push(`/register?redirect=/accept-invitation?token=${token}`)}
                  variant="outline"
                  className="w-full"
                >
                  Crear Cuenta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Conectado como: <span className="font-medium">{user.email}</span>
                </p>
                <Button
                  onClick={handleAccept}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aceptando...
                    </>
                  ) : (
                    "Aceptar Invitación"
                  )}
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full"
                >
                  Rechazar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

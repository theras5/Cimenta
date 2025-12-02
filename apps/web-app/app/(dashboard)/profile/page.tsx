// apps/web-app/app/(dashboard)/profile/page.tsx
"use client";

import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Wrench,
  Users,
  Building,
  LogOut,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const profileMenuItems = [
  {
    icon: User,
    title: "Mi cuenta",
    description: "Información personal y configuración",
    href: "/profile/cuenta",
  },
  {
    icon: Wrench,
    title: "Mis obras",
    description: "Proyectos y construcciones activas",
    href: "/profile/obras",
  },
  {
    icon: Users,
    title: "Mis empleados",
    description: "Gestión de equipo y colaboradores",
    href: "/profile/empleados",
  },
  {
    icon: Building,
    title: "Mis clientes",
    description: "Cartera de clientes y contactos",
    href: "/profile/clientes",
  },
];

export default function PerfilPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Redirigir al login si no hay usuario - usar useEffect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Función para obtener las iniciales del usuario - con validación
  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default fallback
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Mostrar loading mientras se carga la información del usuario
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar loading (el useEffect se encargará de la redirección)
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Perfil</h1>

          <div className="flex flex-col items-center">
            <Avatar className="w-32 h-32 mb-6">
              <AvatarFallback className="text-4xl font-bold bg-blue-100 text-blue-600">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {user.name || 'Usuario'}
            </h2>
            <p className="text-gray-600">{user.email || 'Sin email'}</p>
          </div>
        </div>

        {/* Profile Menu */}
        <div className="space-y-4 mb-8">
          {profileMenuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={index}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(item.href)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logout Button */}
        <Card 
          className="border-red-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleLogout}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-red-600">Cerrar sesión</h3>
                <p className="text-sm text-gray-600">Salir de tu cuenta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
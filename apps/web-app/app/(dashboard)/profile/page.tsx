// apps/web-app/app/(dashboard)/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  Camera,
  Upload,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  // Redirigir al login si no hay usuario - usar useEffect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Cargar avatar cuando el usuario esté disponible
  useEffect(() => {
    if (user?.id) {
      loadAvatar();
    }
  }, [user?.id]);

  const loadAvatar = async () => {
    if (!user?.id) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/user-profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Error al cargar el perfil");
        return;
      }

      const data = await response.json();
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error("Error al cargar el avatar:", error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      });
      return;
    }

    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;

    try {
      setUploading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/storage/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir la imagen');
      }

      const result = await response.json();
      
      // Recargar el avatar
      await loadAvatar();
      setShowAvatarDialog(false);

      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil se ha actualizado correctamente",
        variant: "success",
      });
    } catch (error) {
      console.error("Error al subir el avatar:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user?.id) return;

    try {
      setUploading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch('/api/storage/delete-profile-picture', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la imagen');
      }

      setAvatarUrl(null);
      setShowAvatarDialog(false);

      toast({
        title: "Avatar eliminado",
        description: "Tu foto de perfil se ha eliminado correctamente",
        variant: "success",
      });
    } catch (error) {
      console.error("Error al eliminar el avatar:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
            {/* Avatar with upload button */}
            <div className="relative mb-6">
              <Avatar className="w-32 h-32">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user.name || "Avatar"} />
                ) : null}
                <AvatarFallback className="text-4xl font-bold bg-blue-100 text-blue-600">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera button overlay */}
              <button
                onClick={() => setShowAvatarDialog(true)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {user.name || 'Usuario'}
            </h2>
            <p className="text-gray-600">{user.email || 'Sin email'}</p>
          </div>
        </div>

        {/* Avatar Options Dialog */}
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Foto de perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              {/* Upload from gallery */}
              <label htmlFor="avatar-upload" className="block">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Subir desde galería</p>
                    <p className="text-sm text-gray-500">Selecciona una imagen de tu dispositivo</p>
                  </div>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {/* Delete avatar (only if exists) */}
              {avatarUrl && (
                <button
                  onClick={deleteAvatar}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-red-600">Eliminar foto</p>
                    <p className="text-sm text-gray-500">Volver a las iniciales</p>
                  </div>
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={() => setShowAvatarDialog(false)}
                disabled={uploading}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">Cancelar</p>
                </div>
              </button>

              {uploading && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Subiendo imagen...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
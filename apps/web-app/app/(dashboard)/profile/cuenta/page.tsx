// apps/web-app/app/(dashboard)/profile/cuenta/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Camera, Upload, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MiCuentaPage() {
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("Cargando datos del usuario en el formulario:", user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
      loadAvatar();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

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

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive",
      });
      return;
    }

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

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== "string") {
      return "U";
    }
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      console.log("Guardando cambios:", {
        name: formData.name,
      });
      
      await updateUser({
        name: formData.name,
      });
      
      console.log("Cambios guardados exitosamente");
      
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios se han guardado correctamente",
        variant: "success",
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar los cambios';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/profile")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al perfil
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu información personal y configuración
        </p>
      </div>

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user?.name || "Avatar"} />
                ) : null}
                <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-600">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              
              <button
                onClick={() => setShowAvatarDialog(true)}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                {user?.name || "Usuario"}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Sube una foto para personalizar tu perfil
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarDialog(true)}
              >
                Cambiar foto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Options Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <label htmlFor="avatar-upload-cuenta" className="block">
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
                id="avatar-upload-cuenta"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>

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

      {/* Personal Information Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre completo"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-2"
              disabled
            />
            <p className="text-sm text-gray-500 mt-2">
              El correo electrónico no puede ser modificado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
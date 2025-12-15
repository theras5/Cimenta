// apps/web-app/app/(dashboard)/profile/obras/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSites } from "@/hooks/useSites";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Loader2, MapPin, Plus, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InviteUserModal } from "@/components/InviteUserModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MisObrasPage() {
  const { user, loading: authLoading } = useAuth();
  const { sites, loading: sitesLoading, loadUserSites, createSite } = useSites();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    description: "",
    role: "admin" as "admin" | "client",
  });

  useEffect(() => {
    if (user?.id) {
      loadUserSites(user.id);
    }
  }, [user?.id, loadUserSites]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    if (!formData.address.trim()) {
      toast({
        title: "Error",
        description: "La dirección es obligatoria",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddSite = async () => {
    if (!validateForm() || !user?.id) return;

    const newSite = await createSite({
      address: formData.address,
      description: formData.description,
      role: formData.role || "admin",
      user_id: user.id,
    });

    if (newSite) {
      // Limpiar el formulario y cerrar el dialog
      setFormData({ address: "", description: "", role: "admin" });
      setIsDialogOpen(false);
      
      // Recargar la lista de obras
      await loadUserSites(user.id);
      
      // Guardar el sitio nuevo como seleccionado en localStorage
      localStorage.setItem("selectedSiteId", newSite.id);
      
      // Redirigir al dashboard con la nueva obra seleccionada
      router.push(`/dashboard?siteId=${newSite.id}`);
    }
  };

  const handleSelectSite = (siteId: string) => {
    // Guardar el sitio seleccionado en localStorage
    localStorage.setItem("selectedSiteId", siteId);
    
    // Redirigir al dashboard con la obra seleccionada
    router.push(`/dashboard?siteId=${siteId}`);
  };

  if (authLoading || sitesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Obras</h1>
            <p className="text-gray-600 mt-2">
              Proyectos y construcciones activas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Obra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Obra</DialogTitle>
                <DialogDescription>
                  Completa los datos de la nueva obra
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">
                    Dirección <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="Ej: Av. Corrientes 1234"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Construcción de edificio residencial"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">
                    Tu rol en esta obra <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "client") =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddSite}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Agregar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sites List */}
      {sites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes obras registradas
            </h3>
            <p className="text-gray-600 mb-6">
              Empieza agregando tu primera obra
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Obra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sites.map((site) => (
            <Card
              key={site.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex items-start gap-4 flex-1 cursor-pointer"
                    onClick={() => handleSelectSite(site.id)}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Obra en {site.address}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {site.address}
                      </div>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectSite(site.id)}
                      className="whitespace-nowrap"
                    >
                      Ver obra
                    </Button>
                    <InviteUserModal 
                      siteId={site.id} 
                      siteName={site.address}
                      trigger={
                        <Button 
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap w-full"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invitar Usuario
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

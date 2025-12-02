"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSites } from "@/hooks/useSites";
import { Site } from "@/lib/types/site";

export default function SelectSitePage() {
  const { user } = useAuth();
  const { sites, loading, error, loadUserSites, createSite } = useSites();
  const { toast } = useToast();
  const router = useRouter();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [creatingsite, setCreatingSite] = useState(false);

  useEffect(() => {
    const loadSites = async () => {
      // Si no hay usuario, esperar brevemente
      let currentUser = user;
      if (!currentUser?.id) {
        // Esperar hasta 2 segundos por el usuario
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (user?.id) {
            currentUser = user;
            break;
          }
        }
      }

      if (currentUser?.id) {
        await loadUserSites(currentUser.id);
      }
    };

    loadSites();
  }, [user, loadUserSites]);

  const handleSelect = async (site: Site) => {
    // Guardar el sitio seleccionado (usando localStorage en lugar de AsyncStorage)
    localStorage.setItem("selectedSiteId", site.id);
    
    // Redirigir al dashboard
    router.push("/dashboard");
  };

  const handleAddSite = () => {
    setModalVisible(true);
  };

  const handleCreateSite = async () => {
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "No hay usuario logueado",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingSite(true);
      
      const newSite = await createSite({
        address: newAddress.trim(),
        role: newRole,
        user_id: user.id,
      });
      
      if (newSite) {
        setModalVisible(false);
        setNewAddress("");
      }
    } finally {
      setCreatingSite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-12 text-center text-gray-800">
        Mis Obras
      </h1>

      <div className="space-y-4">
        {sites.map((obra) => (
          <Card 
            key={obra.id}
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-0 bg-blue-600 h-20"
            onClick={() => handleSelect(obra)}
          >
            <CardContent className="rounded-lg flex items-center justify-center h-full">
              <div className="text-white text-lg font-bold text-center">
                {obra.address}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-2 border-blue-600"
          onClick={handleAddSite}
        >
          <CardContent className="p-6 bg-white rounded-lg flex items-center justify-center">
            <div className="text-blue-600 text-lg font-bold flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" />
              Añadir obra
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Modal para crear sitio */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nueva obra</DialogTitle>
            <DialogDescription>
              Ingresa los detalles de la nueva obra
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="address">Dirección de la obra</Label>
              <Input
                id="address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Ingresa la dirección"
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Tipo de usuario</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setModalVisible(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSite}
              disabled={creatingsite || !newAddress.trim()}
            >
              {creatingsite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
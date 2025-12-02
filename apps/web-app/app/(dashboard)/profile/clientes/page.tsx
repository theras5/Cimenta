// apps/web-app/app/(dashboard)/profile/clientes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building,
  Loader2,
  Plus,
  Trash2,
  Phone,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clientService, type Client } from "@/lib/services/clientService";

export default function MisClientesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Cargar clientes del usuario
  useEffect(() => {
    if (user?.id) {
      loadClients();
    }
  }, [user?.id]);

  const loadClients = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await clientService.getUserClients(user.id);
      setClients(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      phone: "",
    };

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es obligatorio";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es obligatorio";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El número de celular es obligatorio";
    } else if (!/^\+?[\d\s-]{8,}$/.test(formData.phone)) {
      newErrors.phone = "El número de celular no es válido";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleAddClient = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      const newClient = await clientService.createClient({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        user_id: user.id,
      });

      setClients([...clients, newClient]);
      setFormData({ firstName: "", lastName: "", phone: "" });
      setErrors({ firstName: "", lastName: "", phone: "" });
      setIsDialogOpen(false);

      toast({
        title: "Cliente agregado",
        description: "El cliente ha sido agregado correctamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el cliente",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await clientService.deleteClient(id);
      setClients(clients.filter((client) => client.id !== id));
      
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
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
            <h1 className="text-3xl font-bold text-gray-900">Mis Clientes</h1>
            <p className="text-gray-600 mt-2">
              Cartera de clientes y contactos
            </p>
          </div>

          {/* Add Client Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="firstName">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Nombre del cliente"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      setErrors({ ...errors, firstName: "" });
                    }}
                    className={`mt-2 ${errors.firstName ? "border-red-500" : ""}`}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">
                    Apellido <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Apellido del cliente"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      setErrors({ ...errors, lastName: "" });
                    }}
                    className={`mt-2 ${errors.lastName ? "border-red-500" : ""}`}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">
                    Número de Celular <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      setErrors({ ...errors, phone: "" });
                    }}
                    className={`mt-2 ${errors.phone ? "border-red-500" : ""}`}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setFormData({ firstName: "", lastName: "", phone: "" });
                      setErrors({ firstName: "", lastName: "", phone: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddClient}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes clientes registrados
            </h3>
            <p className="text-gray-600">
              Comienza agregando tu primer cliente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {client.first_name} {client.last_name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-1" />
                        {client.phone}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClient(client.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

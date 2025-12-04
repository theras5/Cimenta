"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWorkers } from "@/hooks/useWorkers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  Loader2,
  Plus,
  Trash2,
  Phone,
  User,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROFESSIONS = [
  { value: "electricista", label: "Electricista" },
  { value: "plomero", label: "Plomero" },
  { value: "albanil", label: "Albañil" },
  { value: "carpintero", label: "Carpintero" },
  { value: "pintor", label: "Pintor" },
  { value: "soldador", label: "Soldador" },
  { value: "other", label: "Otro" },
];

export default function MisEmpleadosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const {
    workers,
    loading: workersLoading,
    error: workersError,
    fetchWorkersByEmployer,
    createWorker,
    deleteWorker,
  } = useWorkers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    profession: "other",
  });
  const [errors, setErrors] = useState({
    fullname: "",
    phone: "",
    profession: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Cargar trabajadores del empleador (usuario actual)
  useEffect(() => {
    if (user?.id) {
      loadWorkers();
    }
  }, [user?.id]);

  const loadWorkers = async () => {
    if (!user?.id) return;
    console.log("UserId: ", user.id);

    try {
      await fetchWorkersByEmployer(user.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los trabajadores",
        variant: "destructive",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      fullname: "",
      phone: "",
      profession: "",
    };

    if (!formData.fullname.trim()) {
      newErrors.fullname = "El nombre completo es obligatorio";
    } else if (formData.fullname.length > 50) {
      newErrors.fullname = "El nombre no puede exceder 50 caracteres";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El número de celular es obligatorio";
    } else if (!/^\+?[\d\s-]{8,}$/.test(formData.phone)) {
      newErrors.phone = "El número de celular no es válido";
    } else if (formData.phone.length > 20) {
      newErrors.phone = "El número no puede exceder 20 caracteres";
    }

    if (!formData.profession) {
      newErrors.profession = "Debe seleccionar una profesión";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleAddWorker = async () => {
    if (!validateForm() || !user?.id) return;

    setIsSubmitting(true);
    try {
      await createWorker({
        employer_id: user.id,
        worker_fullname: formData.fullname.trim(),
        worker_cellnumber: formData.phone.trim(),
        profession: formData.profession,
      });

      toast({
        title: "Empleado agregado",
        description: "El empleado ha sido agregado correctamente",
        variant: "success",
      });

      setFormData({ fullname: "", phone: "", profession: "other" });
      setErrors({ fullname: "", phone: "", profession: "" });
      setIsDialogOpen(false);

      // Recargar la lista
      await loadWorkers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo agregar el trabajador",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      await deleteWorker(workerId);

      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado correctamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el trabajador",
        variant: "destructive",
      });
    }
  };

  if (authLoading || (workersLoading && workers.length === 0)) {
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
            <h1 className="text-3xl font-bold text-gray-900">Mis Trabajadores</h1>
            <p className="text-gray-600 mt-2">
              Gestión de equipo y colaboradores
            </p>
          </div>

          {/* Add Worker Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Trabajador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Trabajador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fullname">
                    Nombre Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Nombre completo del trabajador"
                    value={formData.fullname}
                    onChange={(e) => {
                      setFormData({ ...formData, fullname: e.target.value });
                      setErrors({ ...errors, fullname: "" });
                    }}
                    className={`mt-2 ${errors.fullname ? "border-red-500" : ""}`}
                    maxLength={50}
                  />
                  {errors.fullname && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.fullname}
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
                    maxLength={20}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="profession">
                    Profesión <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.profession}
                    onValueChange={(value) => {
                      setFormData({ ...formData, profession: value });
                      setErrors({ ...errors, profession: "" });
                    }}
                  >
                    <SelectTrigger className={`mt-2 ${errors.profession ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Seleccionar profesión" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFESSIONS.map((prof) => (
                        <SelectItem key={prof.value} value={prof.value}>
                          {prof.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.profession && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.profession}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setFormData({ fullname: "", phone: "", profession: "other" });
                      setErrors({ fullname: "", phone: "", profession: "" });
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddWorker}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      "Agregar"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {workersError && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-600">{workersError}</p>
          </CardContent>
        </Card>
      )}

      {/* Workers List */}
      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes trabajadores registrados
            </h3>
            <p className="text-gray-600">
              Comienza agregando tu primer trabajador
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workers.map((worker) => (
            <Card key={worker.worker_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {worker.worker_fullname}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {worker.worker_cellnumber}
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          {PROFESSIONS.find((p) => p.value === worker.profession)?.label || worker.profession}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorker(worker.worker_id)}
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
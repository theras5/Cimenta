"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Sidebar from "@/components/SideBar";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/lib/api";

const categoryColors = {
  ELECTRICIDAD: "bg-blue-500",
  PINTURA: "bg-pink-500",
  PLOMERÍA: "bg-orange-500",
  CONSTRUCCIÓN: "bg-gray-500",
  ALBAÑILERÍA: "bg-yellow-500",
  CARPINTERÍA: "bg-brown-500",
};

export default function NewChangePage() {
  const router = useRouter();
  const { createTask } = useTasks();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Cargar el sitio seleccionado de localStorage
  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setSelectedSiteId(siteId);
    } else {
      // Si no hay sitio seleccionado, redirigir
      router.push("/select-site");
    }
  }, [router]);

  const [newChange, setNewChange] = useState({
    title: "",
    description: "",
    category: ""
  });

  const resetForm = () => {
    setNewChange({
      title: "",
      description: "",
      category: ""
    });
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!newChange.title || !newChange.category) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    // Obtener site_id directamente de localStorage (como en la APP)
    const site_id = typeof window !== "undefined" ? localStorage.getItem("selectedSiteId") : null;
    if (!site_id) {
      setError("Debes seleccionar una obra antes de crear la solicitud");
      return;
    }

    if (!user?.id) {
      setError("Debes estar logueado para crear una solicitud de cambio");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      // Crear la solicitud de cambio usando la API real
      const changeData = {
        title: newChange.title,
        description: newChange.description,
        status: "changes" as Task["status"],
        category: newChange.category,
        site_id,
        user_id: user.id,
      };

      await createTask(changeData);

      // Mostrar éxito
      setSuccess(true);

      // Redirigir después de 2 segundos con refresh
      setTimeout(() => {
        router.push(`/tasks?refresh=${Date.now()}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error creating change request:", error);
      setError(error.message || "Error al crear la solicitud de cambio");
    } finally {
      setLoading(false);
    }
  };

  // Si se creó exitosamente, mostrar mensaje de éxito
  if (success) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Solicitud de cambio creada exitosamente!
            </h2>
            <p className="text-gray-600 mb-4">
              Redirigiendo a la lista de tareas...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-xl text-orange-800">
                  Nueva Solicitud de Cambio
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Completa los detalles para solicitar un cambio en el proyecto
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Título */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Título del cambio <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ej: Modificación del diseño de la cocina"
                      value={newChange.title}
                      onChange={(e) =>
                        setNewChange({ ...newChange, title: e.target.value })
                      }
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción del cambio propuesto
                    </label>
                    <Textarea
                      placeholder="Describe detalladamente el cambio que necesitas realizar..."
                      value={newChange.description}
                      onChange={(e) =>
                        setNewChange({
                          ...newChange,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      disabled={loading}
                    />
                  </div>

                  {/* Categoría y Prioridad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Categoría afectada <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={newChange.category}
                        onValueChange={(value) =>
                          setNewChange({ ...newChange, category: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electricidad">
                            ELECTRICIDAD
                          </SelectItem>
                          <SelectItem value="pintura">PINTURA</SelectItem>
                          <SelectItem value="plomeria">PLOMERÍA</SelectItem>
                          <SelectItem value="construccion">
                            CONSTRUCCIÓN
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !newChange.title ||
                        !newChange.category ||
                        loading
                      }
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Solicitud de Cambio"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
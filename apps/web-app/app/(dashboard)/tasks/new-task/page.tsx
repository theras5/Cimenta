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

const teamMembers = [
  "Juan",
  "Pedro",
  "María",
  "Carlos",
  "Ana",
  "Luis",
  "Sofia",
  "Miguel",
  "Carmen",
  "Roberto",
  "Elena",
];

export default function NewTaskPage() {
  const router = useRouter();
  const { createTask } = useTasks();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending" as Task["status"],
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== member));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const resetForm = () => {
    setNewTask({
      title: "",
      description: "",
      category: "",
      status: "pending",
      start_date: undefined,
      end_date: undefined,
    });
    setSelectedMembers([]);
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!newTask.title || !newTask.category) {
      setError("Por favor completa al menos el título y la categoría");
      return;
    }

    // Obtener site_id directamente de localStorage (como en la APP)
    const site_id = typeof window !== "undefined" ? localStorage.getItem("selectedSiteId") : null;
    if (!site_id) {
      setError("Debes seleccionar una obra antes de crear la tarea");
      return;
    }

    if (!user?.id) {
      setError("Debes estar logueado para crear una tarea");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      // Convertir datetime-local (local) a ISO strings (UTC) si fue provisto
      const startIso = newTask.start_date ? new Date(newTask.start_date).toISOString() : undefined;
      const endIso = newTask.end_date ? new Date(newTask.end_date).toISOString() : undefined;

      // Crear la tarea usando la API real
      const taskData = {
        title: newTask.title,
        description: newTask.description || undefined,
        status: newTask.status,
        category: newTask.category,
        start_date: startIso,
        end_date: endIso,
        user_id: user.id,
        site_id,
      };

      await createTask(taskData);

      // Mostrar éxito
      setSuccess(true);

      // Redirigir después de 2 segundos con refresh
      setTimeout(() => {
        router.push(`/tasks?refresh=${Date.now()}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error creating task:", error);
      setError(error.message || "Error al crear la tarea");
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
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Tarea creada exitosamente!
            </h2>
            <p className="text-gray-600 mb-4">
              Redirigiendo a la lista de tareas...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Crear Nueva Tarea</CardTitle>
                <CardDescription>
                  Completa los detalles para crear una nueva tarea del proyecto
                </CardDescription>
              </CardHeader>

              <CardContent>
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
                      Título de la tarea *
                    </label>
                    <Input
                      placeholder="Ej: Instalación eléctrica del segundo piso"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({ ...newTask, title: e.target.value })
                      }
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción detallada
                    </label>
                    <Textarea
                      placeholder="Describe los detalles específicos de la tarea..."
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      rows={4}
                      disabled={loading}
                    />
                  </div>

                  {/* Categoría, Prioridad y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Categoría *
                      </label>
                      <Select
                        value={newTask.category}
                        onValueChange={(value) =>
                          setNewTask({ ...newTask, category: value })
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Estado inicial
                      </label>
                      <Select
                        value={newTask.status}
                        onValueChange={(value) =>
                          setNewTask({
                            ...newTask,
                            status: value as Task["status"],
                          })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Estado inicial" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">
                            En progreso
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fecha y hora de inicio / fin */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Fecha y hora de inicio
                      </label>
                      <Input
                        type="datetime-local"
                        value={newTask.start_date || ""}
                        onChange={(e) =>
                          setNewTask({ ...newTask, start_date: e.target.value })
                        }
                        className="h-12"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Fecha y hora de fin
                      </label>
                      <Input
                        type="datetime-local"
                        value={newTask.end_date || ""}
                        onChange={(e) =>
                          setNewTask({ ...newTask, end_date: e.target.value })
                        }
                        className="h-12"
                        disabled={loading}
                      />
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
                        !newTask.title ||
                        !newTask.category ||
                        loading
                      }
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Tarea"
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
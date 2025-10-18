"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const { createTask, loading: tasksLoading, error: tasksError } = useTasks();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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
        user_id: "ad4d74ba-beac-4741-9ec1-978d564a971c",
        site_id: "e43d720c-8b2f-454f-8b41-55019ffef012",
        // Podrías añadir estos campos según tu backend:
        // assigned_members: selectedMembers.join(","), // Si tu backend los maneja
        // site_id: "algún-site-id", // Si tienes sitios
      };

      await createTask(taskData);

      // Mostrar éxito
      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/tasks");
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
                  {(error || tasksError) && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {error || tasksError}
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
                      disabled={loading || tasksLoading}
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
                      disabled={loading || tasksLoading}
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
                        disabled={loading || tasksLoading}
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
                        disabled={loading || tasksLoading}
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
                        disabled={loading || tasksLoading}
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
                        disabled={loading || tasksLoading}
                      />
                    </div>
                  </div>

                  {/* Miembros del equipo - Solo visual por ahora */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Asignar miembros del equipo ({selectedMembers.length}{" "}
                      seleccionados)
                    </label>
                    <p className="text-xs text-gray-500">
                      Nota: La asignación de miembros se guardará cuando se implemente en el backend
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member}
                          className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-all ${
                            selectedMembers.includes(member)
                              ? "bg-blue-500 text-white shadow-md"
                              : "bg-white hover:bg-gray-100 border border-gray-200"
                          } ${
                            loading || tasksLoading
                              ? "pointer-events-none opacity-50"
                              : ""
                          }`}
                          onClick={() =>
                            !loading && !tasksLoading && toggleMember(member)
                          }
                        >
                          {member}
                        </div>
                      ))}
                    </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      disabled={loading || tasksLoading}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      disabled={loading || tasksLoading}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !newTask.title ||
                        !newTask.category ||
                        loading ||
                        tasksLoading
                      }
                      className="flex-1"
                    >
                      {loading || tasksLoading ? (
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
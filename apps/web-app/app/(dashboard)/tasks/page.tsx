"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Clipboard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TaskSection from "@/components/TaskSection";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/lib/api";

// Adaptar la interfaz local a la interfaz de la API
interface LocalTask {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "changes";
  category: string;
  categoryColor: string;
  assignedMembers: string[];
}

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

// Función para convertir Task de API a LocalTask para la UI
const convertApiTaskToLocal = (apiTask: Task): LocalTask => ({
  id: parseInt(apiTask.id) || Math.random(),
  title: apiTask.title,
  description: apiTask.description || "",
  status: apiTask.status,
  category: apiTask.category || "construccion",
  categoryColor: categoryColors[apiTask.category as keyof typeof categoryColors] || "bg-gray-500",
  assignedMembers: [], // Por ahora vacío, puedes expandir esto según tu backend
});

// Wrapper component for TaskSection with horizontal scroll
const ScrollableTaskSection = ({
  title,
  tasks,
  changes = false,
}: {
  title: string;
  tasks: unknown[];
  changes?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [tasks]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative">
      {showScrollButtons && (
        <>
          <Button
            onClick={scrollLeft}
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </Button>
          <Button
            onClick={scrollRight}
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </Button>
        </>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <TaskSection title={title} tasks={tasks} changes={changes} />
      </div>
    </div>
  );
};

const TasksScreen = () => {
  // Reemplazar useState local por useTasks hook
  const { 
    tasks: apiTasks, 
    loading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    fetchTasks,
    clearError 
  } = useTasks();

  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending" as Task["status"],
  });
  const [newChange, setNewChange] = useState({
    title: "",
    description: "",
    category: "",
    reason: "",
  });

  // Convertir tareas de API a formato local para la UI
  const tasks: LocalTask[] = apiTasks.map(convertApiTaskToLocal);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTasks();
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const resetTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      category: "",
      status: "pending",
    });
    setSelectedMembers([]);
  };

  const resetChangeForm = () => {
    setNewChange({
      title: "",
      description: "",
      category: "",
      reason: "",
    });
    setSelectedMembers([]);
  };

  const handleCreateTask = () => {
    setShowModal(false);
    setShowTaskModal(true);
  };

  const handleCreateChange = () => {
    setShowModal(false);
    setShowChangeModal(true);
  };

  const handleAddTask = async () => {
    if (
      newTask.title &&
      newTask.category
    ) {
      try {
        await createTask({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          category: newTask.category,
          user_id: "ad4d74ba-beac-4741-9ec1-978d564a971c",
          site_id: "e43d720c-8b2f-454f-8b41-55019ffef012"
        });
        resetTaskForm();
        setShowTaskModal(false);
      } catch (error) {
        console.error("Error creating task:", error);
      }
    }
  };

  const handleAddChange = async () => {
    if (
      newChange.title &&
      newChange.category
    ) {
      try {
        await createTask({
          title: newChange.title,
          description: newChange.description,
          status: "changes",
          category: newChange.category,
        });
        resetChangeForm();
        setShowChangeModal(false);
      } catch (error) {
        console.error("Error creating change request:", error);
      }
    }
  };

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== member));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  // Mostrar loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  // Mostrar error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>
              Recargar página
            </Button>
            <Button variant="outline" onClick={clearError}>
              Intentar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Group tasks by status
  const changes = tasks.filter((task) => task.status === "changes");
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  return (
    <div className="bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">
            Tareas ({tasks.length})
          </h1>
          <Button
            onClick={() => setShowModal(true)}
            className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6 h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearError}
                className="ml-auto"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {/* Selection Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                ¿Qué quieres crear?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button
                onClick={handleCreateTask}
                className="w-full justify-start h-auto p-4 bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200"
                variant="outline"
              >
                <div className="flex items-center">
                  <div className="bg-blue-500 p-3 rounded-4xl mr-4">
                    <Check className="text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Tarea</div>
                    <div className="text-sm text-gray-600">
                      Crear una nueva tarea para realizar
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleCreateChange}
                className="w-full justify-start h-auto p-4 bg-orange-50 hover:bg-orange-100 text-gray-800 border border-orange-200"
                variant="outline"
              >
                <div className="flex items-center">
                  <div className="bg-orange-500 p-3 rounded-full mr-4">
                    <RotateCcw className="text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Cambio</div>
                    <div className="text-sm text-gray-600">
                      Solicitar un cambio en el proyecto
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Creation Modal */}
        <Dialog
          open={showTaskModal}
          onOpenChange={(open) => {
            setShowTaskModal(open);
            if (!open) resetTaskForm();
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Crear Nueva Tarea
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título de la tarea"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Descripción detallada de la tarea"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                rows={3}
              />
              <Select
                value={newTask.category}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricidad">ELECTRICIDAD</SelectItem>
                  <SelectItem value="pintura">PINTURA</SelectItem>
                  <SelectItem value="plomeria">PLOMERÍA</SelectItem>
                  <SelectItem value="construccion">CONSTRUCCIÓN</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newTask.status}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, status: value as Task["status"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado inicial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                </SelectContent>
              </Select>

              {/* Team Members Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Asignar miembros del equipo ({selectedMembers.length}{" "}
                  seleccionados)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member}
                      className={`cursor-pointer p-2 rounded text-sm transition-colors ${
                        selectedMembers.includes(member)
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => toggleMember(member)}
                    >
                      {member}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddTask}
                className="w-full"
                disabled={
                  !newTask.title ||
                  !newTask.category
                }
              >
                Crear Tarea
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Request Modal */}
        <Dialog
          open={showChangeModal}
          onOpenChange={(open) => {
            setShowChangeModal(open);
            if (!open) resetChangeForm();
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Solicitar Cambio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título del cambio"
                value={newChange.title}
                onChange={(e) =>
                  setNewChange({ ...newChange, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Descripción del cambio propuesto"
                value={newChange.description}
                onChange={(e) =>
                  setNewChange({ ...newChange, description: e.target.value })
                }
                rows={3}
              />
              <Select
                value={newChange.category}
                onValueChange={(value) =>
                  setNewChange({ ...newChange, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoría afectada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricidad">ELECTRICIDAD</SelectItem>
                  <SelectItem value="pintura">PINTURA</SelectItem>
                  <SelectItem value="plomeria">PLOMERÍA</SelectItem>
                  <SelectItem value="construccion">CONSTRUCCIÓN</SelectItem>
                </SelectContent>
              </Select>

              {/* Team Members Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Responsables del cambio ({selectedMembers.length}{" "}
                  seleccionados)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member}
                      className={`cursor-pointer p-2 rounded text-sm transition-colors ${
                        selectedMembers.includes(member)
                          ? "bg-orange-100 text-orange-800 border border-orange-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => toggleMember(member)}
                    >
                      {member}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddChange}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={
                  !newChange.title ||
                  !newChange.category
                }
              >
                Crear Solicitud de Cambio
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No hay tareas aún
              </h3>
              <p className="text-gray-400 text-center px-6">
                Crea tu primera tarea usando el botón +
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Changes */}
              {changes.length > 0 && (
                <ScrollableTaskSection
                  title="Cambios"
                  tasks={changes}
                  changes={true}
                />
              )}

              {/* Pending */}
              {pendingTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Pendientes"
                  tasks={pendingTasks}
                />
              )}

              {/* In Progress */}
              {inProgressTasks.length > 0 && (
                <ScrollableTaskSection
                  title="En progreso"
                  tasks={inProgressTasks}
                />
              )}

              {/* Completed */}
              {completedTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Completadas"
                  tasks={completedTasks}
                />
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleRefresh}
            size="icon"
            variant="outline"
            className="w-12 h-12 rounded-full bg-white shadow-lg"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TasksScreen;
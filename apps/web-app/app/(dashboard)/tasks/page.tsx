"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Clipboard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  AlertCircle,
  Users,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import TaskSection from "@/components/TaskSection";
import EditTaskModal from "@/components/EditTaskModal";
import { useTasks } from "@/hooks/useTasks";
import { useWorkers } from "@/hooks/useWorkers";
import { useAssignedTo } from "@/hooks/useAssignedTo";
import { Task } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Adaptar la interfaz local a la interfaz de la API
interface LocalTask {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "changes" | "blocked";
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

// Wrapper component for TaskSection with horizontal scroll
const ScrollableTaskSection = ({
  title,
  tasks,
  changes = false,
  onEditTask,
  onAssignWorkers,
}: {
  title: string;
  tasks: Task[];
  changes?: boolean;
  onEditTask?: (task: Task) => void;
  onAssignWorkers?: (task: Task) => void;
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
        <TaskSection 
          title={title} 
          tasks={tasks} 
          changes={changes} 
          onEditTask={onEditTask}
          onAssignWorkers={onAssignWorkers}
        />
      </div>
    </div>
  );
};

const TasksScreen = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
    clearError,
  } = useTasks();

  const { workers, fetchWorkersByEmployer } = useWorkers();
  const { 
    assignWorkerToTask, 
    assignMultipleWorkersToTask,
    getWorkersByTask,
    unassignWorkerFromTask,
    loading: assignLoading 
  } = useAssignedTo();

  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [taskToAssign, setTaskToAssign] = useState<Task | null>(null);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending" as Task["status"],
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });
  const [newChange, setNewChange] = useState({
    title: "",
    description: "",
    category: "",
    reason: "",
  });

  // Cargar el sitio seleccionado al iniciar
  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setSelectedSiteId(siteId);
      fetchTasks(siteId);
    } else {
      window.location.href = "/select-site";
    }
  }, [fetchTasks]);

  // Cargar workers del usuario cuando esté autenticado
  useEffect(() => {
    if (user?.id) {
      fetchWorkersByEmployer(user.id);
    }
  }, [user?.id, fetchWorkersByEmployer]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const siteId = localStorage.getItem("selectedSiteId");
      if (siteId) {
        setSelectedSiteId(siteId);
        await fetchTasks(siteId);
      }
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const newSiteId = localStorage.getItem("selectedSiteId");
      if (newSiteId && newSiteId !== selectedSiteId) {
        setSelectedSiteId(newSiteId);
        fetchTasks(newSiteId);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    const interval = setInterval(() => {
      const currentSiteId = localStorage.getItem("selectedSiteId");
      if (currentSiteId && currentSiteId !== selectedSiteId) {
        setSelectedSiteId(currentSiteId);
        fetchTasks(currentSiteId);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedSiteId, fetchTasks]);

  const resetTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      category: "",
      status: "pending",
      start_date: undefined,
      end_date: undefined,
    });
    setSelectedWorkers([]);
  };

  const resetChangeForm = () => {
    setNewChange({
      title: "",
      description: "",
      category: "",
      reason: "",
    });
    setSelectedWorkers([]);
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
    if (newTask.title && newTask.category) {
      try {
        const startIso = newTask.start_date ? new Date(newTask.start_date).toISOString() : undefined;
        const endIso = newTask.end_date ? new Date(newTask.end_date).toISOString() : undefined;

        const payload = {
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          category: newTask.category,
          start_date: startIso,
          end_date: endIso,
          user_id: user?.id,
          site_id: selectedSiteId,
        };

        const createdTask = await createTask(payload);

        // Si hay workers seleccionados, asignarlos
        if (selectedWorkers.length > 0 && createdTask?.id) {
          await assignMultipleWorkersToTask(createdTask.id, selectedWorkers);
          toast({
            title: "Éxito",
            description: `Tarea creada y ${selectedWorkers.length} trabajador(es) asignado(s)`,
          });
        } else {
          toast({
            title: "Éxito",
            description: "Tarea creada correctamente",
          });
        }

        resetTaskForm();
        setShowTaskModal(false);
        
        // Recargar tareas
        if (selectedSiteId) {
          await fetchTasks(selectedSiteId);
        }
      } catch (error) {
        console.error("Error creating task:", error);
        toast({
          title: "Error",
          description: "No se pudo crear la tarea",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddChange = async () => {
    if (newChange.title && newChange.category) {
      try {
        const createdTask = await createTask({
          title: newChange.title,
          description: newChange.description,
          status: "changes",
          category: newChange.category,
          site_id: selectedSiteId,
          user_id: user?.id,
        });

        // Si hay workers seleccionados, asignarlos
        if (selectedWorkers.length > 0 && createdTask?.id) {
          await assignMultipleWorkersToTask(createdTask.id, selectedWorkers);
        }

        toast({
          title: "Éxito",
          description: "Solicitud de cambio creada correctamente",
        });

        resetChangeForm();
        setShowChangeModal(false);
        
        if (selectedSiteId) {
          await fetchTasks(selectedSiteId);
        }
      } catch (error) {
        console.error("Error creating change request:", error);
        toast({
          title: "Error",
          description: "No se pudo crear la solicitud de cambio",
          variant: "destructive",
        });
      }
    }
  };

  const toggleWorker = (workerId: string) => {
    if (selectedWorkers.includes(workerId)) {
      setSelectedWorkers(selectedWorkers.filter((id) => id !== workerId));
    } else {
      setSelectedWorkers([...selectedWorkers, workerId]);
    }
  };

  // Funciones para asignar workers
  const handleOpenAssignModal = async (task: Task) => {
    setTaskToAssign(task);
    setShowAssignModal(true);
    
    // Cargar workers ya asignados a esta tarea
    try {
      const assigned = await getWorkersByTask(task.id);
      const workerIds = assigned.map(a => a.worker_id);
      setAssignedWorkers(workerIds);
      setSelectedWorkers(workerIds);
    } catch (error) {
      console.error("Error loading assigned workers:", error);
      setAssignedWorkers([]);
      setSelectedWorkers([]);
    }
  };

  const handleSaveWorkerAssignments = async () => {
    if (!taskToAssign) return;

    try {
      // Encontrar workers a agregar (están en selectedWorkers pero no en assignedWorkers)
      const workersToAdd = selectedWorkers.filter(id => !assignedWorkers.includes(id));
      
      // Encontrar workers a remover (están en assignedWorkers pero no en selectedWorkers)
      const workersToRemove = assignedWorkers.filter(id => !selectedWorkers.includes(id));

      // Agregar nuevos workers
      for (const workerId of workersToAdd) {
        await assignWorkerToTask(workerId, taskToAssign.id);
      }

      // Remover workers deseleccionados
      for (const workerId of workersToRemove) {
        await unassignWorkerFromTask(workerId, taskToAssign.id);
      }

      toast({
        title: "Éxito",
        description: "Trabajadores asignados correctamente",
      });

      setShowAssignModal(false);
      setTaskToAssign(null);
      setSelectedWorkers([]);
      setAssignedWorkers([]);
      
      // Recargar tareas
      if (selectedSiteId) {
        await fetchTasks(selectedSiteId);
      }
    } catch (error) {
      console.error("Error saving worker assignments:", error);
      toast({
        title: "Error",
        description: "No se pudieron asignar los trabajadores",
        variant: "destructive",
      });
    }
  };

  // Funciones para editar tarea
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowEditModal(true);
  };

  const handleSaveTask = async (id: string, updatedTask: Partial<Task>) => {
    try {
      await updateTask(id, updatedTask);
      setShowEditModal(false);
      setTaskToEdit(null);
      
      toast({
        title: "Éxito",
        description: "Tarea actualizada correctamente",
      });
      
      if (selectedSiteId) {
        await fetchTasks(selectedSiteId);
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive",
      });
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

  // Mensaje si no hay sitio seleccionado
  if (!selectedSiteId) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">No has seleccionado una obra</p>
          <Button onClick={() => (window.location.href = "/select-site")}>
            Seleccionar obra
          </Button>
        </div>
      </div>
    );
  }

  // Group tasks by status
  const changes = tasks.filter((task) => task.status === "changes");
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
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

              {/* Fecha y hora inicio/fin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha y hora de inicio</label>
                  <Input
                    type="datetime-local"
                    value={newTask.start_date || ""}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha y hora de fin</label>
                  <Input
                    type="datetime-local"
                    value={newTask.end_date || ""}
                    onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Workers Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Asignar trabajadores ({selectedWorkers.length} seleccionados)
                </label>
                {workers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No tienes trabajadores registrados. 
                    <a href="/profile/empleados" className="text-blue-600 hover:underline ml-1">
                      Agregar trabajadores
                    </a>
                  </p>
                ) : (
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.worker_id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleWorker(worker.worker_id)}
                      >
                        <Checkbox
                          checked={selectedWorkers.includes(worker.worker_id)}
                          onCheckedChange={() => toggleWorker(worker.worker_id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{worker.worker_fullname}</p>
                          <p className="text-xs text-gray-500">{worker.profession}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddTask}
                className="w-full"
                disabled={!newTask.title || !newTask.category}
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

              {/* Workers Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Responsables del cambio ({selectedWorkers.length} seleccionados)
                </label>
                {workers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No tienes trabajadores registrados.
                  </p>
                ) : (
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.worker_id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleWorker(worker.worker_id)}
                      >
                        <Checkbox
                          checked={selectedWorkers.includes(worker.worker_id)}
                          onCheckedChange={() => toggleWorker(worker.worker_id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{worker.worker_fullname}</p>
                          <p className="text-xs text-gray-500">{worker.profession}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddChange}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={!newChange.title || !newChange.category}
              >
                Crear Solicitud de Cambio
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Workers Modal */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Asignar Trabajadores
              </DialogTitle>
              {taskToAssign && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  {taskToAssign.title}
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4">
              {workers.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No tienes trabajadores registrados</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = "/profile/empleados"}
                  >
                    Agregar trabajadores
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.worker_id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleWorker(worker.worker_id)}
                      >
                        <Checkbox
                          checked={selectedWorkers.includes(worker.worker_id)}
                          onCheckedChange={() => toggleWorker(worker.worker_id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{worker.worker_fullname}</p>
                          <p className="text-xs text-gray-500">
                            {worker.profession} • {worker.worker_cellnumber}
                          </p>
                        </div>
                        {assignedWorkers.includes(worker.worker_id) && (
                          <Badge variant="secondary" className="text-xs">
                            Asignado
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{selectedWorkers.length} trabajador(es) seleccionado(s)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAssignModal(false);
                        setTaskToAssign(null);
                        setSelectedWorkers([]);
                        setAssignedWorkers([]);
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveWorkerAssignments}
                      className="flex-1"
                      disabled={assignLoading}
                    >
                      {assignLoading ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-20">
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
                  onEditTask={handleEditTask}
                  onAssignWorkers={handleOpenAssignModal}
                />
              )}

              {/* Pending */}
              {pendingTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Pendientes"
                  tasks={pendingTasks}
                  onEditTask={handleEditTask}
                  onAssignWorkers={handleOpenAssignModal}
                />
              )}

              {/* In Progress */}
              {inProgressTasks.length > 0 && (
                <ScrollableTaskSection
                  title="En progreso"
                  tasks={inProgressTasks}
                  onEditTask={handleEditTask}
                  onAssignWorkers={handleOpenAssignModal}
                />
              )}

              {/* Blocked */}
              {blockedTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Bloqueadas"
                  tasks={blockedTasks}
                  onEditTask={handleEditTask}
                  onAssignWorkers={handleOpenAssignModal}
                />
              )}

              {/* Completed */}
              {completedTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Completadas"
                  tasks={completedTasks}
                  onEditTask={handleEditTask}
                  onAssignWorkers={handleOpenAssignModal}
                />
              )}
            </div>
          )}
        </div>

        {/* Edit Task Modal */}
        <EditTaskModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setTaskToEdit(null);
          }}
          task={taskToEdit}
          onSave={handleSaveTask}
        />

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
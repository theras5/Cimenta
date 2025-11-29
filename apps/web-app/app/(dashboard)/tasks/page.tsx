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
import EditTaskModal from "@/components/EditTaskModal";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const teamMembers = [
  "Juan",
  "Pedro",
  "Maria",
  "Carlos",
  "Ana",
  "Luis",
  "Sofia",
  "Miguel",
  "Carmen",
  "Roberto",
  "Elena",
];

const ScrollableTaskSection = ({
  title,
  tasks,
  changes = false,
  onEditTask,
}: {
  title: string;
  tasks: Task[];
  changes?: boolean;
  onEditTask?: (task: Task) => void;
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
        <TaskSection title={title} tasks={tasks} changes={changes} onEditTask={onEditTask} />
      </div>
    </div>
  );
};

const TasksScreen = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const normalizedRole = role?.toLowerCase() ?? null;
  const isClient = normalizedRole === "client";
  const isAdmin = normalizedRole === "admin";

  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    fetchTasks,
    clearError,
  } = useTasks();

  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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

  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setSelectedSiteId(siteId);
      fetchTasks(siteId);
    } else {
      window.location.href = "/select-site";
    }
  }, [fetchTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const siteId = localStorage.getItem("selectedSiteId");
      if (siteId) {
        setSelectedSiteId(siteId);
        await fetchTasks(siteId);
      }
    } catch (err) {
      console.error("Error refreshing tasks:", err);
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
    if (!roleLoading && !isAdmin) {
      alert("Solo un admin puede crear tareas");
      return;
    }
    setShowModal(false);
    setShowTaskModal(true);
  };

  const handleCreateChange = () => {
    if (!roleLoading && !isClient) {
      alert("Solo un cliente puede crear cambios");
      return;
    }
    setShowModal(false);
    setShowChangeModal(true);
  };

  const handleAddTask = async () => {
    if (newTask.title && newTask.category) {
      try {
        const startIso = newTask.start_date ? new Date(newTask.start_date).toISOString() : undefined;
        const endIso = newTask.end_date ? new Date(newTask.end_date).toISOString() : undefined;

        await createTask({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          category: newTask.category,
          start_date: startIso,
          end_date: endIso,
          user_id: user?.id,
          site_id: selectedSiteId,
        });
        resetTaskForm();
        setShowTaskModal(false);
      } catch (err) {
        console.error("Error creating task:", err);
      }
    }
  };

  const handleAddChange = async () => {
    if (newChange.title && newChange.category) {
      try {
        await createTask({
          title: newChange.title,
          description: newChange.description,
          status: "changes",
          category: newChange.category,
          site_id: selectedSiteId,
          user_id: user?.id,
        });
        resetChangeForm();
        setShowChangeModal(false);
      } catch (err) {
        console.error("Error creating change request:", err);
      }
    }
  };

  const handleOpenCreate = () => {
    if (roleLoading) {
      setShowModal(true);
      return;
    }
    if (isAdmin) {
      setShowTaskModal(true);
      return;
    }
    if (isClient) {
      setShowChangeModal(true);
      return;
    }
    setShowModal(true);
  };

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== member));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowEditModal(true);
  };

  const handleSaveTask = async (id: string, updatedTask: Partial<Task>) => {
    try {
      await updateTask(id, updatedTask);
      setShowEditModal(false);
      setTaskToEdit(null);
      if (selectedSiteId) {
        await fetchTasks(selectedSiteId);
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleApproveChangeStatus = async (id: string) => {
    try {
      await updateTask(id, { status: "pending" });
      setShowEditModal(false);
      setTaskToEdit(null);
      if (selectedSiteId) {
        await fetchTasks(selectedSiteId);
      }
    } catch (err) {
      console.error("Error approving change:", err);
    }
  };

  const handleRejectChangeStatus = async (id: string) => {
    try {
      await updateTask(id, { status: "rejected" });
      setShowEditModal(false);
      setTaskToEdit(null);
      if (selectedSiteId) {
        await fetchTasks(selectedSiteId);
      }
    } catch (err) {
      console.error("Error rejecting change:", err);
    }
  };

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

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>Recargar página</Button>
            <Button variant="outline" onClick={clearError}>
              Intentar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const changes = tasks.filter((task) => task.status === "changes");
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  const currentIsChange = taskToEdit?.status === "changes";
  const canEditCurrent = taskToEdit
    ? roleLoading
      ? false
      : currentIsChange
        ? isClient
        : !isClient
    : false;
  const showApproveReject = !!(taskToEdit && currentIsChange && isAdmin && !roleLoading);
  const createLabel = isClient ? "Nuevo cambio" : "Nueva tarea";

  return (
    <div className="bg-gray-50">
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Tareas ({tasks.length})</h1>
          <Button
            onClick={handleOpenCreate}
            className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6 h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createLabel}
          </Button>
        </div>

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

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">¿Qué quieres crear?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {roleLoading && <p className="text-sm text-gray-500 text-center">Cargando permisos...</p>}

              {!roleLoading && (isAdmin || (!isAdmin && !isClient)) && (
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
                      <div className="text-sm text-gray-600">Crear una nueva tarea para realizar</div>
                    </div>
                  </div>
                </Button>
              )}

              {!roleLoading && (isClient || (!isAdmin && !isClient)) && (
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
                      <div className="text-sm text-gray-600">Solicitar un cambio en el proyecto</div>
                    </div>
                  </div>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showTaskModal}
          onOpenChange={(open) => {
            setShowTaskModal(open);
            if (!open) resetTaskForm();
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Crear Nueva Tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título de la tarea"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <Textarea
                placeholder="Descripción detallada de la tarea"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
              <Select
                value={newTask.category}
                onValueChange={(value) => setNewTask({ ...newTask, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricidad">ELECTRICIDAD</SelectItem>
                  <SelectItem value="pintura">PINTURA</SelectItem>
                  <SelectItem value="plomeria">PLOMERIA</SelectItem>
                  <SelectItem value="construccion">CONSTRUCCION</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newTask.status}
                onValueChange={(value) => setNewTask({ ...newTask, status: value as Task["status"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado inicial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                </SelectContent>
              </Select>

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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Asignar miembros del equipo ({selectedMembers.length} seleccionados)
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
                disabled={!newTask.title || !newTask.category}
              >
                Crear Tarea
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showChangeModal}
          onOpenChange={(open) => {
            setShowChangeModal(open);
            if (!open) resetChangeForm();
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Nueva Solicitud de Cambio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título del cambio"
                value={newChange.title}
                onChange={(e) => setNewChange({ ...newChange, title: e.target.value })}
              />
              <Textarea
                placeholder="Descripción del cambio propuesto"
                value={newChange.description}
                onChange={(e) => setNewChange({ ...newChange, description: e.target.value })}
                rows={3}
              />
              <Select
                value={newChange.category}
                onValueChange={(value) => setNewChange({ ...newChange, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoría afectada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricidad">ELECTRICIDAD</SelectItem>
                  <SelectItem value="pintura">PINTURA</SelectItem>
                  <SelectItem value="plomeria">PLOMERIA</SelectItem>
                  <SelectItem value="construccion">CONSTRUCCION</SelectItem>
                </SelectContent>
              </Select>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Responsables del cambio ({selectedMembers.length} seleccionados)
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
                disabled={!newChange.title || !newChange.category}
              >
                Crear Solicitud de Cambio
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-y-auto px-6 py-20">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No hay tareas aún</h3>
              <p className="text-gray-400 text-center px-6">Crea tu primera tarea usando el botón +</p>
            </div>
          ) : (
            <div className="space-y-6">
              {changes.length > 0 && (
                <ScrollableTaskSection
                  title="Cambios"
                  tasks={changes}
                  changes={true}
                  onEditTask={handleEditTask}
                />
              )}
              {pendingTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Pendientes"
                  tasks={pendingTasks}
                  onEditTask={handleEditTask}
                />
              )}
              {inProgressTasks.length > 0 && (
                <ScrollableTaskSection
                  title="En progreso"
                  tasks={inProgressTasks}
                  onEditTask={handleEditTask}
                />
              )}
              {blockedTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Bloqueadas"
                  tasks={blockedTasks}
                  onEditTask={handleEditTask}
                />
              )}
              {completedTasks.length > 0 && (
                <ScrollableTaskSection
                  title="Completadas"
                  tasks={completedTasks}
                  onEditTask={handleEditTask}
                />
              )}
            </div>
          )}
        </div>

        <EditTaskModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setTaskToEdit(null);
          }}
          task={taskToEdit}
          onSave={handleSaveTask}
          canEdit={canEditCurrent}
          isChange={currentIsChange}
          showApproveReject={showApproveReject}
          onApproveChange={handleApproveChangeStatus}
          onRejectChange={handleRejectChangeStatus}
        />

        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleRefresh}
            size="icon"
            variant="outline"
            className="w-12 h-12 rounded-full bg-white shadow-lg"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TasksScreen;

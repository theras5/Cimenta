// @ts-nocheck
import { Category } from "@/components/TaskCard";
import { QuickDateSelector } from "@/components/QuickDateSelector";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTask } from "@/hooks/useTasks";
import { Task, ISODateString } from "@/services/taskService";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkers } from "@/hooks/useWorkers";
import { useAssignedTo } from "@/hooks/useAssignedTo";
import { useAuth } from "@/context/AuthContext";


// Categories with hex colors matching teamCalendar
const electricidad: Category = { name: "electricidad", color: '#007AFF' };
const plomeria: Category = { name: "plomeria", color: '#FF9500' };
const construccion: Category = { name: "construccion", color: '#8A2BE2' };
const pintura: Category = { name: "pintura", color: '#FF2D92' };
const categories: Category[] = [electricidad, plomeria, construccion, pintura];

// Mock data for team members
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

const teamMembers: TeamMember[] = [
  { id: "1", name: "Juan Pérez", role: "Electricista", avatar: "👨‍🔧" },
  { id: "2", name: "María García", role: "Plomera", avatar: "👩‍🔧" },
  { id: "3", name: "Carlos López", role: "Constructor", avatar: "👨‍🏭" },
  { id: "4", name: "Ana Martínez", role: "Pintora", avatar: "👩‍🎨" },
  { id: "5", name: "Luis Rodríguez", role: "Supervisor", avatar: "👨‍💼" },
  { id: "6", name: "Sofia Hernández", role: "Arquitecta", avatar: "👩‍💼" },
];

// Mock tasks data - in a real app, this would come from your backend or storage
const mockTasks = [
  {
    id: "1",
    title: "Instalar cableado",
    description: "Faltan todavía 10 metros de cable de cobre",
    category: "ELECTRICIDAD",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    start_date: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedMembers: ["1", "3", "5"], // IDs of team members
    mediaFiles: [],
    status: "pending",
  },
  {
    id: "2",
    title: "Tubería cocina",
    description: "Definir planos con la arquitecta",
    category: "PLOMERÍA",
    categoryColor: "bg-orange-500",
    bgColor: "bg-orange-100",
    start_date: new Date(),
    end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    assignedMembers: ["2", "6"],
    mediaFiles: [],
    status: "in_progress",
  },
  // Add more mock tasks as needed
];

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  // Usa el hook useTask para cargar la tarea desde el backend
  const {
    task: taskData,
    isLoading,
    error,
    updateTask,
    deleteTask,
  } = useTask(id);
  const { role, loading: roleLoading } = useUserRole();
  const normalizedRole = role?.toLowerCase() ?? null;
  const isClient = normalizedRole === "client";

  const { workers, isLoading: loadingWorkers } = useWorkers(user?.id);
  const {
    assignWorkerToTask,
    unassignWorkerFromTask,
    getWorkersByTask,
    isLoading: assignLoading,
  } = useAssignedTo();

  // Estados para el modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [selectedWorkersForAssign, setSelectedWorkersForAssign] = useState<string[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<
    "changes" | "pending" | "in_progress" | "completed" | "blocked" | "rejected"
  >("pending");
  
  useEffect(() => {
    if (isClient && isEditing) {
      setIsEditing(false);
    }
  }, [isClient, isEditing]);
  

  // Estados para controlar los pickers - ya no necesarios con QuickDateSelector

  // Load task data
  useEffect(() => {
    if (taskData) {

      setTask(taskData);
      setTitle(taskData.title);
      setDescription(taskData.description || "");
      setCategory(taskData.category);
      setSelectedStatus(taskData.status);

      // Usar el nombre correcto según tu API (camelCase o snake_case)
      const startDateValue = taskData.start_date;
      const endDateValue = taskData.end_date;

      // Manejar fecha de inicio
      if (startDateValue) {
        try {
          const parsedStartDate = new Date(startDateValue);
          if (!isNaN(parsedStartDate.getTime())) {
            setStartDate(parsedStartDate);
          } else {
            // Fecha inválida - usar null
            setStartDate(null);
          }
        } catch (error) {
          console.error("Error al parsear fecha de inicio:", error);
          setStartDate(null);
        }
      } else {
        // No hay fecha definida
        setStartDate(null);
      }

      // Manejar fecha de fin
      if (endDateValue) {
        try {
          const parsedEndDate = new Date(endDateValue);
          if (!isNaN(parsedEndDate.getTime())) {
            setEndDate(parsedEndDate);
          } else {
            // Fecha inválida - usar null
            setEndDate(null);
          }
        } catch (error) {
          console.error("Error al parsear fecha de fin:", error);
          setEndDate(null);
        }
      } else {
        // No hay fecha definida
        setEndDate(null);
      }
    }
  }, [taskData]);

  useEffect(() => {
    if (task?.id) {
      loadAssignedWorkers();
    }
  }, [task?.id]);

  const loadAssignedWorkers = async () => {
    if (!task?.id) return;

    try {
      const assigned = await getWorkersByTask(task.id);
      const workerIds = assigned.map(a => a.worker_id);
      setAssignedWorkers(workerIds);
      setSelectedWorkersForAssign(workerIds);
    } catch (error) {
      console.error("Error cargando workers asignados:", error);
    }
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkersForAssign(prev => {
      if (prev.includes(workerId)) {
        return prev.filter(id => id !== workerId);
      }
      return [...prev, workerId];
    });
  };

  const handleSaveWorkerAssignments = async () => {
    if (!task?.id) return;

    try {
      // Workers a agregar
      const workersToAdd = selectedWorkersForAssign.filter(
        id => !assignedWorkers.includes(id)
      );

      // Workers a remover
      const workersToRemove = assignedWorkers.filter(
        id => !selectedWorkersForAssign.includes(id)
      );

      // Agregar nuevos
      for (const workerId of workersToAdd) {
        await assignWorkerToTask(workerId, task.id);
      }

      // Remover deseleccionados
      for (const workerId of workersToRemove) {
        await unassignWorkerFromTask(workerId, task.id);
      }

      // Actualizar estado local
      setAssignedWorkers(selectedWorkersForAssign);
      setShowAssignModal(false);

      Alert.alert("Éxito", "Trabajadores asignados correctamente");
    } catch (error) {
      console.error("Error guardando asignaciones:", error);
      Alert.alert("Error", "No se pudieron asignar los trabajadores");
    }
  };

  // Muestra un indicador de carga mientras se obtienen los datos
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text>Cargando tarea...</Text>
      </SafeAreaView>
    );
  }

  // Muestra un mensaje de error si hay problemas al cargar la tarea
  if (error || !task) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-red-500 text-lg font-medium mt-4 text-center">
          Error al cargar la tarea
        </Text>
        <Text className="text-gray-500 text-center mt-2 mb-4">
          {error || "No se pudo encontrar la tarea solicitada"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Format date function with time
  const formatDate = (date: Date | null) => {
    if (!date) return "No definida";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Simple date manipulation functions
  const incrementStartDate = () => {
    if (startDate) {
      const newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + 1);
      setStartDate(newDate);
      if (endDate && newDate > endDate) {
        setEndDate(newDate);
      }
    }
  };

  const decrementStartDate = () => {
    if (startDate) {
      const newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() - 1);
      setStartDate(newDate);
      if (endDate && newDate > endDate) {
        setEndDate(newDate);
      }
    }
  };

  const incrementEndDate = () => {
    if (endDate) {
      const newDate = new Date(endDate);
      newDate.setDate(newDate.getDate() + 1);
      setEndDate(newDate);
    }
  };

  const decrementEndDate = () => {
    if (endDate && startDate) {
      const newDate = new Date(endDate);
      newDate.setDate(newDate.getDate() - 1);
      if (newDate >= startDate) {
        setEndDate(newDate);
      }
    }
  };



  // Helper para obtener el color de la categoría
  const getCategoryColor = (categoryName: string) => {
    const normalizedCategory = categoryName?.toLowerCase();
    const category = categories.find((cat) => cat.name.toLowerCase() === normalizedCategory);
    return category?.color || '#999999';
  };

  const handleSaveChanges = async () => {
    if (isClient) {
      Alert.alert("Solo lectura", "No tienes permiso para editar esta tarea");
      return;
    }

    try {
      // Función para formatear fechas con horarios incluidos
      const formatDateTime = (date: Date | null) => {
        if (!date) return undefined;
        return date.toISOString();
      };

      const updatedData = {
        title,
        description,
        category,
        start_date: formatDateTime(startDate),
        end_date: formatDateTime(endDate),
        status: selectedStatus,
      };



      // Llama al método updateTask
      const result = await updateTask(updatedData);

      if (result) {
        // Actualiza el estado local con los datos actualizados
        setTask(result);
        setIsEditing(false);
        Alert.alert("Éxito", "Tarea actualizada correctamente");
      } else {
        throw new Error("Error al actualizar la tarea");
      }
    } catch (error) {
      console.error("Error al guardar los cambios:", error);
      Alert.alert("Error", "No se pudo actualizar la tarea");
    }
  };

  const handleDelete = () => {
    if (isClient) {
      Alert.alert("Solo lectura", "No tienes permiso para eliminar esta tarea");
      return;
    }

    Alert.alert(
      "Eliminar tarea",
      "¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTask();
              if (success) {
                Alert.alert("Éxito", "La tarea ha sido eliminada");
                router.back();
              } else {
                throw new Error("No se pudo eliminar la tarea");
              }
            } catch (error) {
              console.error("Error al eliminar la tarea:", error);
              Alert.alert("Error", "No se pudo eliminar la tarea");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">
            {isEditing ? "Editar Tarea" : "Detalles de Tarea"}
          </Text>
        </View>

        {/* Edit/Save Button */}
        {!roleLoading && !isClient && (
          isEditing ? (
            <TouchableOpacity
              onPress={handleSaveChanges}
              className="bg-blue-500 px-4 py-2 rounded-full"
            >
              <Text className="text-white font-medium">Guardar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="bg-blue-500 px-4 py-2 rounded-full"
            >
              <Text className="text-white font-medium">Editar</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Status Badge */}
        <View className="mb-4 flex-row justify-center">
          <View
            className={`px-3 py-1 rounded-full ${task.status === "pending"
                ? "bg-yellow-500"
                : task.status === "in_progress"
                  ? "bg-blue-500"
                  : task.status === "blocked"
                    ? "bg-orange-500"
                    : task.status === "rejected"
                      ? "bg-red-500"
                      : task.status === "changes"
                        ? "bg-purple-500"
                        : "bg-green-500"
              }`}
          >
            <Text className="text-white text-sm font-medium">
              {task.status === "pending"
                ? "Pendiente"
                : task.status === "in_progress"
                  ? "En progreso"
                  : task.status === "blocked"
                    ? "Bloqueado"
                    : task.status === "rejected"
                      ? "Rechazado"
                      : task.status === "changes"
                        ? "Cambios"
                        : "Completado"}
            </Text>
          </View>
        </View>

        {/* Estado (solo en modo edición) */}
        {isEditing && (
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Estado</Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => setSelectedStatus("pending")}
                className={`px-3 py-2 rounded-full ${selectedStatus === "pending"
                    ? "bg-yellow-500"
                    : "bg-yellow-100"
                  }`}
                activeOpacity={1}
              >
                <Text
                  className={`${selectedStatus === "pending" ? "text-white" : "text-yellow-800"}`}
                >
                  Pendiente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("in_progress")}
                className={`px-3 py-2 rounded-full ${selectedStatus === "in_progress"
                    ? "bg-blue-500"
                    : "bg-blue-100"
                  }`}
                activeOpacity={1}
              >
                <Text
                  className={`${selectedStatus === "in_progress" ? "text-white" : "text-blue-800"}`}
                >
                  En progreso
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("completed")}
                className={`px-3 py-2 rounded-full ${selectedStatus === "completed"
                    ? "bg-green-500"
                    : "bg-green-100"
                  }`}
                activeOpacity={1}
              >
                <Text
                  className={`${selectedStatus === "completed" ? "text-white" : "text-green-800"}`}
                >
                  Completado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("blocked")}
                className={`px-3 py-2 rounded-full ${selectedStatus === "blocked" ? "bg-orange-500" : "bg-orange-100"
                  }`}
                activeOpacity={1}
              >
                <Text
                  className={`${selectedStatus === "blocked" ? "text-white" : "text-orange-800"}`}
                >
                  Bloqueado
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Título */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Título</Text>
          {isEditing ? (
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="bg-white p-4 rounded-xl border border-gray-200"
            />
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-gray-800">{title}</Text>
            </View>
          )}
        </View>

        {/* Descripción */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripción</Text>
          {isEditing ? (
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              className="bg-white p-4 rounded-xl border border-gray-200 h-24"
              textAlignVertical="top"
            />
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200 min-h-[96px]">
              <Text className="text-gray-800">{description}</Text>
            </View>
          )}
        </View>

        {/* Categoría */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Categoría</Text>
          {isEditing ? (
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => setCategory(cat.name)}
                    className="px-3 py-2 rounded-full"
                    style={{
                      backgroundColor: isSelected ? cat.color : '#E5E7EB'
                    }}
                    activeOpacity={0.9}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? "text-white" : "text-gray-800"
                        }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="flex-row">
              <View
                className="px-3 py-2 rounded-full"
                style={{ backgroundColor: getCategoryColor(category) }}
              >
                <Text className="text-white text-xs font-medium">
                  {category}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Fechas */}
        {isEditing ? (
          <>
            <QuickDateSelector
              date={startDate}
              onDateChange={(date) => {
                setStartDate(date);
                if (endDate && date > endDate) {
                  setEndDate(date);
                }
              }}
              label="Fecha de inicio"
              minimumDate={new Date()}
              placeholder="Seleccionar fecha de inicio"
            />

            <QuickDateSelector
              date={endDate}
              onDateChange={setEndDate}
              label="Fecha de finalización"
              minimumDate={startDate || new Date()}
              placeholder="Seleccionar fecha de finalización"
            />
          </>
        ) : (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Fecha de inicio
              </Text>
              <View className="bg-white p-4 rounded-xl border border-gray-200">
                <Text
                  className={`${!startDate ? "text-gray-400 italic" : "text-gray-800"}`}
                >
                  {formatDate(startDate)}
                </Text>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Fecha de fin</Text>
              <View className="bg-white p-4 rounded-xl border border-gray-200">
                <Text
                  className={`${!endDate ? "text-gray-400 italic" : "text-gray-800"}`}
                >
                  {formatDate(endDate)}
                </Text>
              </View>
            </View>
          </>
        )}

        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-medium">
              Trabajadores asignados ({assignedWorkers.length})
            </Text>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setShowAssignModal(true)}
                className="bg-blue-500 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs font-medium">
                  {assignedWorkers.length > 0 ? 'Reasignar' : 'Asignar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {assignedWorkers.length > 0 ? (
            <View className="space-y-2">
              {workers
                .filter(w => assignedWorkers.includes(w.worker_id))
                .map((worker) => (
                  <View
                    key={worker.worker_id}
                    className="bg-white flex-row items-center p-3 rounded-xl border border-gray-200"
                  >
                    <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <Text className="text-blue-600 font-bold text-lg">
                        {worker.worker_fullname.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-800 font-medium">
                        {worker.worker_fullname}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {worker.profession}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View className="bg-gray-100 p-4 rounded-xl items-center">
              <Ionicons name="people-outline" size={32} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">
                No hay trabajadores asignados
              </Text>
            </View>
          )}
        </View>

        {/* Botón de eliminación */}
        {!roleLoading && !isClient && (
          <View className="mb-8 mt-6 px-4">
            <TouchableOpacity
              onPress={handleDelete}
              className="bg-red-500 py-4 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text className="text-white font-medium text-base ml-2">
                Eliminar tarea
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>



      {/* Modal de Asignación de Workers */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
            {/* Header del Modal */}
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-xl font-bold">Asignar Trabajadores</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Lista de Workers */}
            <ScrollView
              className="px-4 py-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {loadingWorkers ? (
                <View className="py-12 items-center">
                  <Text className="text-gray-500">Cargando trabajadores...</Text>
                </View>
              ) : workers.length === 0 ? (
                <View className="py-12 items-center">
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-4 text-center">
                    No tienes trabajadores registrados
                  </Text>
                </View>
              ) : (
                workers.map((worker) => {
                  const isSelected = selectedWorkersForAssign.includes(worker.worker_id);
                  return (
                    <TouchableOpacity
                      key={worker.worker_id}
                      onPress={() => toggleWorkerSelection(worker.worker_id)}
                      className="flex-row items-center p-4 mb-3 bg-gray-50 rounded-2xl"
                      activeOpacity={0.7}
                    >
                      {/* Checkbox */}
                      <View
                        className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300 bg-white"
                          }`}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="white" />
                        )}
                      </View>

                      {/* Avatar */}
                      <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mr-3">
                        <Text className="text-blue-600 font-bold text-lg">
                          {worker.worker_fullname.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text className="text-gray-800 font-semibold text-base">
                          {worker.worker_fullname}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {worker.profession}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                          {worker.worker_cellnumber}
                        </Text>
                      </View>

                      {/* Indicador visual si está asignado */}
                      {assignedWorkers.includes(worker.worker_id) && (
                        <View className="bg-blue-100 px-2 py-1 rounded-full ml-2">
                          <Text className="text-blue-600 text-xs font-medium">
                            Asignado
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer con botones */}
            <View className="p-4 border-t border-gray-200 bg-white">
              <View className="bg-blue-50 px-4 py-2 rounded-xl mb-3">
                <Text className="text-blue-600 text-sm font-medium text-center">
                  {selectedWorkersForAssign.length} trabajador{selectedWorkersForAssign.length !== 1 ? 'es' : ''} seleccionado{selectedWorkersForAssign.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View className="flex-row gap-3 pb-10">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedWorkersForAssign(assignedWorkers);
                    setShowAssignModal(false);
                  }}
                  className="flex-1 bg-gray-200 py-4 rounded-xl"
                  activeOpacity={0.7}
                >
                  <Text className="text-center font-semibold text-gray-800 text-base">
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveWorkerAssignments}
                  className={`flex-1 py-4 rounded-xl ${assignLoading ? "bg-blue-400" : "bg-blue-500"
                    }`}
                  disabled={assignLoading}
                  activeOpacity={0.7}
                >
                  <Text className="text-center font-semibold text-white text-base">
                    {assignLoading ? "Guardando..." : "Guardar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

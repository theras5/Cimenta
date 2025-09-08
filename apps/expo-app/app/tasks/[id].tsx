import { Category } from "@/components/TaskCard";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTask } from "@/hooks/useTasks";

// Reuse the mock data from new-task.tsx
const electricidad: Category = { name: "ELECTRICIDAD", color: "bg-blue-500" };
const plomeria: Category = { name: "PLOMERIA", color: "bg-orange-500" };
const construccion: Category = { name: "CONSTRUCCIÓN", color: "bg-gray-500" };
const pintura: Category = { name: "PINTURA", color: "bg-pink-500" };
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
    startDate: new Date(),
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
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    assignedMembers: ["2", "6"],
    mediaFiles: [],
    status: "in_progress",
  },
  // Add more mock tasks as needed
];

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [task, setTask] = useState<any>(null);

  // Usa el hook useTask para cargar la tarea desde el backend
  const {
    task: taskData,
    isLoading,
    error,
    updateTask,
    deleteTask,
  } = useTask(id);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState<
    "pending" | "in_progress" | "completed" | "blocked"
  >("pending");

  // Load task data
  useEffect(() => {
    if (taskData) {
      console.log("Datos recibidos:", taskData); // Para depurar
      setTask(taskData);
      setTitle(taskData.title);
      setDescription(taskData.description || "");
      setCategory(taskData.category);
      setSelectedStatus(taskData.status);

      // Usar el nombre correcto según tu API (camelCase o snake_case)
      const startDateValue = taskData.startDate;
      const endDateValue = taskData.endDate;

      // Manejar fecha de inicio
      if (startDateValue) {
        try {
          const parsedStartDate = new Date(startDateValue);
          if (!isNaN(parsedStartDate.getTime())) {
            setStartDate(parsedStartDate);
            setTempStartDate(parsedStartDate);
          } else {
            // Fecha inválida - usar null
            setStartDate(null);
            setTempStartDate(new Date());
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
            setTempEndDate(parsedEndDate);
          } else {
            // Fecha inválida - usar null
            setEndDate(null);
            setTempEndDate(new Date());
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

  // Format date function
  const formatDate = (date: Date | null) => {
    if (!date) return "No definida";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date picker handlers
  const handleStartDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      const currentDate = selectedDate || startDate;
      setShowStartDatePicker(false);
      setStartDate(currentDate);
    } else if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      const currentDate = selectedDate || endDate;
      setShowEndDatePicker(false);
      setEndDate(currentDate);
    } else if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setStartDate(tempStartDate);
    setShowStartDatePicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(tempEndDate);
    setShowEndDatePicker(false);
  };

  const cancelDateSelection = (isStartDate: boolean) => {
    if (isStartDate) {
      setShowStartDatePicker(false);
    } else {
      setShowEndDatePicker(false);
    }
  };

  // Helper para obtener el color de la categoría
  const getCategoryColor = (categoryName: string) => {
    const normalizedCategory = categoryName?.toUpperCase();
    const category = categories.find((cat) => cat.name === normalizedCategory);
    return category?.color || "bg-gray-500";
  };

  const handleSaveChanges = async () => {
    try {
      // Función para formatear fechas correctamente
      const formatDate = (date: Date | null) => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const updatedData = {
        title,
        description,
        category,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        status: selectedStatus,
      };

      console.log("Datos a enviar:", updatedData);

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
        {isEditing ? (
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
        )}
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Status Badge */}
        <View className="mb-4 flex-row justify-center">
          <View
            className={`px-3 py-1 rounded-full ${
              task.status === "pending"
                ? "bg-yellow-500"
                : task.status === "in_progress"
                  ? "bg-blue-500"
                  : task.status === "blocked"
                    ? "bg-red-500"
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
                className={`px-3 py-2 rounded-full ${
                  selectedStatus === "pending"
                    ? "bg-yellow-500"
                    : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`${selectedStatus === "pending" ? "text-white" : "text-yellow-800"}`}
                >
                  Pendiente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("in_progress")}
                className={`px-3 py-2 rounded-full ${
                  selectedStatus === "in_progress"
                    ? "bg-blue-500"
                    : "bg-blue-100"
                }`}
              >
                <Text
                  className={`${selectedStatus === "in_progress" ? "text-white" : "text-blue-800"}`}
                >
                  En progreso
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("completed")}
                className={`px-3 py-2 rounded-full ${
                  selectedStatus === "completed"
                    ? "bg-green-500"
                    : "bg-green-100"
                }`}
              >
                <Text
                  className={`${selectedStatus === "completed" ? "text-white" : "text-green-800"}`}
                >
                  Completado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedStatus("blocked")}
                className={`px-3 py-2 rounded-full ${
                  selectedStatus === "blocked" ? "bg-red-500" : "bg-red-100"
                }`}
              >
                <Text
                  className={`${selectedStatus === "blocked" ? "text-white" : "text-red-800"}`}
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
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setCategory(cat.name)}
                  className={`px-3 py-2 rounded-full ${
                    category === cat.name ? cat.color : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      category === cat.name ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-row">
              <View
                className={`${getCategoryColor(category)} px-3 py-2 rounded-full`}
              >
                <Text className="text-white text-xs font-medium">
                  {category}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Fechas */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">
            Fecha de inicio
          </Text>
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "ios") {
                    setTempStartDate(startDate || new Date());
                  }
                  setShowStartDatePicker(true);
                }}
                className="bg-white flex-row items-center justify-between p-4 rounded-xl border border-gray-200"
              >
                <Text className="text-gray-800">{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#374151" />
              </TouchableOpacity>

              {Platform.OS === "ios" && showStartDatePicker ? (
                <View className="bg-white mt-2 rounded-xl border border-gray-200 overflow-hidden">
                  <View className="flex-row justify-between items-center border-b border-gray-200 px-4 py-2">
                    <TouchableOpacity onPress={() => cancelDateSelection(true)}>
                      <Text className="text-red-500 font-medium">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmStartDate}>
                      <Text className="text-blue-500 font-medium">OK</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="items-center py-2">
                    <DateTimePicker
                      value={tempStartDate}
                      mode="date"
                      display="inline"
                      onChange={handleStartDateChange}
                      minimumDate={new Date()}
                      style={{ width: "100%", height: 200 }}
                    />
                  </View>
                </View>
              ) : null}

              {Platform.OS === "android" && showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
              )}
            </>
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text
                className={`${!startDate ? "text-gray-400 italic" : "text-gray-800"}`}
              >
                {formatDate(startDate)}
              </Text>
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Fecha de fin</Text>
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "ios") {
                    setTempEndDate(endDate || new Date());
                  }
                  setShowEndDatePicker(true);
                }}
                className="bg-white flex-row items-center justify-between p-4 rounded-xl border border-gray-200"
              >
                <Text className="text-gray-800">{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#374151" />
              </TouchableOpacity>

              {Platform.OS === "ios" && showEndDatePicker ? (
                <View className="bg-white mt-2 rounded-xl border border-gray-200 overflow-hidden">
                  <View className="flex-row justify-between items-center border-b border-gray-200 px-4 py-2">
                    <TouchableOpacity
                      onPress={() => cancelDateSelection(false)}
                    >
                      <Text className="text-red-500 font-medium">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmEndDate}>
                      <Text className="text-blue-500 font-medium">OK</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="items-center py-2">
                    <DateTimePicker
                      value={tempEndDate}
                      mode="date"
                      display="inline"
                      onChange={handleEndDateChange}
                      minimumDate={startDate || undefined}
                      style={{ width: "100%", height: 200 }}
                    />
                  </View>
                </View>
              ) : null}

              {Platform.OS === "android" && showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                  minimumDate={startDate || undefined}
                />
              )}
            </>
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text
                className={`${!endDate ? "text-gray-400 italic" : "text-gray-800"}`}
              >
                {formatDate(endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Miembros asignados */}
        {/* <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">
            Miembros asignados ({selectedMembers.length})
          </Text>
          <View className="space-y-2">
            {selectedMembers.map((member) => (
              <View
                key={member.id}
                className="bg-white flex-row items-center p-3 rounded-xl border border-gray-200"
              >
                <Text className="text-2xl mr-3">{member.avatar}</Text>
                <View>
                  <Text className="text-gray-800 font-medium">
                    {member.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View> */}

        {/* Botón de eliminación */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

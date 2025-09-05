import { Category } from "@/components/TaskCard";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
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
    status: "pending"
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
    status: "in-progress"
  },
  // Add more mock tasks as needed
];

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [task, setTask] = useState<any>(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  
  // Load task data
  useEffect(() => {
    // In a real app, fetch from API or local storage
    const foundTask = mockTasks.find(task => task.id === id);
    
    if (foundTask) {
      setTask(foundTask);
      setTitle(foundTask.title);
      setDescription(foundTask.description);
      setCategory(foundTask.category);
      setStartDate(new Date(foundTask.startDate));
      setEndDate(new Date(foundTask.endDate));
      
      // Find team members
      const members = foundTask.assignedMembers.map(
        memberId => teamMembers.find(member => member.id === memberId)
      ).filter(Boolean) as TeamMember[];
      
      setSelectedMembers(members);
    }
  }, [id]);

  if (!task) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text>Cargando tarea...</Text>
      </SafeAreaView>
    );
  }

  // Format date function
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const handleSaveChanges = () => {
    // In a real app, update the task in your storage or backend
    const updatedTask = {
      ...task,
      title,
      description,
      category,
      startDate,
      endDate,
      assignedMembers: selectedMembers.map(member => member.id)
    };
    
    console.log("Guardando cambios:", updatedTask);
    setTask(updatedTask);
    setIsEditing(false);
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
              task.status === 'pending' ? 'bg-yellow-500' : 
              task.status === 'in-progress' ? 'bg-blue-500' :
              task.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'
            }`}
          >
            <Text className="text-white text-sm font-medium">
              {task.status === 'pending' ? 'Pendiente' : 
               task.status === 'in-progress' ? 'En progreso' :
               task.status === 'blocked' ? 'Bloqueado' : 'Completado'}
            </Text>
          </View>
        </View>

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
              <View className={`${task.categoryColor} px-3 py-2 rounded-full`}>
                <Text className="text-white text-xs font-medium">{category}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Fechas */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Fecha de inicio</Text>
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "ios") {
                    setTempStartDate(startDate);
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
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
              )}
            </>
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-gray-800">{formatDate(startDate)}</Text>
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
                    setTempEndDate(endDate);
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
                    <TouchableOpacity onPress={() => cancelDateSelection(false)}>
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
                      minimumDate={startDate}
                      style={{ width: "100%", height: 200 }}
                    />
                  </View>
                </View>
              ) : null}

              {Platform.OS === "android" && showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                  minimumDate={startDate}
                />
              )}
            </>
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-gray-800">{formatDate(endDate)}</Text>
            </View>
          )}
        </View>

        {/* Miembros asignados */}
        <View className="mb-4">
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
                  <Text className="text-gray-800 font-medium">{member.name}</Text>
                  <Text className="text-gray-500 text-sm">{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
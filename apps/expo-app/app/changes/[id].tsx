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
import * as ImagePicker from 'expo-image-picker';
import { useTask } from "@/hooks/useTasks"; // Importamos el hook para obtener los datos reales

// Reuse the same categories from task-detail.tsx
const electricidad: Category = { name: "Electricidad", color: "bg-blue-500" };
const plomeria: Category = { name: "Plomeria", color: "bg-orange-500" };
const construccion: Category = { name: "Construccion", color: "bg-gray-500" };
const pintura: Category = { name: "Pintura", color: "bg-pink-500" };
const categories: Category[] = [electricidad, plomeria, construccion, pintura];

// Mock data for change request
interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  images: string[];
  createdAt: Date;
  taskId?: string;
}

const mockChangeRequest: ChangeRequest = {
  id: "1",
  title: "Cambio de materiales",
  description: "Se necesita cambiar el tipo de cable por uno de mayor calibre",
  category: "ELECTRICIDAD",
  status: "pending",
  images: [],
  createdAt: new Date(),
  taskId: "1",
};

export default function ChangeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);

  // Usa el hook useTask para obtener los datos reales de la tarea/cambio
  const { task, isLoading: taskLoading, error: taskError, updateTask, refetch: fetchTask, deleteTask } = useTask(id);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carga los datos del cambio usando el hook useTask
  useEffect(() => {
    if (task) {
      // Convertir el objeto task a nuestro formato ChangeRequest
      const change: ChangeRequest = {
        id: task.id,
        title: task.title,
        description: task.description || "",
        category: task.category,
        status: task.status as any,
        images: task.mediaFiles || [],
        createdAt: task.startDate ? new Date(task.startDate) : new Date(),
        taskId: task.id || undefined  // Usamos el ID de la tarea actual como relación
      };
      
      setChangeRequest(change);
      setTitle(change.title);
      setDescription(change.description);
      setCategory(change.category);
      setImages(change.images);
    /* } else if (id && !taskLoading && !taskError) {
      // Fallback a datos de ejemplo si no hay tarea pero tampoco hay error
      setChangeRequest(mockChangeRequest);
      setTitle(mockChangeRequest.title);
      setDescription(mockChangeRequest.description);
      setCategory(mockChangeRequest.category);
      setImages(mockChangeRequest.images); */
    } else if (id && !taskLoading && taskError) {
      // Si hay error, mostrar alerta
      Alert.alert("Error", "No se pudo cargar la solicitud de cambio");
    } /* else if (!id) {
      // Creando nueva solicitud de cambio
      setTitle("Ej: Cambio de materiales");
      setDescription("");
      setCategory("ELECTRICIDAD");
      setImages([]);
      setIsEditing(true);
    } */
  }, [id, task, taskLoading, taskError]);

  // Helper para obtener el color de la categoría
  const getCategoryColor = (categoryName: string) => {
    const normalizedCategory = categoryName?.toUpperCase();
    const category = categories.find((cat) => cat.name.toUpperCase() === normalizedCategory);
    return category?.color || "bg-gray-500";
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSaveChanges = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
      return;
    }

    try {
      setIsLoading(true);
      
      const changeData = {
        title: title.trim(),
        description: description.trim(),
        category,
        // mediaFiles: images,  // Usando mediaFiles para compatibilidad con la API de tareas
        // Mantener otros campos que podrían ser requeridos por la API
        // status: taskStatus,
        // startDate: task?.startDate || new Date().toISOString(),
        // endDate: task?.endDate || new Date().toISOString(),
      };

      console.log("Datos del cambio a enviar:", changeData);

      // Si tenemos acceso a la API y el hook updateTask, úsalo
      if (id && updateTask) {
        console.log("Intentando actualizar cambio con ID:", id);
        // En useTasks.ts el método updateTask ya recibe el ID como argumento cuando se crea el hook
        // Por eso aquí solo pasamos los datos a actualizar
        const result = await updateTask(changeData);
        
        if (result) {
          console.log("Actualización exitosa:", result);
          
          // Actualizar el estado local con los nuevos datos
          setChangeRequest({
            ...changeRequest!,
            title: title.trim(),
            description: description.trim(),
            category,
            images
          });
          
          // Actualizar los datos obteniendo la versión más reciente de la API
          console.log("Refrescando datos desde la API...");
          await fetchTask();
          console.log("Datos actualizados después de fetchTask:", task);
          
          setIsEditing(false);
          Alert.alert("Éxito", "Solicitud de cambio guardada correctamente");
        } else {
          console.error("updateTask devolvió null o undefined");
          throw new Error("No se pudo actualizar el cambio");
        }
      } else {
        console.log("Modo demo: sin API o updateTask");
        // Para demo si no hay API conectada
        setTimeout(() => {
          setChangeRequest({
            ...changeRequest!,
            title: title.trim(),
            description: description.trim(),
            category,
            images
          });
          setIsEditing(false);
          Alert.alert("Éxito", "Solicitud de cambio guardada correctamente (modo demo)");
        }, 1000);
      }
    } catch (error) {
      console.error("Error al guardar los cambios:", error);
      Alert.alert("Error", "No se pudo guardar la solicitud de cambio");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveChange = () => {
    Alert.alert(
      "Aprobar cambio",
      "¿Estás seguro de que quieres aprobar esta solicitud de cambio? Se convertirá en una tarea pendiente.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Aprobar",
          style: "default",
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log("Convirtiendo cambio a tarea pendiente...");
              
              if (id && updateTask) {
                // Cambiamos el estado del cambio a 'pending' para convertirlo en una tarea pendiente
                const result = await updateTask({
                  status: 'pending',
                });
                
                if (result) {
                  console.log("Cambio convertido exitosamente a tarea:", result);
                  Alert.alert("Éxito", "Solicitud de cambio aprobada y convertida a tarea pendiente");
                  router.back();
                } else {
                  throw new Error("No se pudo convertir el cambio a tarea pendiente");
                }
              } else {
                // Modo demo si no hay API
                console.log("Modo demo: simulando conversión a tarea pendiente");
                setTimeout(() => {
                  Alert.alert("Éxito", "Solicitud de cambio aprobada y convertida a tarea pendiente (modo demo)");
                  router.back();
                }, 1000);
              }
            } catch (error) {
              console.error("Error al aprobar el cambio:", error);
              Alert.alert("Error", "No se pudo aprobar la solicitud de cambio");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectChange = () => {
    Alert.alert(
      "Rechazar tarea",
      "¿Estás seguro de que quieres rechazar esta tarea? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteTask();
              if (success) {
                Alert.alert("Éxito", "La tarea ha sido rechazada");
                router.back();
              } else {
                throw new Error("No se pudo rechazar la tarea");
              }
            } catch (error) {
              console.error("Error al rechazar la tarea:", error);
              Alert.alert("Error", "No se pudo rechazar la tarea");
            }
          },
        },
      ]
    );
  };

  // Función para alternar entre modos de edición y vista
  const toggleEditMode = () => {
    // Si estamos saliendo del modo de edición, restaurar valores originales
    if (isEditing && changeRequest) {
      setTitle(changeRequest.title);
      setDescription(changeRequest.description);
      setCategory(changeRequest.category);
      setImages(changeRequest.images);
    }
    setIsEditing(!isEditing);
  };
  
  // Esta es la función que renderiza todo el componente
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
            Detalles de solicitud
          </Text>
        </View>

        {/* Edit Button (only show if not creating new and not loading) */}
        {id && !taskLoading && (
          <TouchableOpacity
            onPress={toggleEditMode}
            className="bg-blue-500 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-medium">
              {isEditing ? "Cancelar" : "Editar"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Contenido principal - Renderizar según el estado */}
      {taskLoading ? (
        // Estado de carga
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 mb-4">Cargando datos del cambio...</Text>
        </View>
      ) : taskError ? (
        // Error al cargar
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-red-500 text-lg font-medium mt-2">Error al cargar los datos</Text>
          <Text className="text-gray-600 text-center mt-2">{taskError}</Text>
          <TouchableOpacity 
            className="mt-4 bg-blue-500 px-4 py-2 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white">Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Contenido normal - datos cargados
        <ScrollView className="flex-1 px-4">
        {/* Status Badge */}
        <View className="mb-4 flex-row justify-center">
          <View className={`${
            task?.status === "changes" ? "bg-orange-500" : 
            task?.status === "pending" ? "bg-yellow-500" : 
            changeRequest?.status === "approved" ? "bg-green-500" :
            changeRequest?.status === "rejected" ? "bg-red-500" :
            "bg-gray-500"} px-3 py-1 rounded-full`}>
            <Text className="text-white text-sm font-medium">
              {task?.status === "changes" ? "Cambios" : 
               task?.status === "pending" ? "Pendiente" : 
               changeRequest?.status === "approved" ? "Aprobado" :
               changeRequest?.status === "rejected" ? "Rechazado" :
               "Estado Desconocido"}
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
              placeholder="Ej: Cambio de materiales"
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
              placeholder="Describe los detalles del cambio..."
              className="bg-white p-4 rounded-xl border border-gray-200 h-24"
              textAlignVertical="top"
            />
          ) : (
            <View className="bg-white p-4 rounded-xl border border-gray-200 min-h-[96px]">
              <Text className="text-gray-800">
                {description || "Sin descripción"}
              </Text>
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
                    category.toUpperCase() === cat.name.toUpperCase()
                      ? getCategoryColor(category)
                      : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      category.toUpperCase() === cat.name.toUpperCase()
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                  >
                    {cat.name.toLowerCase()}
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
                  {category.toLowerCase()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Imágenes */}
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Imágenes</Text>
          
          {isEditing ? (
            <View>
              {/* Add Image Button */}
              <TouchableOpacity
                onPress={handleImagePicker}
                className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 items-center justify-center mb-4"
              >
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-400 mt-2">Agregar imagen</Text>
              </TouchableOpacity>

              {/* Image Preview */}
              {images.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {images.map((imageUri, index) => (
                    <View key={index} className="relative">
                      <Image
                        source={{ uri: imageUri }}
                        className="w-24 h-24 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="bg-white border border-gray-200 rounded-xl p-8 items-center justify-center">
              {images.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 w-full">
                  {images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      className="w-24 h-24 rounded-xl"
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : (
                <>
                  <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-400 mt-2">Sin imágenes</Text>
                </>
              )}
            </View>
          )}
        </View>
      {/* Bottom Buttons */}
      <View className="px-4 pb-8">
        {isEditing ? (
          <TouchableOpacity
            onPress={handleSaveChanges}
            disabled={isLoading}
            className="bg-blue-500 py-4 rounded-xl items-center"
          >
            <Text className="text-white font-medium text-base">
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleRejectChange}
              className="flex-1 bg-red-500 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-medium text-base">Rechazar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleApproveChange}
              className="flex-1 bg-green-500 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-medium text-base">Aceptar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>

      )}
    </SafeAreaView>
  );
}
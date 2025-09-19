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

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load change request data
  useEffect(() => {
    // In a real app, you would fetch from your backend
    // For now, using mock data
    if (id) {
      setChangeRequest(mockChangeRequest);
      setTitle(mockChangeRequest.title);
      setDescription(mockChangeRequest.description);
      setCategory(mockChangeRequest.category);
      setImages(mockChangeRequest.images);
    } else {
      // Creating new change request
      setTitle("Ej: Cambio de materiales");
      setDescription("");
      setCategory("ELECTRICIDAD");
      setImages([]);
      setIsEditing(true);
    }
  }, [id]);

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
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
      return;
    }

    try {
      setIsLoading(true);
      
      const changeData = {
        title: title.trim(),
        description: description.trim(),
        category,
        images,
      };

      console.log("Datos del cambio a enviar:", changeData);

      // Here you would call your API to save the change request
      // const result = await saveChangeRequest(changeData);

      // For demo purposes, simulate success
      setTimeout(() => {
        setIsLoading(false);
        setIsEditing(false);
        Alert.alert("Éxito", "Solicitud de cambio guardada correctamente");
      }, 1000);

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
      "¿Estás seguro de que quieres aprobar esta solicitud de cambio?",
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
              // Here you would call your API to approve the change
              Alert.alert("Éxito", "Solicitud de cambio aprobada");
              router.back();
            } catch (error) {
              Alert.alert("Error", "No se pudo aprobar la solicitud");
            }
          },
        },
      ]
    );
  };

  const handleRejectChange = () => {
    Alert.alert(
      "Rechazar cambio",
      "¿Estás seguro de que quieres rechazar esta solicitud de cambio?",
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
              // Here you would call your API to reject the change
              Alert.alert("Solicitud rechazada", "La solicitud de cambio ha sido rechazada");
              router.back();
            } catch (error) {
              Alert.alert("Error", "No se pudo rechazar la solicitud");
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
            Detalles de solicitud
          </Text>
        </View>

        {/* Edit Button (only show if not creating new) */}
        {id && (
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            className="bg-blue-500 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-medium">
              {isEditing ? "Ver" : "Editar"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Status Badge */}
        <View className="mb-4 flex-row justify-center">
          <View className="bg-orange-500 px-3 py-1 rounded-full">
            <Text className="text-white text-sm font-medium">Cambios</Text>
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
                  onPress={() => setCategory(cat.name.toUpperCase())}
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
      </ScrollView>

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
    </SafeAreaView>
  );
}
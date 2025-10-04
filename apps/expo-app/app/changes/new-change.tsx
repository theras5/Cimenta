import { Category } from "@/components/TaskCard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/* ========= MOCKDATA ========== */

/* mock data for categories */
const Electricidad: Category = { name: "electricidad", color: '#007AFF' };
const Plomeria: Category = { name: "plomeria", color: '#FF9500' };
const Construccion: Category = { name: "construccion", color: '#8A2BE2' };
const Pintura: Category = { name: "pintura", color: '#FF2D92' };
const categories: Category[] = [Electricidad, Plomeria, Construccion, Pintura];

// Interfaz para manejar los archivos multimedia
interface MediaFile {
  uri: string;
  type: "image" | "video";
  name?: string;
}

export default function NewRequest() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  //Errores
  const [titleError, setTitleError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Solicitar permisos al cargar el componente
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Se necesitan permisos para acceder a la galería");
      }
    })();
  }, []);

  // Función para seleccionar imágenes
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: undefined,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newFile: MediaFile = {
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        name: asset.fileName || `file-${Date.now()}`,
      };

      setMediaFiles([...mediaFiles, newFile]);
    }
  };

  // Función para eliminar un archivo multimedia
  const removeMediaFile = (index: number) => {
    const updatedFiles = [...mediaFiles];
    updatedFiles.splice(index, 1);
    setMediaFiles(updatedFiles);
  };

  const handleSave = async () => {
    // Validación completa antes de enviar
    setHasAttemptedSubmit(true);

    //Validar título
    const isTitleValid = title.trim() !== "";
    if (!isTitleValid) {
      setTitleError("El título es obligatorio");
    }

    // Validar categoría
    const isCategoryValid = category && category.trim() !== "";
    if (!isCategoryValid) {
      setCategoryError("Selecciona una categoría");
    }

    // Si hay errores, no continuar
    if (!isTitleValid || !isCategoryValid) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    const nuevaSolicitud = {
      title,
      description,
      category,
      status: "changes",
      // is_urgent: false,
      user_id: "ad4d74ba-beac-4741-9ec1-978d564a971c",
    };



    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaSolicitud),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Error al crear la solicitud");
      }

      router.back();
    } catch (error) {
      alert("No se pudo guardar la solicitud");
    }
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
          <Text className="text-gray-800 font-bold text-2xl">Nueva Solicitud</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-500 px-4 py-2 rounded-full"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-white font-medium">Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Título */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">
            Título <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (hasAttemptedSubmit && titleError) {
                setTitleError(text.trim() ? null : "El título es obligatorio");
              }
            }}
            onBlur={() => {
              if (hasAttemptedSubmit) {
                setTitleError(title.trim() ? null : "El título es obligatorio");
              }
            }}
            placeholder="Ej: Cambio de materiales"
            className={`bg-white p-4 rounded-xl border ${
              titleError ? "border-red-500" : "border-gray-200"
            }`}
          />
          {titleError && (
            <Text className="text-red-500 text-sm mt-1">{titleError}</Text>
          )}
        </View>

        {/* Descripción */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripción</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe los detalles del cambio..."
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-32"
            textAlignVertical="top"
          />
        </View>

        {/* Categoría */}
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">
            Categoría <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = category === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => {
                    setCategory(cat.name);
                    setCategoryError(null);
                  }}
                  className="px-4 py-3 rounded-full"
                  style={{
                    backgroundColor: isSelected ? cat.color : '#E5E7EB'
                  }}
                  activeOpacity={0.9}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {cat.name === "construccion" ? "construcción" : cat.name === "plomeria" ? "plomería" : cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {categoryError && (
            <Text className="text-red-500 text-sm mt-1">{categoryError}</Text>
          )}
        </View>

        {/* Imágenes */}
        <View className="mb-8">
          <Text className="text-gray-700 font-medium mb-3">Imágenes</Text>

          {/* Área para agregar foto */}
          <TouchableOpacity
            onPress={pickMedia}
            className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 items-center justify-center min-h-[160px]"
          >
            <Ionicons 
              name="images-outline" 
              size={48} 
              color="#9CA3AF" 
              className="mb-3"
            />
            <Text className="text-gray-500 font-medium text-center">
              Agregar foto
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-1">
              Toca para seleccionar una imagen
            </Text>
          </TouchableOpacity>

          {/* Previsualización de archivos */}
          {mediaFiles.length > 0 && (
            <View className="mt-4">
              <Text className="text-gray-700 font-medium mb-3">
                Archivos adjuntos ({mediaFiles.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {mediaFiles.map((file, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri: file.uri }}
                      className="w-20 h-20 rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeMediaFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="close" size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Espaciado adicional al final */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
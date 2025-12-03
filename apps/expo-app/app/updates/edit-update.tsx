import {
  Image,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RequiredTextInput from "@/components/RequiredTextInput";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useUpdate } from "@/hooks/useUpdates";
import { useAuth } from "@/context/AuthContext";

interface MediaFile {
  uri: string;
  type: "image" | "video";
  name?: string;
}

const EditUpdate = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { update, isLoading, updateUpdate } = useUpdate(id);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar datos del avance al iniciar
  useEffect(() => {
    if (update) {
      setTitle(update.title || "");
      setDescription(update.description || "");
      
      // Si hay imagen existente, agregarla a mediaFiles
      if (update.image_url) {
        setMediaFiles([{
          uri: update.image_url,
          type: "image",
          name: "existing-image"
        }]);
        setImageDataUrl(update.image_url);
      }
    }
  }, [update]);

  // Verificar que el usuario sea el autor
  useEffect(() => {
    if (update && user && update.user_id !== user.id) {
      Alert.alert(
        "Acceso denegado",
        "No tienes permisos para editar este avance",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [update, user]);

  const convertToDataUrl = async (uri: string, mime?: string) => {
    try {
      // Si es una URL remota (imagen existente), no la convertimos
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return uri;
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64 = manipulated.base64;
      const safeMime = mime || "image/jpeg";
      if (!base64) throw new Error("No se pudo obtener base64");
      return `data:${safeMime};base64,${base64}`;
    } catch (err) {
      console.error("convertToDataUrl error", err);
      throw err;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permisos necesarios",
          "Se necesita permiso para acceder a la galería"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined,
        quality: 0.8,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "image",
          name: asset.fileName || `image-${Date.now()}`,
        };

        setMediaFiles([newFile]); // Solo una imagen

        try {
          const dataUrl = await convertToDataUrl(
            asset.uri,
            asset.mimeType || "image/jpeg"
          );
          setImageDataUrl(dataUrl);
        } catch (err) {
          console.error("No se pudo convertir la imagen a base64", err);
          Alert.alert("Error", "No se pudo procesar la imagen seleccionada");
        }
      }
    } catch (error) {
      console.error("pickImage error", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permisos necesarios",
          "Se necesita permiso para usar la cámara"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "image",
          name: asset.fileName || `photo-${Date.now()}`,
        };

        setMediaFiles([newFile]); // Solo una imagen

        try {
          const dataUrl = await convertToDataUrl(
            asset.uri,
            asset.mimeType || "image/jpeg"
          );
          setImageDataUrl(dataUrl);
        } catch (err) {
          console.error("No se pudo convertir la foto a base64", err);
          Alert.alert("Error", "No se pudo procesar la foto");
        }
      }
    } catch (error) {
      console.error("takePhoto error", error);
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  const removeMediaFile = () => {
    setMediaFiles([]);
    setImageDataUrl(null);
  };

  const handleSave = async () => {
    setHasAttemptedSubmit(true);

    const isTitleValid = title.trim() !== "";

    if (!isTitleValid) {
      Alert.alert("Error", "Por favor completa el título");
      return;
    }

    try {
      setIsSaving(true);

      const updateData: any = {
        title,
        description,
      };

      // Solo actualizar imagen si cambió
      if (imageDataUrl && !imageDataUrl.startsWith('http')) {
        updateData.image_url = imageDataUrl;
      }

      await updateUpdate(updateData);
      
      Alert.alert("Éxito", "Avance actualizado correctamente", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error al actualizar:", error);
      Alert.alert("Error", "No se pudo actualizar el avance");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Editar Avance</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`${isSaving ? 'bg-blue-300' : 'bg-blue-500'} px-4 py-2 rounded-full`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-medium">Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="px-4">
        <View>
          <RequiredTextInput
            label="Titulo"
            value={title}
            onChangeText={setTitle}
            required
            submitAttempted={hasAttemptedSubmit}
            placeholder="Ej: Cableado instalado"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripcion</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe los detalles del avance..."
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-24"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Multimedia</Text>

          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={takePhoto}
              className="bg-blue-500 flex-1 flex-row items-center justify-center p-4 rounded-xl"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickImage}
              className="bg-blue-500 flex-1 flex-row items-center justify-center p-4 rounded-xl"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Ionicons name="images-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Galería</Text>
            </TouchableOpacity>
          </View>

          {mediaFiles.length > 0 && (
            <View className="mt-3">
              <Text className="text-gray-700 font-medium mb-2">
                Imagen actual
              </Text>
              <View className="mr-3 relative">
                <Image
                  source={{ uri: mediaFiles[0].uri }}
                  className="w-full h-48 rounded-xl"
                  resizeMode="cover"
                />

                <TouchableOpacity
                  onPress={removeMediaFile}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditUpdate;

import {
  Image,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RequiredTextInput from "@/components/RequiredTextInput";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useUpdates } from "@/hooks/useUpdates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";

interface MediaFile {
  uri: string;
  type: "image" | "video";
  name?: string;
}

const NewUpdate = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const { createUpdate, fetchUpdates } = useUpdates();
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const convertToDataUrl = async (uri: string, mime?: string) => {
    try {
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

        setMediaFiles([...mediaFiles, newFile]);

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

        setMediaFiles([...mediaFiles, newFile]);

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

  const removeMediaFile = (index: number) => {
    const updatedFiles = [...mediaFiles];
    updatedFiles.splice(index, 1);
    setMediaFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      setImageDataUrl(null);
    }
  };

  const handleSave = async () => {
    setHasAttemptedSubmit(true);

    const isTitleValid = title.trim() !== "";

    if (!user) {
      alert("Debes estar loggeado para crear un avance");
      router.push("/sign-in");
      return;
    }

    if (!isTitleValid) {
      Alert.alert("Por favor completa todos los campos obligatorios");
      return;
    }

    const site_id = await AsyncStorage.getItem("selectedSiteId");
    if (!site_id) {
      alert("Debes seleccionar una obra antes de crear el avance");
      return;
    }

    const nuevoAvance = {
      title,
      description,
      user_id: user.id,
      site_id,
      image_url: imageDataUrl || undefined,
    };

    console.log("Enviando al backend:", nuevoAvance);

    await createUpdate(nuevoAvance);
    
    // Auto-refresh the updates list
    await fetchUpdates();

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Nuevo Avance</Text>
        </View>
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
                Archivos adjuntos ({mediaFiles.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row mt-2"
              >
                {mediaFiles.map((file, index) => (
                  <View key={index} className="mr-3 relative">
                    {file.type === "image" ? (
                      <Image
                        source={{ uri: file.uri }}
                        className="w-24 h-24 rounded-xl mt-2"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-24 h-24 rounded-xl mt-2 bg-gray-200 items-center justify-center">
                        <Ionicons name="videocam" size={32} color="#6b7280" />
                        <Text className="text-xs text-gray-500 mt-1">
                          Video
                        </Text>
                      </View>
                    )}

                    <View className="absolute top-0 left-0 bg-black bg-opacity-50 rounded-tr-xl rounded-bl-xl px-2 py-1 mt-2">
                      <Ionicons
                        name={file.type === "image" ? "image" : "videocam"}
                        size={12}
                        color="white"
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => removeMediaFile(index)}
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 mt-2"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NewUpdate;


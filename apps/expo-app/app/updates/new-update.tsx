import {
  Image,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RequiredTextInput from "@/components/RequiredTextInput";
import * as ImagePicker from "expo-image-picker";
import { useUpdates } from "@/hooks/useUpdates";

interface MediaFile {
  uri: string;
  type: "image" | "video";
  name?: string;
}

const NewUpdate = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const { createUpdate } = useUpdates();
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    (async () => {
      // Solicitar permisos para galería y cámara
      const libraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (
        libraryStatus.status !== "granted" ||
        cameraStatus.status !== "granted"
      ) {
        Alert.alert(
          "Permisos",
          "Se necesitan permisos para acceder a la galería y cámara"
        );
      }
    })();
  }, []);

  // Función para seleccionar imágenes de la galería
  const pickImageFromGallery = async () => {
    try {
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
          type: "image",
          name: asset.fileName || `image-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
    setShowGalleryModal(false);
  };

  // Función para seleccionar videos de la galería
  const pickVideoFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 30, // Máximo 30 segundos
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "video",
          name: asset.fileName || `video-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar el video");
    }
    setShowGalleryModal(false);
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "image",
          name: asset.fileName || `photo-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo tomar la foto");
    }
    setShowCameraModal(false);
  };

  // Función para grabar video con la cámara
  const recordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 30, // Máximo 30 segundos
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "video",
          name: asset.fileName || `video-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo grabar el video");
    }
    setShowCameraModal(false);
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

    // Si hay errores, no continuar
    if (!isTitleValid) {
      Alert.alert("Por favor completa todos los campos obligatorios");
      return;
    }

    const nuevoAvance = {
      title,
      description,
      user_id: "ad4d74ba-beac-4741-9ec1-978d564a971c",
    };

    // Muestra en consola lo que se envía
    console.log("Enviando al backend:", nuevoAvance);

    createUpdate(nuevoAvance);

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Nuevo Avance</Text>
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

      <ScrollView className="px-4">
        {/* Título */}
        <View>
          <RequiredTextInput
            label="Título"
            value={title}
            onChangeText={setTitle}
            required
            submitAttempted={hasAttemptedSubmit}
            placeholder="Ej: Cableado instalado"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripción</Text>
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

          {/* Botones para agregar contenido */}
          <View className="flex-row gap-2 mb-3">
            {/* Botón para cámara (foto/video) */}
            <TouchableOpacity
              onPress={() => setShowCameraModal(true)}
              className="bg-white flex-1 flex-row items-center justify-center p-3 rounded-xl border border-gray-200"
            >
              <Ionicons name="camera-outline" size={20} color="#3B82F6" />
              <Text className="text-blue-500 font-medium ml-2">Cámara</Text>
            </TouchableOpacity>

            {/* Botón unificado para galería (imagen/video) */}
            <TouchableOpacity
              onPress={() => setShowGalleryModal(true)}
              className="bg-white flex-1 flex-row items-center justify-center p-3 rounded-xl border border-gray-200"
            >
              <Ionicons name="images-outline" size={20} color="#3B82F6" />
              <Text className="text-blue-500 font-medium ml-2">Galería</Text>
            </TouchableOpacity>
          </View>

          {/* Previsualización de archivos */}
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

                    {/* Indicador de tipo */}
                    <View className="absolute top-0 left-0 bg-black bg-opacity-50 rounded-tr-xl rounded-bl-xl px-2 py-1 mt-2">
                      <Ionicons
                        name={file.type === "image" ? "image" : "videocam"}
                        size={12}
                        color="white"
                      />
                    </View>

                    {/* Botón eliminar */}
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

      {/* Modal para opciones de cámara */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
            }}
          >
            {/* Header del modal */}
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-semibold text-gray-800">
                Usar Cámara
              </Text>
            </View>

            {/* Opciones */}
            <View className="gap-3">
              {/* Opción: Tomar foto */}
              <TouchableOpacity
                onPress={takePhoto}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <Ionicons name="camera" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800 text-base">
                    Tomar Foto
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Captura una imagen con la cámara
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Opción: Grabar video */}
              <TouchableOpacity
                onPress={recordVideo}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mr-4">
                  <Ionicons name="videocam" size={24} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800 text-base">
                    Grabar Video
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Graba un video de hasta 30 segundos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Botón cancelar */}
            <TouchableOpacity
              onPress={() => setShowCameraModal(false)}
              className="mt-6 p-4 bg-gray-100 rounded-xl items-center"
            >
              <Text className="font-medium text-gray-600">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para opciones de galería */}
      <Modal
        visible={showGalleryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGalleryModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
            }}
          >
            {/* Header del modal */}
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-semibold text-gray-800">
                Seleccionar de Galería
              </Text>
            </View>

            {/* Opciones */}
            <View className="gap-3">
              {/* Opción: Seleccionar imagen */}
              <TouchableOpacity
                onPress={pickImageFromGallery}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <Ionicons name="images" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800 text-base">
                    Seleccionar Imagen
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Elige una foto de tu galería
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Opción: Seleccionar video */}
              <TouchableOpacity
                onPress={pickVideoFromGallery}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
                  <Ionicons name="videocam" size={24} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800 text-base">
                    Seleccionar Video
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Elige un video de hasta 30 segundos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Botón cancelar */}
            <TouchableOpacity
              onPress={() => setShowGalleryModal(false)}
              className="mt-6 p-4 bg-gray-100 rounded-xl items-center"
            >
              <Text className="font-medium text-gray-600">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default NewUpdate;

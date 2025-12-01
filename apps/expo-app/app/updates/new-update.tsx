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
import * as FileSystem from "expo-file-system/legacy";
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
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const { createUpdate } = useUpdates();
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const libraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (
        libraryStatus.status !== "granted" ||
        cameraStatus.status !== "granted"
      ) {
        Alert.alert(
          "Permisos",
          "Se necesitan permisos para acceder a la galeria y camara"
        );
      }
    })();
  }, []);

  const convertToDataUrl = async (uri: string, mime?: string) => {
    try {
      // Reducimos tamaño/compress siempre para evitar archivos grandes y depender del FS nuevo
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

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined,
        quality: 0.8,
      });

      if (result.canceled) {
        setShowGalleryModal(false);
        return;
      }

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
      console.error("pickImageFromGallery error", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
    setShowGalleryModal(false);
  };

  const pickVideoFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "video",
          name: asset.fileName || `video-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
        setImageDataUrl(null); // la columna image_url solo guarda imagenes
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar el video");
    }
    setShowGalleryModal(false);
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled) {
        setShowCameraModal(false);
        return;
      }

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
    setShowCameraModal(false);
  };

  const recordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          uri: asset.uri,
          type: "video",
          name: asset.fileName || `video-${Date.now()}`,
        };

        setMediaFiles([...mediaFiles, newFile]);
        setImageDataUrl(null);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo grabar el video");
    }
    setShowCameraModal(false);
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
              onPress={() => setShowCameraModal(true)}
              className="bg-white flex-1 flex-row items-center justify-center p-3 rounded-xl border border-gray-200"
            >
              <Ionicons name="camera-outline" size={20} color="#3B82F6" />
              <Text className="text-blue-500 font-medium ml-2">Camara</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowGalleryModal(true)}
              className="bg-white flex-1 flex-row items-center justify-center p-3 rounded-xl border border-gray-200"
            >
              <Ionicons name="images-outline" size={20} color="#3B82F6" />
              <Text className="text-blue-500 font-medium ml-2">Galeria</Text>
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
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-semibold text-gray-800">
                Usar Camara
              </Text>
            </View>

            <View className="gap-3">
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
                    Captura una imagen con la camara
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

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

            <TouchableOpacity
              onPress={() => setShowCameraModal(false)}
              className="mt-6 p-4 bg-gray-100 rounded-xl items-center"
            >
              <Text className="font-medium text-gray-600">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-semibold text-gray-800">
                Seleccionar de Galeria
              </Text>
            </View>

            <View className="gap-3">
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
                    Elige una foto de tu galeria
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

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


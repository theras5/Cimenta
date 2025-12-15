// @ts-nocheck
import { Category } from "@/components/TaskCard";
import { QuickDateSelector } from "@/components/QuickDateSelector";
// import { MinimalDateSelector } from "@/components/MinimalDateSelector"; // Para un diseño aún más minimalista
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Image,
  Modal,
  Platform,
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

// Mock data para miembros del equipo
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
  { id: "6", name: "Sofía Hernández", role: "Arquitecta", avatar: "👩‍💼" },
];

// Interfaz para manejar los archivos multimedia
interface MediaFile {
  uri: string;
  type: "image" | "video";
  name?: string;
}

export default function NewTask() {
  const { user, token } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);

  //Errores
  const [titleError, setTitleError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Estados para las fechas
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // 1 semana despuÃ©s

  // Estados para controlar los pickers - ya no necesarios con QuickDateSelector

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

  // Función para seleccionar imágenes o videos
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.image],
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

  // Función para seleccionar/deseleccionar miembros
  const toggleMemberSelection = (member: TeamMember) => {
    const isSelected = selectedMembers.some((m) => m.id === member.id);

    if (isSelected) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== member.id));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  // Función para remover un miembro seleccionado
  const removeMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== memberId));
  };

  // Formateo de fechas ahora manejado por QuickDateSelector







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
      setCategoryError("Selecciona una categorÃ­a");
    }

    // Si hay errores, no continuar
    if (!isTitleValid || !isCategoryValid) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }


    const formatDate = (date: Date | null) => {
      if (!date) return undefined;
      return date.toISOString();
    };

    // Obtener el site_id de la obra seleccionada
    const site_id = await AsyncStorage.getItem("selectedSiteId");
    if (!site_id) {
      alert("Debes seleccionar una obra antes de crear la tarea");
      return;
    }

    if (!user) {
      alert("Debes estar loggeado para crear una tarea");
      router.push("/sign-in");
      return;
    }


    const nuevaTarea = {
      title,
      description,
      category,
      status: "pending",
      user_id: user.id,
      site_id,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    };



    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(nuevaTarea),
      });


      if (!response.ok) {
        const errorText = await response.text();
        alert(`Error al crear la tarea (status ${response.status}):\n${errorText}`);
        return;
      }

      // Navegar atrás y forzar refresh
      router.back();
      router.setParams({ refresh: Date.now().toString() });
    } catch (error) {
      alert("No se pudo guardar la tarea: " + (error?.message || error));
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
          <Text className="text-gray-800 font-bold text-2xl">Nueva Tarea</Text>
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
            placeholder="Ej: Instalar cableado"
            className={`bg-white p-4 rounded-xl border ${titleError ? "border-red-500" : "border-gray-200"
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
            placeholder="Describe los detalles de la tarea..."
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-24"
            textAlignVertical="top"
          />
        </View>

        {/* Categoría */}
        <View className="mb-4">
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
                  className="px-3 py-2 rounded-full"
                  style={{
                    backgroundColor: isSelected ? cat.color : '#E5E7EB',
                    borderWidth: 0,
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
          {categoryError && (
            <Text className="text-red-500 text-sm mt-1">{categoryError}</Text>
          )}
        </View>

        {/* Fecha de inicio */}
        <QuickDateSelector
          date={startDate}
          onDateChange={(date) => {
            setStartDate(date);
            if (date > endDate) {
              setEndDate(date);
            }
          }}
          label="Fecha de inicio"
          minimumDate={new Date()}
          placeholder="Seleccionar fecha de inicio"
        />

        {/* Fecha de fin */}
        <QuickDateSelector
          date={endDate}
          onDateChange={setEndDate}
          label="Fecha de finalización"
          minimumDate={startDate}
          placeholder="Seleccionar fecha de finalización"
        />

        {/* Miembros del Equipo */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">
            Miembros del Equipo
          </Text>

          {/* Botón para agregar miembros */}
          <TouchableOpacity
            onPress={() => setShowMemberModal(true)}
            className="bg-white flex-row items-center justify-center p-4 rounded-xl border border-gray-200 mb-3"
          >
            <Ionicons name="people-outline" size={24} color="#3B82F6" />
            <Text className="text-blue-500 font-medium ml-2">
              Agregar miembros
            </Text>
          </TouchableOpacity>

          {/* Miembros seleccionados */}
          {selectedMembers.length > 0 && (
            <View className="mt-2">
              <Text className="text-gray-700 font-medium mb-2">
                Miembros asignados ({selectedMembers.length})
              </Text>
              <View className="space-y-2">
                {selectedMembers.map((member) => (
                  <View
                    key={member.id}
                    className="bg-white flex-row items-center justify-between p-3 my-1 rounded-xl border border-gray-200"
                  >
                    <View className="flex-row items-center">
                      <Text className="text-2xl mr-3">{member.avatar}</Text>
                      <View>
                        <Text className="text-gray-800 font-medium">
                          {member.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {member.role}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeMember(member.id)}
                      className="bg-red-100 p-2 rounded-full"
                    >
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Contenido Audiovisual */}
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Imágenes</Text>

          {/* Botón para agregar contenido */}
          <TouchableOpacity
            onPress={pickMedia}
            className="bg-white flex-row items-center justify-center p-4 rounded-xl border border-gray-200 mb-3"
          >
            <Ionicons
              name="images-outline"
              size={24}
              color="#3B82F6"
              className="mr-2"
            />
            <Text className="text-blue-500 font-medium ml-2">Agregar foto</Text>
          </TouchableOpacity>

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
                    <Image
                      source={{ uri: file.uri }}
                      className="w-24 h-24 rounded-xl mt-2"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeMediaFile(index)}
                      className="absolute -top-2 -right-2 bg-red-400 rounded-full p-1 mt-2"
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

      {/* Modal para seleccionar miembros */}
      <Modal
        visible={showMemberModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-2 mb-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
              <Text className="text-red-500 font-medium">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-gray-800 font-bold text-lg">
              Seleccionar Miembros
            </Text>
            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
              <Text className="text-blue-500 font-medium">OK</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4">
            {teamMembers.map((member) => {
              const isSelected = selectedMembers.some(
                (m) => m.id === member.id
              );
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => toggleMemberSelection(member)}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200"
                    }`}
                >
                  <View className="flex-row items-center">
                    <Text className="text-3xl mr-3">{member.avatar}</Text>
                    <View>
                      <Text className="text-gray-800 font-medium">
                        {member.name}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {member.role}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                      }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date pickers ahora manejados por QuickDateSelector */}
    </SafeAreaView>
  );
}


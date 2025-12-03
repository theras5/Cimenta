"use client";

import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUpdate } from "@/hooks/useUpdates";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function UpdateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { update, isLoading, error, deleteUpdate } = useUpdate(id);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verificar si el usuario actual es el autor del avance
  console.log("🔍 Mobile Auth Check:");
  console.log("- user object:", JSON.stringify(user, null, 2));
  console.log("- update object:", JSON.stringify(update, null, 2));
  console.log("- user exists:", !!user);
  console.log("- update exists:", !!update);
  console.log("- user.id:", user?.id);
  console.log("- update.user_id:", update?.user_id);
  console.log("- Types - user.id:", typeof user?.id, "update.user_id:", typeof update?.user_id);
  console.log("- Strict equality:", user?.id === update?.user_id);
  
  // Intentar múltiples formas de verificar la autoría
  const isAuthor = user && update && (
    user.id === update.user_id ||
    String(user.id) === String(update.user_id)
  );
  
  console.log("- Final isAuthor:", isAuthor);
  console.log("=".repeat(50));

  const handleDelete = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const success = await deleteUpdate();
      setShowDeleteConfirm(false);
      
      if (success) {
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          router.back();
        }, 2000);
      } else {
        Alert.alert("Error", "No se pudo eliminar el avance");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      Alert.alert("Error", "Ocurrió un error al eliminar el avance");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setShowOptionsModal(false);
    router.push(`/updates/edit-update?id=${id}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando avance...</Text>
      </SafeAreaView>
    );
  }

  if (error || !update) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-4">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-red-600 text-lg font-medium mt-4 text-center">
          Error al cargar el avance
        </Text>
        <Text className="text-gray-600 mt-2 text-center">
          {error || "No se pudo encontrar el avance"}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Avance</Text>
        </View>
        
        {/* Botón de opciones (solo para el autor) */}
        {isAuthor && (
          <TouchableOpacity 
            onPress={() => setShowOptionsModal(true)}
            className="p-2"
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mt-2">
          {update.image_url ? (
            <Image
              source={{ uri: update.image_url }}
              className="w-full h-56 rounded-xl mb-4"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-32 rounded-xl bg-gray-100 border border-dashed border-gray-300 mb-4 items-center justify-center">
              <Ionicons name="image-outline" size={28} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2">Sin imagen</Text>
            </View>
          )}

          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {update.title}
          </Text>
          <Text className="text-sm text-gray-500 mb-4">
            {update.created_at
              ? new Date(update.created_at).toLocaleString()
              : "Fecha no disponible"}
          </Text>
          {update.description && (
            <Text className="text-gray-700 text-base leading-6 mb-6">
              {update.description}
            </Text>
          )}

          <View className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
            <View className="mb-3">
              <Text className="text-gray-500 text-xs uppercase mb-1">Autor</Text>
              <Text className="text-gray-800 font-medium">
                {update.user?.name || "Usuario"}
              </Text>
            </View>
            <View>
              <Text className="text-gray-500 text-xs uppercase mb-1">Email</Text>
              <Text className="text-gray-800 font-medium">
                {update.user?.email || "No disponible"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View 
            className="bg-white rounded-t-3xl p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
            
            <Text className="text-gray-800 font-bold text-lg mb-4 px-2">
              Opciones
            </Text>

            {/* Botón Editar */}
            <TouchableOpacity
              onPress={handleEdit}
              className="flex-row items-center p-4 mb-2 rounded-xl active:bg-gray-100"
              disabled={isDeleting}
            >
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="pencil" size={20} color="#3B82F6" />
              </View>
              <Text className="text-gray-800 font-medium text-base flex-1">
                Editar avance
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Botón Eliminar */}
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center p-4 mb-2 rounded-xl active:bg-gray-100"
              disabled={isDeleting}
            >
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="trash" size={20} color="#EF4444" />
              </View>
              <Text className="text-red-600 font-medium text-base flex-1">
                Eliminar avance
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Botón Cancelar */}
            <TouchableOpacity
              onPress={() => setShowOptionsModal(false)}
              className="bg-gray-100 p-4 rounded-xl mt-2"
            >
              <Text className="text-gray-700 font-semibold text-center text-base">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center self-center mb-4">
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            
            <Text className="text-gray-900 font-bold text-xl text-center mb-2">
              Eliminar avance
            </Text>
            
            <Text className="text-gray-600 text-base text-center mb-6 leading-5">
              ¿Estás seguro de que deseas eliminar este avance? Esta acción no se puede deshacer.
            </Text>
            
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 py-3 px-4 rounded-full"
                disabled={isDeleting}
              >
                <Text className="text-gray-700 font-semibold text-center text-base">
                  Cancelar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmDelete}
                className="flex-1 bg-red-500 py-3 px-4 rounded-full"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-center text-base">
                    Eliminar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center self-center mb-4">
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            </View>
            
            <Text className="text-gray-900 font-bold text-xl text-center mb-2">
              ¡Éxito!
            </Text>
            
            <Text className="text-gray-600 text-base text-center leading-5">
              Avance eliminado correctamente
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

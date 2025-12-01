"use client";

import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUpdate } from "@/hooks/useUpdates";

export default function UpdateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { update, isLoading, error } = useUpdate(id);

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
          <Text className="text-gray-700 text-base leading-6 mb-6">
            {update.description || "Sin descripción"}
          </Text>

          <View className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex-row justify-between">
            <View>
              <Text className="text-gray-500 text-xs uppercase">Autor</Text>
              <Text className="text-gray-800 font-medium">
                {update.user_id?.slice(0, 8) || "Usuario"}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-xs uppercase">ID</Text>
              <Text className="text-gray-800 font-medium">
                {update.id?.slice(0, 8)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

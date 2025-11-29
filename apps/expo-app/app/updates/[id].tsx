import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUpdate } from "@/hooks/useUpdates";
import { useUserRole } from "@/hooks/useUserRole";

export default function UpdateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { update, isLoading, error } = useUpdate(id);
  const { role } = useUserRole();
  const normalizedRole = role?.toLowerCase();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando avance...</Text>
      </SafeAreaView>
    );
  }

  if (error || !update) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-red-600 text-lg font-medium mt-4 text-center">
          Error al cargar el avance
        </Text>
        <Text className="text-gray-600 mt-2 text-center">{error || "No se pudo encontrar el avance"}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Ionicons name="chevron-back" size={24} color="#374151" onPress={() => router.back()} />
        <Text className="text-xl font-semibold text-gray-800 ml-3 flex-1" numberOfLines={1}>
          Detalle del avance
        </Text>
        {normalizedRole === "admin" && (
          <Text className="text-xs text-blue-600 font-semibold">Admin</Text>
        )}
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {update.image_url ? (
          <Image source={{ uri: update.image_url }} className="w-full h-56 rounded-xl mb-4" resizeMode="cover" />
        ) : null}

        <Text className="text-2xl font-bold text-gray-900 mb-2">{update.title}</Text>
        {update.description ? (
          <Text className="text-gray-700 text-base leading-6 mb-4">{update.description}</Text>
        ) : (
          <Text className="text-gray-400 italic mb-4">Sin descripción</Text>
        )}

        <View className="flex-row justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <View>
            <Text className="text-gray-500 text-xs uppercase">Autor</Text>
            <Text className="text-gray-800 font-medium">{update.user_name || "Usuario"}</Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-500 text-xs uppercase">Creado</Text>
            <Text className="text-gray-800 font-medium">
              {update.created_at ? new Date(update.created_at).toLocaleString() : "N/D"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

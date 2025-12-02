import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUpdates } from "@/hooks/useUpdates";
import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import UpdateCard from "@/components/UpdateCard";

const Avances = () => {
  const params = useLocalSearchParams();
  // Helper para mostrar "Hace X"
  const formatTime = (iso?: string) => {
    if (!iso) return "Hace poco";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Hace un momento";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} dia${days > 1 ? "s" : ""}`;
  };

  const { updates, isLoading, error, fetchUpdates } = useUpdates();
  const [refreshing, setRefreshing] = useState(false);
  const { role, loading: roleLoading } = useUserRole();
  const normalizedRole = role?.toLowerCase();
  const isAdmin = normalizedRole === "admin";

  // Recargar cuando se reciba el parámetro refresh
  useEffect(() => {
    if (params.refresh) {
      fetchUpdates();
    }
  }, [params.refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUpdates();
    setRefreshing(false);
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando avances...</Text>
      </SafeAreaView>
    );
  }

  if (error && updates.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-4">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-red-600 text-lg font-medium mt-4 text-center">
          Error al cargar los avances
        </Text>
        <Text className="text-gray-600 mt-2 text-center mb-4">{error}</Text>
        <TouchableOpacity
          onPress={fetchUpdates}
          className="bg-blue-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-medium">Intentar de nuevo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-gray-800 font-bold text-2xl">Avances</Text>
        {/* Floating action button (solo admin) */}
        {!roleLoading && isAdmin && (
          <TouchableOpacity
            onPress={() => router.push("/updates/new-update")}
            className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        className="mb-20"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {updates.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No hay avances aún
            </Text>
            {isAdmin && (
              <Text className="text-gray-400 mt-2 text-center px-6">
                Crea tu primer avance usando el botón +
              </Text>
            )}
          </View>
        ) : (
          <View className="px-2 pb-6">
            {updates.map((u) => (
              <UpdateCard
                key={u.id}
                title={u.title}
                description={u.description}
                author="Usuario"
                timeAgo={formatTime(u.created_at)}
                imageUrl={u.image_url}
                onPress={() => router.push(`/updates/${u.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  addButton: {
    width: 56,
    height: 56,
    backgroundColor: "#3b82f6",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default Avances;

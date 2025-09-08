import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskSection from "../../components/TaskSection";
import TaskCard from "@/components/TaskCard";
import { useTasks } from "@/hooks/useTasks";
import { router } from "expo-router";
import { useEffect, useState } from "react";

const handleAddTask = () => {
  router.push("/tasks/new-task");
};

export default function Tasks() {
  const { tasks, isLoading, error, fetchTasks } = useTasks();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // Agrupar tareas por estado
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const blockedTasks = tasks.filter((task) => task.status === "blocked");

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando tareas...</Text>
      </SafeAreaView>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-4">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-red-600 text-lg font-medium mt-4 text-center">
          Error al cargar las tareas
        </Text>
        <Text className="text-gray-600 mt-2 text-center mb-4">{error}</Text>
        <TouchableOpacity
          onPress={fetchTasks}
          className="bg-blue-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-medium">Intentar de nuevo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-gray-800 font-bold text-2xl">Tareas</Text>
        {/* Floating action button */}
        <TouchableOpacity
          onPress={() => router.push("/tasks/new-task")}
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
      </View>

      {/* Tareas */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {tasks.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No hay tareas aún
            </Text>
            <Text className="text-gray-400 mt-2 text-center px-6">
              Crea tu primera tarea usando el botón +
            </Text>
          </View>
        ) : (
          <View className="px-6 pb-6">
            {/* Pendientes */}
            {pendingTasks.length > 0 && (
              <TaskSection
                title="Pendientes"
                tasks={pendingTasks}
                onSeeAll={() => console.log("Ver todos pendientes")}
              />
            )}

            {/* En Progreso */}
            {inProgressTasks.length > 0 && (
              <TaskSection
                title="En progreso"
                tasks={inProgressTasks}
                onSeeAll={() => console.log("Ver todos en progreso")}
              />
            )}

            {/* Bloqueadas */}
            {blockedTasks.length > 0 && (
              <TaskSection
                title="Bloqueado"
                tasks={blockedTasks}
                onSeeAll={() => console.log("Ver todos bloqueados")}
              />
            )}

            {/* Completadas */}
            {completedTasks.length > 0 && (
              <TaskSection
                title="Completadas"
                tasks={completedTasks}
                onSeeAll={() => console.log("Ver todos hechos")}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

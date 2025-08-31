import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskSection from "../../components/TaskSection";
import { type Task } from "../../components/TaskCard";
import { router } from "expo-router";

// Mock data for tasks
const pendingTasks: Task[] = [
  {
    id: 1,
    title: "Instalar cableado",
    description: "Faltan todavía 10 metros de cable de cobre",
    category: "ELECTRICIDAD",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🔧", "👷‍♂️", "👨‍💼"],
  },
  {
    id: 2,
    title: "Tubería cocina",
    description: "Definir planos con la arquitecta",
    category: "PLOMERÍA",
    categoryColor: "bg-orange-500",
    bgColor: "bg-orange-100",
    avatars: ["👨‍🔧", "👷‍♀️", "👨‍💼"],
  },
];

const inProgressTasks: Task[] = [
  {
    id: 3,
    title: "Revoque paredes",
    description: "Faltan las paredes de cocina y baño",
    category: "PINTURA",
    categoryColor: "bg-pink-500",
    bgColor: "bg-pink-100",
    avatars: ["👨‍🎨", "👷‍♂️", "👨‍💼"],
  },
  {
    id: 4,
    title: "Tablero eléctrico",
    description: "Ver el de la cocina y comedor",
    category: "ELECTRICISTA",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🔧", "👷‍♀️", "👨‍💼"],
  },
];

const blockedTasks: Task[] = [
  {
    id: 5,
    title: "Revoque paredes",
    description: "Faltan las paredes de cocina y baño",
    category: "PINTURA",
    categoryColor: "bg-pink-500",
    bgColor: "bg-pink-100",
    avatars: ["👨‍🎨", "👷‍♂️", "👨‍💼"],
  },
  {
    id: 6,
    title: "Tablero eléctrico",
    description: "Ver el de la cocina y comedor",
    category: "ELECTRICISTA",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🔧", "👷‍♀️", "👨‍💼"],
  },
];

const doneTasks: Task[] = [
  {
    id: 7,
    title: "Tubería baño",
    description: "Romper caños previos y rearmar",
    category: "PLOMERÍA",
    categoryColor: "bg-orange-500",
    bgColor: "bg-orange-100",
    avatars: ["👨‍🔧", "👷‍♀️", "👨‍💼"],
  },
  {
    id: 8,
    title: "Durlock de living",
    description: "Falta la pared de atrás del sillón",
    category: "CONSTRUCCIÓN",
    categoryColor: "bg-gray-500",
    bgColor: "bg-gray-100",
    avatars: ["👷‍♂️", "👨‍💼", "👷‍♀️"],
  },
];

const handleAddTask = () => {
  router.push("/tasks/new-task");
};

export default function Tasks() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-4">
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Tareas</Text>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={handleAddTask}
          className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tareas */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TaskSection
          title="Pendiente"
          tasks={pendingTasks}
          onSeeAll={() => console.log("Ver todos pendientes")}
        />

        <TaskSection
          title="En progreso"
          tasks={inProgressTasks}
          onSeeAll={() => console.log("Ver todos en progreso")}
        />

        <TaskSection
          title="Bloqueado"
          tasks={blockedTasks}
          onSeeAll={() => console.log("Ver todos bloqueados")}
        />

        <TaskSection
          title="Hecho"
          tasks={doneTasks}
          onSeeAll={() => console.log("Ver todos hechos")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

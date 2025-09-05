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

// Mock data para solicitudes de cambios
const pendingRequests: Task[] = [
  {
    id: 1,
    title: "Cambio de materiales",
    description: "Solicitud para cambiar cemento por otro tipo",
    category: "MATERIALES",
    categoryColor: "bg-amber-500",
    bgColor: "bg-amber-100",
    avatars: ["👷‍♂️", "👨‍💼"],
  },
  {
    id: 2,
    title: "Modificación planos",
    description: "Actualización de planos por nuevo diseño",
    category: "ARQUITECTURA",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🔧", "👷‍♀️", "👨‍💼"],
  },
];

const inReviewRequests: Task[] = [
  {
    id: 3,
    title: "Cambio de proveedor",
    description: "Evaluación de nuevo proveedor de hierro",
    category: "PROVEEDORES",
    categoryColor: "bg-purple-500",
    bgColor: "bg-purple-100",
    avatars: ["👨‍💼", "👷‍♂️"],
  },
  {
    id: 4,
    title: "Cambio de ubicación",
    description: "Reubicación de las instalaciones eléctricas",
    category: "ELECTRICIDAD",
    categoryColor: "bg-yellow-500",
    bgColor: "bg-yellow-100",
    avatars: ["👨‍🔧", "👷‍♀️"],
  },
];

const approvedRequests: Task[] = [
  {
    id: 5,
    title: "Cambio cronograma",
    description: "Extensión de plazo de entrega",
    category: "CRONOGRAMA",
    categoryColor: "bg-green-500",
    bgColor: "bg-green-100",
    avatars: ["👨‍💼", "👷‍♂️"],
  },
  {
    id: 6,
    title: "Cambio de acabados",
    description: "Actualización de acabados en baños",
    category: "TERMINACIONES",
    categoryColor: "bg-indigo-500",
    bgColor: "bg-indigo-100",
    avatars: ["👨‍🎨", "👷‍♀️", "👨‍💼"],
  },
];

const rejectedRequests: Task[] = [
  {
    id: 7,
    title: "Ampliación presupuesto",
    description: "Solicitud de fondos adicionales",
    category: "FINANZAS",
    categoryColor: "bg-red-500",
    bgColor: "bg-red-100",
    avatars: ["👨‍💼", "👷‍♀️"],
  },
  {
    id: 8,
    title: "Cambio de diseño",
    description: "Modificación completa de fachada",
    category: "ARQUITECTURA",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🎨", "👨‍💼", "👷‍♀️"],
  },
];

const handleAddChange = () => {
  router.push("/changes/new-change");
};

export default function Changes() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-4">
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Solicitudes de cambios</Text>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={handleAddChange}
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

      {/* Solicitudes de Cambios */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TaskSection
          title="Pendiente"
          tasks={pendingRequests}
          onSeeAll={() => console.log("Ver todas las solicitudes pendientes")}
        />

        <TaskSection
          title="En revisión"
          tasks={inReviewRequests}
          onSeeAll={() => console.log("Ver todas las solicitudes en revisión")}
        />

        <TaskSection
          title="Aprobado"
          tasks={approvedRequests}
          onSeeAll={() => console.log("Ver todas las solicitudes aprobadas")}
        />

        <TaskSection
          title="Rechazado"
          tasks={rejectedRequests}
          onSeeAll={() => console.log("Ver todas las solicitudes rechazadas")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
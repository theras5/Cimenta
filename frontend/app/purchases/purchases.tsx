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

// Mock data para solicitudes de compras
const requestedItems: Task[] = [
  {
    id: 1,
    title: "Compra de hormigón",
    description: "25 bolsas para fundaciones",
    category: "MATERIALES",
    categoryColor: "bg-amber-500",
    bgColor: "bg-amber-100",
    avatars: ["👷‍♂️", "👨‍💼"],
  },
  {
    id: 2,
    title: "Materiales eléctricos",
    description: "Cables y cajas para instalación",
    category: "ELECTRICIDAD",
    categoryColor: "bg-blue-500",
    bgColor: "bg-blue-100",
    avatars: ["👨‍🔧", "👷‍♀️"],
  },
];

const beingPurchasedItems: Task[] = [
  {
    id: 3,
    title: "Ladrillos",
    description: "5000 unidades para muros interiores",
    category: "MATERIALES",
    categoryColor: "bg-amber-500",
    bgColor: "bg-amber-100",
    avatars: ["👨‍💼", "👷‍♂️"],
  },
  {
    id: 4,
    title: "Herramientas",
    description: "Juego de destornilladores y llaves",
    category: "HERRAMIENTAS",
    categoryColor: "bg-emerald-500",
    bgColor: "bg-emerald-100",
    avatars: ["👨‍🔧", "👷‍♀️"],
  },
];

const purchasedItems: Task[] = [
  {
    id: 5,
    title: "Hierro estructural",
    description: "200 barras de 10mm y 12mm",
    category: "MATERIALES",
    categoryColor: "bg-amber-500",
    bgColor: "bg-amber-100",
    avatars: ["👨‍💼"],
  },
  {
    id: 6,
    title: "Membrana aislante",
    description: "10 rollos para techos",
    category: "AISLANTES",
    categoryColor: "bg-cyan-500",
    bgColor: "bg-cyan-100",
    avatars: ["👨‍💼", "👷‍♀️"],
  },
];

const arrivedItems: Task[] = [
  {
    id: 7,
    title: "Arena fina",
    description: "5m³ para revoques",
    category: "MATERIALES",
    categoryColor: "bg-amber-500",
    bgColor: "bg-amber-100",
    avatars: ["👨‍🔧", "👷‍♀️"],
  },
  {
    id: 8,
    title: "Tuberías PVC",
    description: "Material para instalación sanitaria",
    category: "PLOMERÍA",
    categoryColor: "bg-orange-500",
    bgColor: "bg-orange-100",
    avatars: ["👷‍♂️", "👨‍💼"],
  },
];

const handleAddPurchase = () => {
  router.push("/purchases/new-purchase");
};

export default function Purchases() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-4">
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Solicitudes de compras</Text>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={handleAddPurchase}
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

      {/* Solicitudes de Compras */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TaskSection
          title="Solicitado"
          tasks={requestedItems}
          onSeeAll={() => console.log("Ver todos los solicitados")}
        />

        <TaskSection
          title="Siendo comprado"
          tasks={beingPurchasedItems}
          onSeeAll={() => console.log("Ver todos siendo comprados")}
        />

        <TaskSection
          title="Comprado"
          tasks={purchasedItems}
          onSeeAll={() => console.log("Ver todos comprados")}
        />

        <TaskSection
          title="Llegó"
          tasks={arrivedItems}
          onSeeAll={() => console.log("Ver todos llegados")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
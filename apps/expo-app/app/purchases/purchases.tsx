import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskSection from "../../components/TaskSection";
import { type Task } from "../../components/TaskCard";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPurchasesBySite } from "../../services/purchaseService";

const handleAddPurchase = () => {
  router.push("/purchases/new-purchase");
};

// Función para mapear compras de la API a Tasks para mostrar en TaskSection
const mapPurchaseToTask = (purchase: any): Task => {
  // Mapeo de categorías a colores (según purchase_category enum)
  const categoryColors: { [key: string]: { bg: string; category: string } } = {
    materiales: { bg: 'bg-amber-100', category: 'bg-amber-500' },
    herramientas: { bg: 'bg-emerald-100', category: 'bg-emerald-500' },
    equipamiento: { bg: 'bg-blue-100', category: 'bg-blue-500' },
    seguridad: { bg: 'bg-red-100', category: 'bg-red-500' },
    oficina: { bg: 'bg-purple-100', category: 'bg-purple-500' },
    otros: { bg: 'bg-gray-100', category: 'bg-gray-500' },
  };

  const colors = categoryColors[purchase.category?.toLowerCase()] || categoryColors.materiales;

  return {
    id: purchase.id,
    title: purchase.product,
    description: purchase.description || `${purchase.quantity} unidades`,
    category: purchase.category?.toUpperCase() || 'MATERIALES',
    categoryColor: colors.category,
    bgColor: colors.bg,
    avatars: ['👷‍♂️'],
  };
};

export default function Purchases() {
  const params = useLocalSearchParams();
  const [pendingItems, setPendingItems] = useState<Task[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<Task[]>([]);
  const [deliveredItems, setDeliveredItems] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

  // Recargar cuando se reciba el parámetro refresh
  useEffect(() => {
    if (params.refresh) {
      loadPurchases();
    }
  }, [params.refresh]);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const siteId = await AsyncStorage.getItem("selectedSiteId");
      
      if (!siteId) {
        Alert.alert('Error', 'No se ha seleccionado una obra');
        return;
      }

      console.log('Cargando compras para el sitio:', siteId);
      const purchases = await getPurchasesBySite(siteId);
      console.log('Compras obtenidas:', purchases);

      // Filtrar y mapear compras por estado
      const pending = purchases
        .filter(p => p.status === 'pending')
        .map(mapPurchaseToTask);
      
      const purchased = purchases
        .filter(p => p.status === 'purchased')
        .map(mapPurchaseToTask);
      
      const delivered = purchases
        .filter(p => p.status === 'delivered')
        .map(mapPurchaseToTask);

      setPendingItems(pending);
      setPurchasedItems(purchased);
      setDeliveredItems(delivered);
    } catch (error) {
      console.error('Error al cargar compras:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes de compra');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Cargando solicitudes...</Text>
      </SafeAreaView>
    );
  }

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
        {pendingItems.length === 0 && purchasedItems.length === 0 && deliveredItems.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4 mt-20">
            <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              No hay solicitudes de compra
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Agrega una nueva solicitud presionando el botón +
            </Text>
          </View>
        ) : (
          <>
            {pendingItems.length > 0 && (
              <TaskSection
                title="Solicitado"
                tasks={pendingItems}
                routePrefix="purchases"
              />
            )}

            {purchasedItems.length > 0 && (
              <TaskSection
                title="Comprado"
                tasks={purchasedItems}
                routePrefix="purchases"
              />
            )}

            {deliveredItems.length > 0 && (
              <TaskSection
                title="Llegó"
                tasks={deliveredItems}
                routePrefix="purchases"
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

export interface Purchase {
  id: string;
  product: string;
  description?: string;
  quantity: number;
  unity?: string;
  price?: number;
  supplier?: string;
  category: string;
  priority?: string;
  status: 'pending' | 'purchased' | 'delivered';
  purchase_date?: string;
  delivery_date?: string;
}

interface PurchaseCardProps {
  purchase: Purchase;
}

// Mapeo de categorías a colores
const getCategoryColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase();
  switch (normalizedCategory) {
    case "materiales":
      return "#F59E0B"; // amber-500
    case "herramientas":
      return "#10B981"; // emerald-500
    case "equipamiento":
      return "#3B82F6"; // blue-500
    case "seguridad":
      return "#EF4444"; // red-500
    case "oficina":
      return "#A855F7"; // purple-500
    case "otros":
      return "#6B7280"; // gray-500
    default:
      return "#6B7280";
  }
};

// Formatear precio
const formatPrice = (price?: number): string => {
  if (!price || price === 0) return "$ 0,00";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
};

const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase }) => {

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-3 mb-3 mr-3 w-80"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
      onPress={() => router.push(`/purchases/${purchase.id}`)}
      activeOpacity={0.7}
    >
      {/* Header con título */}
      <View className="mb-1">
        <Text className="text-gray-900 font-medium text-sm leading-tight" numberOfLines={1}>
          {purchase.product}
        </Text>
      </View>

      {/* Información principal compacta */}
      <View className="mb-2">
        <View className="flex-row justify-between items-center mb-0.5">
          <Text className="text-gray-500 text-xs">Cantidad:</Text>
          <Text className="text-gray-900 font-medium text-xs">
            {purchase.quantity} {purchase.unity || 'u'}
          </Text>
        </View>
        
        <View className="flex-row justify-between items-center mb-0.5">
          <Text className="text-gray-500 text-xs">Precio:</Text>
          <Text className="text-green-600 font-semibold text-xs">
            {formatPrice(purchase.price)}
          </Text>
        </View>
        
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-500 text-xs">Proveedor:</Text>
          <Text className="text-gray-900 font-medium text-xs truncate ml-2 flex-1 text-right" numberOfLines={1}>
            {purchase.supplier || "No especificado"}
          </Text>
        </View>
      </View>

      {/* Footer con categoría */}
      <View className="flex-row justify-between items-center">
        <View 
          className="px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: getCategoryColor(purchase.category) }}
        >
          <Text className="text-white text-xs font-medium">
            {purchase.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PurchaseCard;

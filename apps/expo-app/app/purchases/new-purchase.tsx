import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ========= MOCKDATA ========== */

/* mock data for categories */
interface Category {
  name: string;
  color: string;
}

const materiales: Category = { name: "MATERIALES", color: "bg-amber-500" };
const herramientas: Category = { name: "HERRAMIENTAS", color: "bg-emerald-500" };
const equipamiento: Category = { name: "EQUIPAMIENTO", color: "bg-blue-500" };
const seguridad: Category = { name: "SEGURIDAD", color: "bg-red-500" };
const oficina: Category = { name: "OFICINA", color: "bg-purple-500" };
const categories: Category[] = [materiales, herramientas, equipamiento, seguridad, oficina];

/* mock data for priorities */
interface Priority {
  name: string;
  color: string;
}

const baja: Priority = { name: "BAJA", color: "bg-green-500" };
const normal: Priority = { name: "NORMAL", color: "bg-blue-500" };
const alta: Priority = { name: "ALTA", color: "bg-orange-500" };
const urgente: Priority = { name: "URGENTE", color: "bg-red-500" };
const priorities: Priority[] = [baja, normal, alta, urgente];

/* mock data for units */
interface Unit {
  name: string;
  value: string;
}

const units: Unit[] = [
  { name: "UNIDADES", value: "unidades" },
  { name: "METROS", value: "metros" },
  { name: "KG", value: "kg" },
  { name: "LITROS", value: "litros" },
  { name: "M²", value: "m2" },
  { name: "M³", value: "m3" },
];

export default function NewPurchase() {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("unidades");
  const [selectedUnitName, setSelectedUnitName] = useState("UNIDADES");
  const [category, setCategory] = useState("MATERIALES");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  
  // Estados para modales
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Función para seleccionar una unidad
  const selectUnit = (unit: Unit) => {
    setSelectedUnit(unit.value);
    setSelectedUnitName(unit.name);
    setShowUnitModal(false);
  };

  const handleSave = () => {
    console.log("Guardando solicitud de compra:", {
      itemName,
      quantity,
      unit: selectedUnit,
      category,
      description,
      supplier,
      priority,
    });
    // Aquí implementarías la lógica para guardar la solicitud
    router.push("/purchases/purchases");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Nueva Compra</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-500 px-4 py-2 rounded-full"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-white font-medium">Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Nombre del artículo */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Nombre del artículo</Text>
          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder="Ej: Cemento Portland"
            className="bg-white p-4 rounded-xl border border-gray-200"
          />
        </View>

        {/* Cantidad y Unidad */}
        <View className="mb-4 flex-row">
          <View className="flex-1 mr-2">
            <Text className="text-gray-700 font-medium mb-2">Cantidad</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Ej: 50"
              keyboardType="numeric"
              className="bg-white p-4 rounded-xl border border-gray-200"
            />
          </View>
          
          <View className="flex-1 ml-2">
            <Text className="text-gray-700 font-medium mb-2">Unidad</Text>
            <TouchableOpacity
              onPress={() => setShowUnitModal(true)}
              className="bg-white flex-row items-center justify-between p-4 rounded-xl border border-gray-200"
            >
              <Text className="text-gray-800">{selectedUnitName}</Text>
              <Ionicons name="chevron-down" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categoría */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Categoría</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                onPress={() => setCategory(cat.name)}
                className={`px-3 py-2 rounded-full ${
                  category === cat.name ? cat.color : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    category === cat.name ? "text-white" : "text-gray-800"
                  }`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Descripción/Especificaciones */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripción/Especificaciones</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Especificaciones técnicas, marca preferida, etc."
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-24"
            textAlignVertical="top"
          />
        </View>

        {/* Proveedor sugerido */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Proveedor sugerido (opcional)</Text>
          <TextInput
            value={supplier}
            onChangeText={setSupplier}
            placeholder="Nombre del proveedor"
            className="bg-white p-4 rounded-xl border border-gray-200"
          />
        </View>

        {/* Prioridad */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Prioridad</Text>
          <View className="flex-row flex-wrap gap-2">
            {priorities.map((pri) => (
              <TouchableOpacity
                key={pri.name}
                onPress={() => setPriority(pri.name)}
                className={`px-3 py-2 rounded-full ${
                  priority === pri.name ? pri.color : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    priority === pri.name ? "text-white" : "text-gray-800"
                  }`}
                >
                  {pri.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal para seleccionar unidades */}
      <Modal
        visible={showUnitModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-4 py-2 mb-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowUnitModal(false)}>
              <Text className="text-red-500 font-medium">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-gray-800 font-bold text-lg">
              Seleccionar Unidad
            </Text>
            <TouchableOpacity onPress={() => setShowUnitModal(false)}>
              <Text className="text-blue-500 font-medium">OK</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4">
            {units.map((unit) => {
              const isSelected = selectedUnit === unit.value;
              return (
                <TouchableOpacity
                  key={unit.value}
                  onPress={() => selectUnit(unit)}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text className="text-gray-800 font-medium">{unit.name}</Text>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
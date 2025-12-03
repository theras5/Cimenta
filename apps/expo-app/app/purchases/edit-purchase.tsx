import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPurchaseById, updatePurchase } from "../../services/purchaseService";

/* ========= MOCKDATA ========== */

interface Category {
  name: string;
  value: string;
  color: string;
}

const materiales: Category = { name: "MATERIALES", value: "materiales", color: "bg-amber-500" };
const herramientas: Category = { name: "HERRAMIENTAS", value: "herramientas", color: "bg-emerald-500" };
const equipamiento: Category = { name: "EQUIPAMIENTO", value: "equipamiento", color: "bg-blue-500" };
const seguridad: Category = { name: "SEGURIDAD", value: "seguridad", color: "bg-red-500" };
const oficina: Category = { name: "OFICINA", value: "oficina", color: "bg-purple-500" };
const otros: Category = { name: "OTROS", value: "otros", color: "bg-gray-500" };
const categories: Category[] = [materiales, herramientas, equipamiento, seguridad, oficina, otros];

interface Priority {
  name: string;
  color: string;
}

const priorities: Priority[] = [
  { name: "baja", color: "bg-green-500" },
  { name: "normal", color: "bg-blue-500" },
  { name: "alta", color: "bg-orange-500" },
  { name: "urgente", color: "bg-red-500" },
];

interface Unit {
  name: string;
  value: string;
}

const units: Unit[] = [
  { name: "UNIDADES", value: "u" },
  { name: "METROS", value: "m" },
  { name: "KG", value: "kg" },
  { name: "LITROS", value: "l" },
  { name: "M²", value: "m2" },
  { name: "M³", value: "m3" },
];

export default function EditPurchase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("u");
  const [selectedUnitName, setSelectedUnitName] = useState("UNIDADES");
  const [category, setCategory] = useState("materiales");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [priority, setPriority] = useState("normal");
  const [price, setPrice] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const loadPurchaseData = async () => {
    try {
      setLoadingData(true);
      const purchase: any = await getPurchaseById(id);
      
      setItemName(purchase.product || "");
      setQuantity(purchase.quantity?.toString() || "");
      setSelectedUnit(purchase.unity || "u");
      setSelectedUnitName(units.find(u => u.value === purchase.unity)?.name || "UNIDADES");
      setCategory(purchase.category || "materiales");
      setDescription(purchase.description || "");
      setSupplier(purchase.supplier || "");
      setPriority(purchase.priority || "normal");
      setPrice(purchase.price?.toString() || "");
      
      // Cargar imágenes existentes
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        const imagesResponse = await fetch(`${API_URL}/purchases/${id}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setSelectedImages(imagesData.map((img: any) => img.image_url));
        }
      } catch (error) {
        console.log('Error al cargar imágenes:', error);
      }
    } catch (error) {
      console.error('Error al cargar compra:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la compra');
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadPurchaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectUnit = (unit: Unit) => {
    setSelectedUnit(unit.value);
    setSelectedUnitName(unit.name);
    setShowUnitModal(false);
  };

  const handleSave = async () => {
    // Validación
    if (!itemName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del artículo');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Por favor ingresa una cantidad válida');
      return;
    }

    try {
      setIsLoading(true);

      const updateData = {
        product: itemName.trim(),
        quantity: parseInt(quantity),
        unity: selectedUnit,
        category: category,
        description: description.trim(),
        supplier: supplier.trim(),
        priority: priority,
        price: price ? parseFloat(price) : undefined,
      };

      await updatePurchase(id, updateData);

      Alert.alert(
        'Éxito',
        'La solicitud de compra ha sido actualizada',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error al actualizar compra:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al actualizar la compra';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Editar Compra</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          className={`${isLoading ? 'bg-blue-300' : 'bg-blue-500'} px-4 py-2 rounded-full`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-medium">Guardar</Text>
          )}
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
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                className={`px-3 py-2 rounded-full ${
                  category === cat.value ? cat.color : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    category === cat.value ? "text-white" : "text-gray-800"
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

        {/* Precio estimado */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Precio estimado (opcional)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Ej: 15000"
            keyboardType="numeric"
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

        {/* Imágenes adjuntas */}
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Imágenes adjuntas</Text>
          <Text className="text-gray-500 text-xs mb-3">
            Nota: Las imágenes existentes se mantendrán. La edición de imágenes está en desarrollo.
          </Text>
          
          {/* Mostrar imágenes seleccionadas */}
          {selectedImages.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {selectedImages.map((uri, index) => (
                <View key={index} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-300">
                  <Image
                    source={{ uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Espaciado inferior */}
        <View className="h-8" />
      </ScrollView>

      {/* Modal de selección de unidad */}
      <Modal
        visible={showUnitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowUnitModal(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-center text-lg font-semibold text-gray-800">
                Seleccionar Unidad
              </Text>
            </View>
            <ScrollView className="max-h-96">
              {units.map((unit) => (
                <TouchableOpacity
                  key={unit.value}
                  onPress={() => selectUnit(unit)}
                  className={`p-4 border-b border-gray-100 ${
                    selectedUnit === unit.value ? "bg-blue-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedUnit === unit.value
                        ? "text-blue-600 font-semibold"
                        : "text-gray-800"
                    }`}
                  >
                    {unit.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowUnitModal(false)}
              className="p-4 bg-gray-100"
            >
              <Text className="text-center text-gray-600 font-medium">
                Cancelar
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

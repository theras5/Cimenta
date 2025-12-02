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
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createPurchase } from "../../services/purchaseService";
import { useAuth } from "@/context/AuthContext";

/* ========= MOCKDATA ========== */

/* mock data for categories */
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

/* mock data for priorities */
interface Priority {
  name: string;
  color: string;
}

const baja: Priority = { name: "baja", color: "bg-green-500" };
const normal: Priority = { name: "normal", color: "bg-blue-500" };
const alta: Priority = { name: "alta", color: "bg-orange-500" };
const urgente: Priority = { name: "urgente", color: "bg-red-500" };
const priorities: Priority[] = [baja, normal, alta, urgente];

/* mock data for units */
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

export default function NewPurchase() {
  const { user } = useAuth();
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("u");
  const [selectedUnitName, setSelectedUnitName] = useState("UNIDADES");
  const [category, setCategory] = useState("materiales"); // Valor del enum purchase_category
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [priority, setPriority] = useState("normal");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para modales
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Función para seleccionar una unidad
  const selectUnit = (unit: Unit) => {
    setSelectedUnit(unit.value);
    setSelectedUnitName(unit.name);
    setShowUnitModal(false);
  };

  // Función para seleccionar imágenes
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Máximo 5 imágenes
      }
    } catch (error) {
      console.error('Error al seleccionar imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  // Función para eliminar una imagen
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Función para convertir imagen a base64
  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('Convirtiendo imagen:', uri);
      
      // Comprimir y redimensionar la imagen
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Redimensionar a máximo 1200px de ancho
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      console.log('Imagen manipulada:', manipulatedImage.uri);

      // Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Base64 generado, longitud:', base64.length);

      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error al convertir imagen:', error);
      throw new Error('No se pudo procesar la imagen');
    }
  };

  // Función para subir imágenes al backend
  const uploadPurchaseImages = async (purchaseId: string, imageUris: string[]) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      
      if (!API_URL) {
        throw new Error('API URL no configurada');
      }

      console.log(`Iniciando subida de ${imageUris.length} imágenes para purchase ${purchaseId}`);
      
      for (let i = 0; i < imageUris.length; i++) {
        console.log(`Procesando imagen ${i + 1}/${imageUris.length}`);
        
        const imageBase64 = await convertImageToBase64(imageUris[i]);
        
        console.log(`Enviando imagen ${i + 1} al servidor...`);
        
        const response = await fetch(`${API_URL}/purchases/${purchaseId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_data: imageBase64,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error al subir imagen ${i + 1}:`, errorText);
          throw new Error(`Error al subir imagen ${i + 1}: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Imagen ${i + 1}/${imageUris.length} subida correctamente:`, result);
      }
    } catch (error) {
      console.error('Error en uploadPurchaseImages:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!itemName || !quantity) {
      Alert.alert('Error', 'Por favor completa el nombre y la cantidad');
      return;
    }

    setIsLoading(true);

    try {
      // Obtener site_id de AsyncStorage
      const site_id = await AsyncStorage.getItem("selectedSiteId");

      if (!site_id) {
        Alert.alert('Error', 'No se ha seleccionado una obra');
        setIsLoading(false);
        return;
      }

      // Verificar que el usuario esté autenticado
      if (!user || !user.id) {
        Alert.alert('Error', 'No se ha iniciado sesión. Por favor inicia sesión nuevamente.');
        setIsLoading(false);
        return;
      }

      // Crear la solicitud de compra
      const purchaseData = {
        product: itemName,
        description: description || undefined,
        quantity: parseInt(quantity),
        unity: selectedUnit,
        supplier: supplier || undefined,
        category: category, // Ya es el valor correcto del enum
        priority: priority,
        status: 'pending' as const,
        site_id,
        user_id: user.id,
      };

      console.log("Creando solicitud de compra:", purchaseData);
      
      const createdPurchase = await createPurchase(purchaseData);
      
      console.log("Compra creada exitosamente:", createdPurchase);

      // Subir imágenes si hay alguna seleccionada
      if (selectedImages.length > 0 && createdPurchase.id) {
        try {
          console.log(`Subiendo ${selectedImages.length} imágenes...`);
          await uploadPurchaseImages(createdPurchase.id, selectedImages);
          console.log("Imágenes subidas exitosamente");
        } catch (imageError) {
          console.error('Error al subir imágenes:', imageError);
          // No fallar la creación de la compra si falla la subida de imágenes
          Alert.alert(
            'Advertencia',
            'La compra se creó correctamente pero hubo un problema al subir las imágenes. Puedes intentar agregarlas después.',
            [{ text: 'Entendido' }]
          );
        }
      }

      Alert.alert(
        'Éxito', 
        selectedImages.length > 0 
          ? 'Solicitud de compra creada correctamente con las imágenes'
          : 'Solicitud de compra creada correctamente',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Navegar de vuelta y forzar refresh
            router.replace({
              pathname: '/purchases/purchases',
              params: { refresh: Date.now().toString() }
            });
          }
        }]
      );
    } catch (error) {
      console.error('Error al guardar:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo crear la solicitud de compra';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
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
          
          {/* Botones para agregar imágenes */}
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={pickImages}
              className="flex-1 bg-blue-100 border-2 border-blue-300 border-dashed p-4 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="images-outline" size={24} color="#3B82F6" />
              <Text className="text-blue-600 font-medium ml-2">Galería</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={takePhoto}
              className="flex-1 bg-green-100 border-2 border-green-300 border-dashed p-4 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="camera-outline" size={24} color="#10B981" />
              <Text className="text-green-600 font-medium ml-2">Cámara</Text>
            </TouchableOpacity>
          </View>

          {/* Mostrar imágenes seleccionadas */}
          {selectedImages.length > 0 && (
            <ScrollView horizontal className="flex-row gap-2">
              {selectedImages.map((uri, index) => (
                <View key={index} className="relative">
                  <Image
                    source={{ uri }}
                    className="w-24 h-24 rounded-xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {selectedImages.length === 0 && (
            <View className="bg-gray-100 border-2 border-gray-200 border-dashed p-6 rounded-xl items-center">
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text className="text-gray-500 text-sm mt-2">Sin imágenes adjuntas</Text>
              <Text className="text-gray-400 text-xs mt-1">Máximo 5 imágenes</Text>
            </View>
          )}
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
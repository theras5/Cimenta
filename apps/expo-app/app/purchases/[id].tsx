import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getPurchaseById, deletePurchase } from '@/services/purchaseService';

interface Purchase {
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
  created_at?: string;
  site?: {
    address: string;
  };
  user_id?: string;
}

interface PurchaseImage {
  id: string;
  image_url: string;
  purchase_id: string;
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'purchased': return 'Comprado';
    case 'delivered': return 'Entregado';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500';
    case 'purchased': return 'bg-blue-500';
    case 'delivered': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getCategoryLabel = (category: string) => {
  const categories: { [key: string]: string } = {
    materiales: 'Materiales',
    herramientas: 'Herramientas',
    equipamiento: 'Equipamiento',
    seguridad: 'Seguridad',
    oficina: 'Oficina',
    otros: 'Otros',
  };
  return categories[category?.toLowerCase()] || category;
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    materiales: 'bg-amber-500',
    herramientas: 'bg-emerald-500',
    equipamiento: 'bg-blue-500',
    seguridad: 'bg-red-500',
    oficina: 'bg-purple-500',
    otros: 'bg-gray-500',
  };
  return colors[category?.toLowerCase()] || 'bg-gray-500';
};

const getPriorityColor = (priority: string) => {
  const colors: { [key: string]: string } = {
    baja: 'bg-green-500',
    normal: 'bg-blue-500',
    alta: 'bg-orange-500',
    urgente: 'bg-red-500',
  };
  return colors[priority?.toLowerCase()] || 'bg-gray-500';
};

const getUnityLabel = (unity: string) => {
  const labels: { [key: string]: string } = {
    u: 'Unidades',
    m: 'Metros',
    kg: 'Kg',
    l: 'Litros',
    m2: 'M²',
    m3: 'M³',
  };
  return labels[unity?.toLowerCase()] || unity;
};

export default function PurchaseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [images, setImages] = useState<PurchaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPurchaseDetails();
  }, [id]);

  useEffect(() => {
    console.log('Estado de images actualizado:', images.length, images);
  }, [images]);

  const loadPurchaseDetails = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseById(id);
      console.log('Purchase data:', data);
      setPurchase(data);
      
      // Cargar imágenes si existen
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        console.log('=== CARGANDO IMÁGENES ===');
        console.log('Purchase ID:', id);
        console.log('API_URL:', API_URL);
        console.log('URL completa:', `${API_URL}/purchases/${id}/images`);
        
        const imagesResponse = await fetch(`${API_URL}/purchases/${id}/images`);
        console.log('Response status:', imagesResponse.status);
        console.log('Response ok:', imagesResponse.ok);
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          console.log('Imágenes recibidas del servidor:', imagesData);
          console.log('Cantidad de imágenes:', imagesData.length);
          console.log('Array de imágenes:', JSON.stringify(imagesData, null, 2));
          setImages(imagesData);
        } else {
          const errorText = await imagesResponse.text();
          console.log('Error response:', errorText);
        }
      } catch (imgError) {
        console.log('Error al cargar imágenes:', imgError);
      }
      
      console.log('=== FIN CARGA IMÁGENES ===');
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles de la compra');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/purchases/edit-purchase?id=${id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar solicitud',
      `¿Estás seguro de que deseas eliminar "${purchase?.product}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePurchase(id);
              Alert.alert('Éxito', 'Solicitud eliminada correctamente');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la solicitud');
              console.error('Error al eliminar:', error);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Cargando detalles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!purchase) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-gray-600 mt-4">No se encontró la compra</Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity className="mr-4" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-xl flex-1" numberOfLines={1}>
            {purchase.product}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={handleEdit}
            className="bg-blue-500 px-3 py-2 rounded-lg"
            disabled={deleting}
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDelete}
            className="bg-red-500 px-3 py-2 rounded-lg"
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Estado */}
        <View className="bg-white px-4 py-4 mb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-600 font-medium">Estado</Text>
            <View className={`${getStatusColor(purchase.status)} px-4 py-2 rounded-full`}>
              <Text className="text-white font-semibold">
                {getStatusLabel(purchase.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Información Principal */}
        <View className="bg-white px-4 py-4 mb-2">
          <Text className="text-gray-800 font-bold text-lg mb-4">Información del Producto</Text>
          
          {/* Producto */}
          <View className="mb-4">
            <Text className="text-gray-500 text-sm mb-1">Producto</Text>
            <Text className="text-gray-800 font-semibold text-base">{purchase.product}</Text>
          </View>

          {/* Descripción */}
          {purchase.description && (
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-1">Descripción</Text>
              <Text className="text-gray-800 text-base">{purchase.description}</Text>
            </View>
          )}

          {/* Cantidad */}
          <View className="mb-4">
            <Text className="text-gray-500 text-sm mb-1">Cantidad</Text>
            <Text className="text-gray-800 font-semibold text-base">
              {purchase.quantity} {purchase.unity ? getUnityLabel(purchase.unity) : ''}
            </Text>
          </View>

          {/* Categoría */}
          <View className="mb-4">
            <Text className="text-gray-500 text-sm mb-1">Categoría</Text>
            <View className={`${getCategoryColor(purchase.category)} self-start px-3 py-1 rounded-full`}>
              <Text className="text-white font-medium">
                {getCategoryLabel(purchase.category)}
              </Text>
            </View>
          </View>

          {/* Prioridad */}
          {purchase.priority && (
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-1">Prioridad</Text>
              <View className={`${getPriorityColor(purchase.priority)} self-start px-3 py-1 rounded-full`}>
                <Text className="text-white font-medium">
                  {purchase.priority.charAt(0).toUpperCase() + purchase.priority.slice(1)}
                </Text>
              </View>
            </View>
          )}

          {/* Precio */}
          {purchase.price !== undefined && purchase.price > 0 && (
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-1">Precio Estimado</Text>
              <Text className="text-gray-800 font-semibold text-lg">
                ${purchase.price.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Total */}
          {purchase.price !== undefined && purchase.price > 0 && (
            <View className="mb-4 border-t border-gray-200 pt-4">
              <Text className="text-gray-500 text-sm mb-1">Total Estimado</Text>
              <Text className="text-blue-600 font-bold text-xl">
                ${(purchase.price * purchase.quantity).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Proveedor */}
        {purchase.supplier && (
          <View className="bg-white px-4 py-4 mb-2">
            <Text className="text-gray-800 font-bold text-lg mb-3">Proveedor</Text>
            <View className="flex-row items-center">
              <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="business" size={20} color="#3B82F6" />
              </View>
              <Text className="text-gray-800 text-base">{purchase.supplier}</Text>
            </View>
          </View>
        )}

        {/* Fechas */}
        {(purchase.purchase_date || purchase.delivery_date || purchase.created_at) && (
          <View className="bg-white px-4 py-4 mb-2">
            <Text className="text-gray-800 font-bold text-lg mb-3">Fechas</Text>
            
            {purchase.created_at && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="calendar-outline" size={20} color="#6B7280" className="mr-2" />
                <View className="ml-2">
                  <Text className="text-gray-500 text-sm">Fecha de solicitud</Text>
                  <Text className="text-gray-800">
                    {new Date(purchase.created_at).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            )}

            {purchase.purchase_date && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" className="mr-2" />
                <View className="ml-2">
                  <Text className="text-gray-500 text-sm">Fecha de compra</Text>
                  <Text className="text-gray-800">
                    {new Date(purchase.purchase_date).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            )}

            {purchase.delivery_date && (
              <View className="flex-row items-center">
                <Ionicons name="cube-outline" size={20} color="#8B5CF6" className="mr-2" />
                <View className="ml-2">
                  <Text className="text-gray-500 text-sm">Fecha de entrega</Text>
                  <Text className="text-gray-800">
                    {new Date(purchase.delivery_date).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Imágenes */}
        {images.length > 0 && (
          <View className="bg-white px-4 py-4 mb-2">
            <Text className="text-gray-800 font-bold text-lg mb-3">
              Imágenes ({images.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((img, index) => (
                <View key={img.id || index} className="mr-3">
                  <Image
                    source={{ uri: img.image_url }}
                    className="w-40 h-40 rounded-lg"
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Error al cargar imagen:', img.image_url, error.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('Imagen cargada correctamente:', img.image_url);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Debug: Mostrar si no hay imágenes */}
        {images.length === 0 && (
          <View className="bg-white px-4 py-4 mb-2">
            <Text className="text-gray-500 text-sm">No hay imágenes para esta compra</Text>
          </View>
        )}

        {/* Espaciado inferior */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
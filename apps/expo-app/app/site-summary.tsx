import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskService } from '../services/taskService';
import { getPurchasesBySite } from '../services/purchaseService';

interface ISiteSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  categoriesBreakdown: {
    [category: string]: {
      count: number;
      percentage: number;
    };
  };
  purchasedMaterials: number;
  totalPurchases: number;
  purchasedPercentage: number;
  totalSpent: number;
}

function SiteSummary() {
  const [summary, setSummary] = useState<ISiteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const siteId = await AsyncStorage.getItem('selectedSiteId');
      const siteAddress = await AsyncStorage.getItem('selectedSiteAddress');
      
      if (!siteId) {
        Alert.alert('Error', 'No se ha seleccionado una obra');
        router.back();
        return;
      }

      setSiteName(siteAddress || 'Obra');

      // Obtener todas las tareas de la obra
      const tasks = await TaskService.getTasksBySite(siteId);
      
      // Calcular estadísticas de tareas
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calcular breakdown por categorías
      const categoriesBreakdown: { [key: string]: { count: number; percentage: number } } = {};
      tasks.forEach(task => {
        const category = task.category || 'Sin categoría';
        if (!categoriesBreakdown[category]) {
          categoriesBreakdown[category] = { count: 0, percentage: 0 };
        }
        categoriesBreakdown[category].count++;
      });

      // Calcular porcentajes
      Object.keys(categoriesBreakdown).forEach(category => {
        categoriesBreakdown[category].percentage = totalTasks > 0 
          ? Math.round((categoriesBreakdown[category].count / totalTasks) * 100)
          : 0;
      });

      // Obtener compras de la obra
      const purchases = await getPurchasesBySite(siteId);
      const totalPurchases = purchases.length;
      const purchasedMaterials = purchases.filter(p => p.status === 'purchased' || p.status === 'delivered').length;
      const purchasedPercentage = totalPurchases > 0 
        ? Math.round((purchasedMaterials / totalPurchases) * 100)
        : 0;

      // Calcular dinero gastado (solo compras purchased o delivered)
      const totalSpent = purchases
        .filter(p => p.status === 'purchased' || p.status === 'delivered')
        .reduce((sum, p) => sum + (p.price || 0), 0);

      setSummary({
        totalTasks,
        completedTasks,
        completionPercentage,
        categoriesBreakdown,
        purchasedMaterials,
        totalPurchases,
        purchasedPercentage,
        totalSpent,
      });
    } catch (error) {
      console.error('Error al cargar resumen:', error);
      Alert.alert('Error', 'No se pudo cargar el resumen de la obra');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'pintura': '#FF2D92',
      'plomeria': '#FF9500', 
      'electricidad': '#007AFF',
      'construccion': '#8A2BE2',
    };
    return colors[category.toLowerCase()] || '#10B981';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Cargando resumen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-gray-600 mt-4">No se pudo cargar el resumen</Text>
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
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity className="mr-4" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-gray-800 font-bold text-xl">Resumen de Obra</Text>
          <Text className="text-gray-500 text-sm">{siteName}</Text>
        </View>
        <TouchableOpacity onPress={loadSummary}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Resumen General de Tareas */}
        <View className="bg-white px-4 py-4 mb-2">
          <Text className="text-gray-800 font-bold text-lg mb-4">Tareas</Text>
          
          {/* Círculo de progreso */}
          <View className="items-center mb-6">
            <View className="relative items-center justify-center">
              <View className="w-40 h-40 rounded-full bg-gray-200 items-center justify-center">
                <View 
                  className="w-32 h-32 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: summary.completionPercentage >= 75 ? '#10B981' :
                      summary.completionPercentage >= 50 ? '#F59E0B' :
                      summary.completionPercentage >= 25 ? '#EF4444' : '#9CA3AF'
                  }}
                >
                  <Text className="text-white font-bold text-4xl">{summary.completionPercentage}%</Text>
                  <Text className="text-white text-sm">Completado</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Estadísticas de tareas */}
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Total</Text>
              <Text className="text-gray-800 font-bold text-2xl">{summary.totalTasks}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Completadas</Text>
              <Text className="text-green-600 font-bold text-2xl">{summary.completedTasks}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Pendientes</Text>
              <Text className="text-orange-600 font-bold text-2xl">
                {summary.totalTasks - summary.completedTasks}
              </Text>
            </View>
          </View>
        </View>

        {/* Categorías de Tareas */}
        <View className="bg-white px-4 py-4 mb-2">
          <Text className="text-gray-800 font-bold text-lg mb-4">Categorías de Tareas</Text>
          {Object.keys(summary.categoriesBreakdown).length > 0 ? (
            Object.entries(summary.categoriesBreakdown)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([category, data]) => (
                <View key={category} className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <View 
                        className="w-4 h-4 rounded mr-2"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      <Text className="text-gray-700 font-medium capitalize">{category}</Text>
                    </View>
                    <Text className="text-gray-600">
                      {data.count} ({data.percentage}%)
                    </Text>
                  </View>
                  {/* Barra de progreso */}
                  <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${data.percentage}%`,
                        backgroundColor: getCategoryColor(category)
                      }}
                    />
                  </View>
                </View>
              ))
          ) : (
            <Text className="text-gray-500 text-center">No hay tareas registradas</Text>
          )}
        </View>

        {/* Materiales Comprados */}
        <View className="bg-white px-4 py-4 mb-2">
          <Text className="text-gray-800 font-bold text-lg mb-4">Materiales Comprados</Text>
          
          <View className="items-center mb-4">
            <View className="w-full max-w-xs">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Comprados</Text>
                <Text className="text-gray-600">
                  {summary.purchasedMaterials} de {summary.totalPurchases}
                </Text>
              </View>
              <View className="h-6 bg-gray-200 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${summary.purchasedPercentage}%` }}
                />
              </View>
              <Text className="text-center text-gray-700 font-bold text-xl mt-2">
                {summary.purchasedPercentage}%
              </Text>
            </View>
          </View>

          <View className="flex-row justify-around pt-4 border-t border-gray-200">
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Total Solicitudes</Text>
              <Text className="text-gray-800 font-bold text-xl">{summary.totalPurchases}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Comprados</Text>
              <Text className="text-blue-600 font-bold text-xl">{summary.purchasedMaterials}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-1">Pendientes</Text>
              <Text className="text-orange-600 font-bold text-xl">
                {summary.totalPurchases - summary.purchasedMaterials}
              </Text>
            </View>
          </View>

          {/* Dinero gastado */}
          <View className="mt-4 pt-4 border-t border-gray-200">
            <View className="bg-green-50 rounded-lg p-4">
              <Text className="text-gray-600 text-sm mb-1 text-center">Dinero Gastado</Text>
              <Text className="text-green-700 font-bold text-2xl text-center">
                ${summary.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text className="text-gray-500 text-xs text-center mt-1">ARS (Pesos Argentinos)</Text>
            </View>
          </View>
        </View>

        {/* Espaciado inferior */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

export default SiteSummary;

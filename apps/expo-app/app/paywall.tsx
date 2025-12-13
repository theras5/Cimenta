import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/userService';

export default function PaywallScreen() {
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Esperar a que el auth esté listo
    if (authLoading) return;
    
    if (!user?.id) {
      router.replace('/(auth)/sign-in');
      return;
    }
    
    // Solo verificar una vez (o cuando vuelve de MP con params)
    const preapprovalId = params.preapproval_id as string | undefined;
    if (!hasCheckedRef.current || preapprovalId) {
      hasCheckedRef.current = true;
      checkPremiumStatus(preapprovalId);
    }
  }, [user, authLoading]);

  const checkPremiumStatus = async (preapprovalId?: string) => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);
      
      // Si viene de MP (deep link), esperar un poco para que el webhook procese
      if (preapprovalId) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const isPremium = await UserService.checkPremiumStatus(user.id);
      
      if (isPremium) {
        router.replace('/select-site');
        return;
      }

      // Si venía de MP y no es premium, reintentar
      if (preapprovalId && !isPremium) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const isPremiumRetry = await UserService.checkPremiumStatus(user.id);
        
        if (isPremiumRetry) {
          router.replace('/select-site');
          return;
        }
      }
    } catch (error) {
      console.error('Error verificando premium:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'No se pudo obtener la información del usuario');
      return;
    }

    setSubscribing(true);

    try {
      const result = await UserService.startSubscription(user.id, user.email);

      if (result.cancelled) {
        // Usuario canceló, no hacer nada
        return;
      }

      if (result.success) {
        // Verificar si el pago fue exitoso
        hasCheckedRef.current = false; // Permitir re-check
        await checkPremiumStatus();
      } else {
        Alert.alert('Error', 'No se pudo completar la suscripción. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      Alert.alert('Error', 'Hubo un problema al procesar tu suscripción.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleGoBack = () => {
    // Usar replace en lugar de back porque no hay historial
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-600 mt-4">
          {params.preapproval_id ? 'Verificando tu pago...' : 'Cargando...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6"
      >
        {/* Header */}
        <View className="items-center mt-8 mb-6">
          <View className="bg-blue-100 rounded-full p-6 mb-4">
            <Ionicons name="diamond" size={48} color="#2563eb" />
          </View>
          <Text className="text-3xl font-bold text-gray-800 text-center">
            Cimenta Premium
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Desbloquea todas las funcionalidades
          </Text>
        </View>

        {/* Features */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Incluye:
          </Text>
          
          <FeatureItem 
            icon="checkmark-circle" 
            text="Gestión ilimitada de obras" 
          />
          <FeatureItem 
            icon="checkmark-circle" 
            text="Seguimiento de tareas y compras" 
          />
          <FeatureItem 
            icon="checkmark-circle" 
            text="Reportes y estadísticas" 
          />
          <FeatureItem 
            icon="checkmark-circle" 
            text="Soporte prioritario" 
          />
          <FeatureItem 
            icon="checkmark-circle" 
            text="Actualizaciones continuas" 
          />
        </View>

        {/* Precio */}
        <View className="bg-blue-600 rounded-2xl p-6 mb-6">
          <Text className="text-white text-center text-lg mb-2">
            Suscripción mensual
          </Text>
          <View className="flex-row justify-center items-baseline">
            <Text className="text-white text-4xl font-bold">
              $9.999
            </Text>
            <Text className="text-blue-200 text-lg ml-1">
              /mes
            </Text>
          </View>
          <Text className="text-blue-200 text-center text-sm mt-2">
            Cancela cuando quieras
          </Text>
        </View>

        {/* Botón suscribirse */}
        <TouchableOpacity
          className={`py-4 rounded-xl mb-4 ${subscribing ? 'bg-gray-400' : 'bg-blue-600'}`}
          onPress={handleSubscribe}
          disabled={subscribing}
        >
          {subscribing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Suscribirme ahora
            </Text>
          )}
        </TouchableOpacity>

        {/* Link para volver */}
        <TouchableOpacity
          className="py-3"
          onPress={handleGoBack}
        >
          <Text className="text-gray-500 text-center">
            Volver
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <Ionicons name={icon as any} size={24} color="#22c55e" />
      <Text className="text-gray-700 ml-3 text-base">{text}</Text>
    </View>
  );
}

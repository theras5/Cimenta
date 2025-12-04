import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { images } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  // Aquí puedes agregar lógica para verificar si el usuario está autenticado
  // const isAuthenticated  = 
  const isAuthenticated = true; // Cambia esto por tu lógica de autenticación real
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Mascota/Logo con borde morado */}
        <View className="p-4 mb-10">
          <Image 
            source={images.welcome} 
            style={{ width: 350, height: 350 }} 
            resizeMode="contain"
          />
        </View>

        {/* Textos de bienvenida */}
        <Text className="text-gray-600 text-2xl font-medium mb-1">
          Bienvenido a
        </Text>
        <Text className="text-blue-600 text-6xl font-black mb-16">
          Cimenta
        </Text>

        {/* Botones */}
        <View className="w-full max-w-md">
          {/* Botón iniciar sesión */}
          <TouchableOpacity
            className="bg-blue-700 py-4 rounded-xl mb-4 shadow-md"
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text className="text-white font-semibold text-center text-lg">
              Iniciar sesión
            </Text>
          </TouchableOpacity>

          {/* Botón registrarse */}
          <TouchableOpacity
            className="border-2 border-blue-700 bg-white py-4 rounded-xl shadow-sm"
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text className="text-gray-700 font-semibold text-center text-lg">
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
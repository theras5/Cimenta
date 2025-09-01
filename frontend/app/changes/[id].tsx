import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

export default function ChangeDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 border-b border-gray-200">
        <TouchableOpacity className="mr-4" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-gray-800 font-bold text-xl">Detalles de solicitud #{id}</Text>
      </View>
      
      <View className="flex-1 p-4">
        <Text className="text-lg mb-2">Detalles de la solicitud de cambio</Text>
        <Text className="text-gray-500 mb-4">ID: {id}</Text>
        
        {/* Aquí irían los detalles de la solicitud */}
      </View>
    </SafeAreaView>
  );
}
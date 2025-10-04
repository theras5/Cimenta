// @ts-nocheck
// Este es un archivo de demostración para mostrar todos los estilos de date pickers
// Puedes copiar el código que más te guste a tus archivos de tareas

import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { QuickDateSelector } from './QuickDateSelector';
import { SmartDateInput } from './SmartDateInput';
import { AnimatedDateSelector } from './AnimatedDateSelector';

export default function DatePickerDemo() {
  const [date1, setDate1] = useState<Date | null>(null);
  const [date2, setDate2] = useState<Date | null>(new Date());
  const [date3, setDate3] = useState<Date | null>(null);
  const [date4, setDate4] = useState<Date | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      <ScrollView className="flex-1 px-4 py-6">
        <Text className="text-gray-800 font-bold text-3xl mb-8 text-center">
          🎨 Date Picker Styles
        </Text>

        {/* Estilo 1: QuickDateSelector - Elegante y funcional */}
        <View className="mb-8">
          <Text className="text-gray-600 font-medium text-lg mb-4">
            1️⃣ QuickDateSelector - Elegante
          </Text>
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <QuickDateSelector
              date={date1}
              onDateChange={setDate1}
              label="Fecha de inicio"
              minimumDate={new Date()}
              placeholder="Toca para seleccionar fecha"
            />
          </View>
        </View>

        {/* Estilo 2: SmartDateInput - Con validación */}
        <View className="mb-8">
          <Text className="text-gray-600 font-medium text-lg mb-4">
            2️⃣ SmartDateInput - Inteligente
          </Text>
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <SmartDateInput
              date={date2}
              onDateChange={setDate2}
              label="Fecha límite"
              required
              helperText="Esta fecha aparece con formato inteligente"
              minimumDate={new Date()}
            />
          </View>
        </View>

        {/* Estilo 3: AnimatedDateSelector - Con animaciones */}
        <View className="mb-8">
          <Text className="text-gray-600 font-medium text-lg mb-4">
            3️⃣ AnimatedDateSelector - Animado
          </Text>
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <AnimatedDateSelector
              date={date3}
              onDateChange={setDate3}
              label="Fecha de finalización"
              minimumDate={new Date()}
              placeholder="¡Selecciona y observa la animación!"
            />
          </View>
        </View>

        {/* Estilo 4: Combinación personalizada */}
        <View className="mb-8">
          <Text className="text-gray-600 font-medium text-lg mb-4">
            4️⃣ Ejemplo en contexto real
          </Text>
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <Text className="text-gray-800 font-bold text-xl mb-6">
              📝 Nueva Tarea
            </Text>
            
            <QuickDateSelector
              date={date4}
              onDateChange={setDate4}
              label="¿Cuándo necesitas completar esto?"
              minimumDate={new Date()}
              placeholder="Selecciona una fecha"
              required
            />
            
            {date4 && (
              <View className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: '#34C75915' }}>
                <Text style={{ color: '#34C759', fontWeight: '600' }}>
                  ✅ ¡Perfecto! Tu tarea está programada
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Información sobre los estilos */}
        <View className="mb-12">
          <Text className="text-gray-600 font-medium text-lg mb-4">
            🎯 ¿Cuál usar?
          </Text>
          <View className="bg-blue-50 rounded-3xl p-6">
            <View className="space-y-3">
              <Text className="text-blue-800">
                <Text className="font-semibold">QuickDateSelector:</Text> Para uso general, elegante y con botones rápidos
              </Text>
              <Text className="text-blue-800">
                <Text className="font-semibold">SmartDateInput:</Text> Cuando necesitas validaciones y feedback inteligente
              </Text>
              <Text className="text-blue-800">
                <Text className="font-semibold">AnimatedDateSelector:</Text> Para interfaces premium con animaciones
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
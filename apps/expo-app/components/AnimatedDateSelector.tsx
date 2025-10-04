// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickDateSelector } from './QuickDateSelector';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedDateSelectorProps {
  date: Date | null;
  onDateChange: (date: Date) => void;
  label: string;
  minimumDate?: Date;
  placeholder?: string;
  required?: boolean;
}

export const AnimatedDateSelector: React.FC<AnimatedDateSelectorProps> = ({
  date,
  onDateChange,
  label,
  minimumDate,
  placeholder = "Seleccionar fecha",
  required = false,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const [shimmerValue] = useState(new Animated.Value(-1));
  
  useEffect(() => {
    if (date) {
      // Animación de confirmación cuando se selecciona una fecha
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Efecto shimmer sutil
      Animated.loop(
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [date]);

  const handleDateChange = (newDate: Date) => {
    onDateChange(newDate);
    
    // Haptic feedback simulation con una pequeña animación
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const formatSmartDate = (date: Date | null) => {
    if (!date) return null;
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) {
      return {
        main: `Hoy a las ${timeStr}`,
        sub: "¡Perfecto para hoy!",
        icon: "today",
        color: "#34C759",
        bgGradient: ['#34C75910', '#34C75920'],
      };
    } else if (isTomorrow) {
      return {
        main: `Mañana a las ${timeStr}`,
        sub: "Un buen momento",
        icon: "sunny",
        color: "#FF9500",
        bgGradient: ['#FF950010', '#FF950020'],
      };
    } else if (diffDays > 0 && diffDays <= 7) {
      return {
        main: `${date.toLocaleDateString('es-ES', { weekday: 'long' })} a las ${timeStr}`,
        sub: `En ${diffDays} días`,
        icon: "calendar",
        color: "#007AFF",
        bgGradient: ['#007AFF10', '#007AFF20'],
      };
    } else if (diffDays < 0) {
      return {
        main: `${Math.abs(diffDays)} días atrás`,
        sub: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        }),
        icon: "time",
        color: "#FF3B30",
        bgGradient: ['#FF3B3010', '#FF3B3020'],
      };
    } else {
      return {
        main: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'long' 
        }),
        sub: `a las ${timeStr}`,
        icon: "calendar",
        color: "#AF52DE",
        bgGradient: ['#AF52DE10', '#AF52DE20'],
      };
    }
  };

  const smartDate = formatSmartDate(date);

  const shimmerTranslateX = shimmerValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View className="mb-6">
      <Text className="text-gray-800 font-semibold text-base mb-4">
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <QuickDateSelector
          date={date}
          onDateChange={handleDateChange}
          label=""
          minimumDate={minimumDate}
          placeholder={placeholder}
          required={false}
        />
      </Animated.View>

      {/* Información adicional animada */}
      {date && smartDate && (
        <Animated.View 
          className="mt-4 p-4 rounded-2xl relative overflow-hidden"
          style={{
            backgroundColor: smartDate.bgGradient[0],
            borderWidth: 1,
            borderColor: smartDate.color + '20',
            transform: [{ scale: scaleValue }],
          }}
        >
          {/* Efecto shimmer sutil */}
          <Animated.View
            className="absolute top-0 left-0 right-0 bottom-0 opacity-30"
            style={{
              transform: [{ translateX: shimmerTranslateX }],
              background: `linear-gradient(90deg, transparent, ${smartDate.color}10, transparent)`,
            }}
          />
          
          <View className="flex-row items-center">
            <View 
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: smartDate.color + '20' }}
            >
              <Ionicons 
                name={smartDate.icon} 
                size={24} 
                color={smartDate.color} 
              />
            </View>
            <View className="flex-1">
              <Text 
                className="font-semibold text-base"
                style={{ color: smartDate.color }}
              >
                {smartDate.main}
              </Text>
              <Text 
                className="text-sm mt-1"
                style={{ color: smartDate.color + 'AA' }}
              >
                {smartDate.sub}
              </Text>
            </View>
            <View className="items-center">
              <Ionicons 
                name="checkmark-circle" 
                size={28} 
                color={smartDate.color} 
              />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};
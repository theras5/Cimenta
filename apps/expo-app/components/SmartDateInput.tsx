// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImprovedDateTimePicker } from './ImprovedDateTimePicker';

interface SmartDateInputProps {
  date: Date | null;
  onDateChange: (date: Date) => void;
  label: string;
  minimumDate?: Date;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const SmartDateInput: React.FC<SmartDateInputProps> = ({
  date,
  onDateChange,
  label,
  minimumDate,
  placeholder = "Toca para seleccionar",
  required = false,
  error,
  helperText,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (date) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [date]);

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
        sub: date.toLocaleDateString('es-ES', { weekday: 'long' }),
        icon: "today",
        color: "#10B981", // verde
      };
    } else if (isTomorrow) {
      return {
        main: `Mañana a las ${timeStr}`,
        sub: date.toLocaleDateString('es-ES', { weekday: 'long' }),
        icon: "sunny",
        color: "#F59E0B", // amarillo
      };
    } else if (diffDays > 0 && diffDays <= 7) {
      return {
        main: `${date.toLocaleDateString('es-ES', { weekday: 'long' })} a las ${timeStr}`,
        sub: `En ${diffDays} días`,
        icon: "calendar",
        color: "#3B82F6", // azul
      };
    } else if (diffDays < 0) {
      return {
        main: `${Math.abs(diffDays)} días atrás`,
        sub: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        icon: "time",
        color: "#EF4444", // rojo
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
        color: "#6366F1", // índigo
      };
    }
  };

  const smartDate = formatSmartDate(date);
  const hasError = !!error;
  const borderColor = hasError ? "#EF4444" : (date ? smartDate?.color : "#E5E7EB");

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="bg-white rounded-xl border-2 p-4"
        style={{
          borderColor: borderColor,
          shadowColor: date ? smartDate?.color : "#000",
          shadowOffset: { width: 0, height: date ? 2 : 1 },
          shadowOpacity: date ? 0.1 : 0.05,
          shadowRadius: date ? 4 : 2,
          elevation: date ? 3 : 1,
        }}
      >
        {date && smartDate ? (
          <Animated.View 
            style={{ opacity: fadeAnim }}
            className="flex-row items-center"
          >
            <View className="flex-row items-center flex-1">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${smartDate.color}20` }}
              >
                <Ionicons 
                  name={smartDate.icon} 
                  size={20} 
                  color={smartDate.color} 
                />
              </View>
              <View className="flex-1">
                <Text 
                  className="text-gray-900 font-semibold text-base"
                  numberOfLines={1}
                >
                  {smartDate.main}
                </Text>
                <Text 
                  className="text-gray-500 text-sm mt-1"
                  numberOfLines={1}
                >
                  {smartDate.sub}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Animated.View>
        ) : (
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-base">
                {placeholder}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Error o helper text */}
      {(error || helperText) && (
        <View className="mt-2 ml-1">
          {error ? (
            <View className="flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text className="text-red-500 text-sm ml-1">{error}</Text>
            </View>
          ) : (
            <Text className="text-gray-500 text-sm">{helperText}</Text>
          )}
        </View>
      )}

      {/* Date Picker Modal */}
      <ImprovedDateTimePicker
        visible={showPicker}
        value={date || new Date()}
        onConfirm={(selectedDate) => {
          onDateChange(selectedDate);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
        minimumDate={minimumDate}
        mode="datetime"
        title={label}
      />
    </View>
  );
};
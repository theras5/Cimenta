// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImprovedDateTimePicker } from './ImprovedDateTimePicker';

interface QuickDateSelectorProps {
  date: Date | null;
  onDateChange: (date: Date) => void;
  label: string;
  minimumDate?: Date;
  placeholder?: string;
  required?: boolean;
}

export const QuickDateSelector: React.FC<QuickDateSelectorProps> = ({
  date,
  onDateChange,
  label,
  minimumDate,
  placeholder = "Seleccionar fecha",
  required = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder;
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `Hoy - ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Mañana - ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getDateIcon = () => {
    if (!date) return "calendar-outline";
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now;
    
    if (isToday) return "today-outline";
    if (isPast) return "time-outline";
    return "calendar-outline";
  };

  const getDateColor = () => {
    if (!date) return "#8E8E93"; // gray neutro
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isPast = date < now;
    
    if (isToday) return "#1C1C1E"; // negro suave
    if (isPast) return "#8E8E93"; // gris
    return "#1C1C1E"; // negro suave
  };

  return (
    <View className="mb-1">
      <Text className="text-gray-800 font-medium text-sm mb-2">
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      
      {/* Selector minimalista */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="bg-white flex-row items-center justify-between rounded-xl mb-3"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: date ? "#E5E5EA" : "#E5E5EA",
          backgroundColor: "#FFFFFF",
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons 
            name={getDateIcon()} 
            size={20} 
            color={date ? getDateColor() : "#8E8E93"} 
            style={{ marginRight: 12 }}
          />
          <Text 
            className={`text-base ${
              date ? "text-gray-900" : "text-gray-400"
            }`}
            numberOfLines={1}
            style={{ fontSize: 15 }}
          >
            {formatDate(date)}
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#C7C7CC" 
        />
      </TouchableOpacity>

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
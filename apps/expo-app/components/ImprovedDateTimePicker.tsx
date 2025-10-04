// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface ImprovedDateTimePickerProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  title?: string;
}

export const ImprovedDateTimePicker: React.FC<ImprovedDateTimePickerProps> = ({
  visible,
  value,
  onConfirm,
  onCancel,
  minimumDate,
  mode = 'datetime',
  title = 'Seleccionar fecha y hora',
}) => {
  const [tempDate, setTempDate] = useState(value);
  const [currentMode, setCurrentMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  // Para Android, manejamos el picker paso a paso
  const handleAndroidDatePicker = () => {
    setCurrentMode('date');
    setShowPicker(true);
  };

  const handleAndroidTimePicker = () => {
    setCurrentMode('time');
    setShowPicker(true);
  };

  const onDateTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    
    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      if (currentMode === 'date') {
        // Mantener la hora actual pero cambiar la fecha
        const newDate = new Date(tempDate);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setTempDate(newDate);
        
        // En Android, después de seleccionar fecha, mostrar selector de hora
        if (Platform.OS === 'android' && mode === 'datetime') {
          setTimeout(() => {
            handleAndroidTimePicker();
          }, 100);
        }
      } else {
        // Mantener la fecha actual pero cambiar la hora
        const newDate = new Date(tempDate);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setTempDate(newDate);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(tempDate);
  };

  const handleCancel = () => {
    setTempDate(value); // Resetear a valor original
    onCancel();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Para iOS usamos el picker nativo en modal
  if (Platform.OS === 'ios') {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-t-3xl">
            {/* Header estilo iOS */}
            <View 
              className="flex-row justify-between items-center px-6 py-5 border-b" 
              style={{ 
                backgroundColor: '#F9F9F9', 
                borderBottomColor: '#E5E5EA', 
                borderBottomWidth: 0.5 
              }}
            >
              <TouchableOpacity onPress={handleCancel} style={{ minWidth: 70 }}>
                <Text style={{ color: '#FF3B30', fontSize: 17, fontWeight: '400' }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={{ color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                {title}
              </Text>
              <TouchableOpacity onPress={handleConfirm} style={{ minWidth: 70, alignItems: 'flex-end' }}>
                <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* Preview minimalista */}
            <View className="px-6 py-4" style={{ backgroundColor: '#F9F9F9' }}>
              <View className="flex-row items-center justify-center space-x-4">
                <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '500' }}>
                  {formatDate(tempDate)}
                </Text>
                {mode === 'datetime' && (
                  <>
                    <View className="w-1 h-1 rounded-full" style={{ backgroundColor: '#C7C7CC' }} />
                    <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '500' }}>
                      {formatTime(tempDate)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* iOS Date Picker */}
            <View className="px-4 pb-8 bg-white">
              <DateTimePicker
                value={tempDate}
                mode={mode === 'datetime' ? 'datetime' : mode}
                display="wheels"
                onChange={onDateTimeChange}
                minimumDate={minimumDate}
                locale="es-ES"
                textColor="#000000"
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Para Android
  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-t-3xl">
            {/* Header estilo iOS */}
            <View 
              className="flex-row justify-between items-center px-6 py-5 border-b" 
              style={{ 
                backgroundColor: '#F9F9F9', 
                borderBottomColor: '#E5E5EA', 
                borderBottomWidth: 0.5 
              }}
            >
              <TouchableOpacity onPress={handleCancel} style={{ minWidth: 70 }}>
                <Text style={{ color: '#FF3B30', fontSize: 17, fontWeight: '400' }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={{ color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                {title}
              </Text>
              <TouchableOpacity onPress={handleConfirm} style={{ minWidth: 70, alignItems: 'flex-end' }}>
                <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* Contenido principal */}
            <View className="px-6 py-6">
              {/* Preview simple */}
              <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#F9F9F9' }}>
                <View className="items-center">
                  <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '500' }}>
                    {formatDate(tempDate)}
                  </Text>
                  {mode === 'datetime' && (
                    <Text style={{ color: '#8E8E93', fontSize: 14, fontWeight: '400', marginTop: 4 }}>
                      {formatTime(tempDate)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Botones simples para cambiar fecha y hora */}
              <View className="space-y-2">
                <TouchableOpacity
                  onPress={handleAndroidDatePicker}
                  className="bg-white rounded-xl p-4 flex-row items-center justify-between"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E5EA',
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
                    <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '500', marginLeft: 12 }}>
                      Cambiar fecha
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </TouchableOpacity>

                {mode === 'datetime' && (
                  <TouchableOpacity
                    onPress={handleAndroidTimePicker}
                    className="bg-white rounded-xl p-4 flex-row items-center justify-between"
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E5EA',
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={20} color="#8E8E93" />
                      <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '500', marginLeft: 12 }}>
                        Cambiar hora
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                  </TouchableOpacity>
                )}
              </View>


            </View>
          </View>
        </View>
      </Modal>

      {/* Android Date/Time Picker */}
      {showPicker && (
        <DateTimePicker
          value={tempDate}
          mode={currentMode}
          display="default"
          onChange={onDateTimeChange}
          minimumDate={minimumDate}
        />
      )}
    </>
  );
};
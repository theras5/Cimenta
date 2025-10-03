import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface SimpleDatePickerProps {
  visible: boolean;
  date: Date;
  onDateSelect: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
}

export default function SimpleDatePicker({
  visible,
  date,
  onDateSelect,
  onCancel,
  minimumDate = new Date()
}: SimpleDatePickerProps) {
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth());
  const [selectedDay, setSelectedDay] = useState(date.getDate());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onDateSelect(newDate);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 20,
          width: '100%',
          maxWidth: 400,
          maxHeight: '80%'
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            Seleccionar Fecha
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {/* Año */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>Año</Text>
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {years.map(year => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    activeOpacity={0.3}
                    style={{
                      padding: 10,
                      backgroundColor: selectedYear === year ? '#3B82F6' : 'transparent',
                      borderRadius: 8,
                      marginBottom: 5
                    }}
                  >
                    <Text style={{
                      textAlign: 'center',
                      color: selectedYear === year ? 'white' : 'black'
                    }}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Mes */}
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>Mes</Text>
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedMonth(index)}
                    activeOpacity={0.3}
                    style={{
                      padding: 10,
                      backgroundColor: selectedMonth === index ? '#3B82F6' : 'transparent',
                      borderRadius: 8,
                      marginBottom: 5
                    }}
                  >
                    <Text style={{
                      textAlign: 'center',
                      fontSize: 12,
                      color: selectedMonth === index ? 'white' : 'black'
                    }}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Día */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>Día</Text>
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.3}
                    style={{
                      padding: 10,
                      backgroundColor: selectedDay === day ? '#3B82F6' : 'transparent',
                      borderRadius: 8,
                      marginBottom: 5
                    }}
                  >
                    <Text style={{
                      textAlign: 'center',
                      color: selectedDay === day ? 'white' : 'black'
                    }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Botones */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.3}
              style={{
                flex: 1,
                padding: 15,
                backgroundColor: '#EF4444',
                borderRadius: 8,
                marginRight: 10
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.3}
              style={{
                flex: 1,
                padding: 15,
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                marginLeft: 10
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
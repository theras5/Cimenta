// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = 40;

interface CustomDateTimePickerProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  visible,
  value,
  onConfirm,
  onCancel,
  minimumDate,
}) => {
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedHour, setSelectedHour] = useState(() => {
    const hour = value.getHours();
    return hour < 8 ? 8 : hour > 20 ? 20 : hour; // Limitar entre 8 y 20
  });
  const [selectedMinute, setSelectedMinute] = useState(Math.round(value.getMinutes() / 5) * 5);

  // Referencias para los ScrollViews
  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);

  // Actualizar estados cuando cambie el value prop
  useEffect(() => {
    if (visible) {
      setSelectedDay(value.getDate());
      setSelectedMonth(value.getMonth());
      setSelectedYear(value.getFullYear());
      const hour = value.getHours();
      setSelectedHour(hour < 8 ? 8 : hour > 20 ? 20 : hour); // Limitar entre 8 y 20
      setSelectedMinute(Math.round(value.getMinutes() / 5) * 5);
    }
  }, [value, visible]);

  const today = new Date();
  const todayYear = today.getFullYear();
  
  // Generar arrays de opciones
  const years = Array.from({ length: 10 }, (_, i) => todayYear + i);
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 a 20 (8AM a 8PM)
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  // Calcular días disponibles en el mes actual
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    onConfirm(newDate);
  };

  // Componente de rueda estilo iOS - SIN AUTO-SCROLL DESPUÉS DE INICIALIZAR
  const WheelPicker = ({ 
    items, 
    selectedValue, 
    onValueChange, 
    renderItem,
    scrollRef,
    visible
  }: {
    items: any[];
    selectedValue: any;
    onValueChange: (value: any) => void;
    renderItem: (item: any) => string;
    scrollRef?: any;
    visible?: boolean;
  }) => {
    const [initialized, setInitialized] = useState(false);

    // SOLO scroll inicial cuando se abre
    useEffect(() => {
      if (visible && !initialized) {
        const index = items.findIndex(item => item === selectedValue);
        if (index !== -1 && scrollRef?.current) {
          setTimeout(() => {
            // Verificar nuevamente que scrollRef.current existe antes de usar scrollToOffset
            if (scrollRef.current && scrollRef.current.scrollToOffset) {
              scrollRef.current.scrollToOffset({
                offset: index * ITEM_HEIGHT,
                animated: false,
              });
            }
            setInitialized(true);
          }, 100);
        }
      }
      
      if (!visible) {
        setInitialized(false);
      }
    }, [visible]);

    const handleScrollEnd = (event) => {
      const y = event.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      
      if (index >= 0 && index < items.length) {
        const selectedItem = items[index];
        if (selectedItem !== undefined) {
          onValueChange(selectedItem);
        }
      }
    };

    const renderPickerItem = ({ item, index }) => {
      // Estilo uniforme para todos los elementos para evitar re-renders
      return (
        <View
          style={{
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 12,
          }}
        >
          <Text 
            style={{
              fontSize: 19,
              fontWeight: '500',
              color: '#333',
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            {renderItem(item)}
          </Text>
        </View>
      );
    };

    return (
      <View className="flex-1 mx-1" style={{ height: 200 }}>
        {/* Línea de selección */}
        <View 
          style={{ 
            position: 'absolute', 
            top: 80, 
            left: 10, 
            right: 10, 
            height: ITEM_HEIGHT,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: '#007AFF',
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            borderRadius: 6,
            zIndex: 1,
          }} 
          pointerEvents="none"
        />
        
        <FlatList
          ref={scrollRef}
          data={items}
          renderItem={renderPickerItem}
          keyExtractor={(item, index) => `${item}-${index}`}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={handleScrollEnd}
          getItemLayout={(data, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          contentContainerStyle={{
            paddingVertical: 80,
          }}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl overflow-hidden">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50">
            <TouchableOpacity onPress={onCancel} className="py-1">
              <Text className="text-red-500 font-semibold text-lg">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-gray-900 font-bold text-xl">Seleccionar Fecha</Text>
            <TouchableOpacity onPress={handleConfirm} className="py-1">
              <Text className="text-blue-500 font-semibold text-lg">Confirmar</Text>
            </TouchableOpacity>
          </View>

          {/* Date Section */}
          <View className="bg-white">
            {/* Date Headers */}
            <View className="flex-row px-4 pt-6 pb-2">
              <View className="flex-1">
                <Text className="text-center text-gray-700 font-bold text-lg">Día</Text>
              </View>
              <View className="flex-1">
                <Text className="text-center text-gray-700 font-bold text-lg">Mes</Text>
              </View>
              <View className="flex-1">
                <Text className="text-center text-gray-700 font-bold text-lg">Año</Text>
              </View>
            </View>

            {/* Date Pickers */}
            <View className="flex-row px-2" style={{ height: 220 }}>
              {/* Day */}
              <View className="flex-1">
                <WheelPicker
                  items={days}
                  selectedValue={selectedDay}
                  onValueChange={setSelectedDay}
                  renderItem={(day) => day.toString()}
                  scrollRef={dayScrollRef}
                  visible={visible}
                />
              </View>

              {/* Month */}
              <View className="flex-1">
                <WheelPicker
                  items={Array.from({ length: 12 }, (_, i) => i)}
                  selectedValue={selectedMonth}
                  onValueChange={(month) => {
                    setSelectedMonth(month);
                    // Ajustar el día si el nuevo mes tiene menos días
                    const maxDaysInNewMonth = new Date(selectedYear, month + 1, 0).getDate();
                    if (selectedDay > maxDaysInNewMonth) {
                      setSelectedDay(maxDaysInNewMonth);
                    }
                  }}
                  renderItem={(month) => months[month]}
                  scrollRef={monthScrollRef}
                  visible={visible}
                />
              </View>

              {/* Year */}
              <View className="flex-1">
                <WheelPicker
                  items={years}
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  renderItem={(year) => year.toString()}
                  scrollRef={yearScrollRef}
                  visible={visible}
                />
              </View>
            </View>
          </View>

          {/* Time Section */}
          <View className="border-t border-gray-200 bg-white">
            {/* Time Headers */}
            <View className="flex-row px-4 pt-4 pb-2">
              <View className="flex-1">
                <Text className="text-center text-gray-700 font-bold text-lg">Hora</Text>
              </View>
              <View className="flex-1">
                <Text className="text-center text-gray-700 font-bold text-lg">Minuto</Text>
              </View>
            </View>

            {/* Time Pickers */}
            <View className="flex-row px-2 pb-6" style={{ height: 220 }}>
              {/* Hour */}
              <View className="flex-1">
                <WheelPicker
                  items={hours}
                  selectedValue={selectedHour}
                  onValueChange={setSelectedHour}
                  renderItem={(hour) => hour.toString().padStart(2, '0')}
                  scrollRef={hourScrollRef}
                  visible={visible}
                />
              </View>

              {/* Minute */}
              <View className="flex-1">
                <WheelPicker
                  items={minuteOptions}
                  selectedValue={selectedMinute}
                  onValueChange={setSelectedMinute}
                  renderItem={(minute) => minute.toString().padStart(2, '0')}
                  scrollRef={minuteScrollRef}
                  visible={visible}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
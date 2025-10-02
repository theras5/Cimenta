import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../../hooks/useTasks';

const { width, height } = Dimensions.get('window');

// Calcular dimensiones responsivas para todos los dispositivos
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;

// Categorías de dispositivos más completas
const IS_VERY_SMALL = width < 350;  // iPhone SE, dispositivos muy pequeños
const IS_SMALL_DEVICE = width < 375; // iPhone 8, pequeños
const IS_MEDIUM_DEVICE = width >= 375 && width <= 414; // iPhone estándar
const IS_LARGE_DEVICE = width > 414 && width < 768; // iPhone Plus, Android grandes
const IS_TABLET = width >= 768; // iPads, tablets

// Función para calcular dimensiones adaptivas
const getResponsiveDimensions = () => {
  if (IS_VERY_SMALL) {
    return {
      calendarHeight: Math.max(280, height * 0.35),
      timeSlotHeight: 20,
      calendarPadding: 10,
      timeColumnWidth: 38,
    };
  } else if (IS_SMALL_DEVICE) {
    return {
      calendarHeight: Math.max(300, height * 0.38),
      timeSlotHeight: 22,
      calendarPadding: 12,
      timeColumnWidth: 42,
    };
  } else if (IS_MEDIUM_DEVICE) {
    return {
      calendarHeight: Math.max(320, height * 0.40),
      timeSlotHeight: 24,
      calendarPadding: 14,
      timeColumnWidth: 48,
    };
  } else if (IS_LARGE_DEVICE) {
    return {
      calendarHeight: Math.max(360, height * 0.42),
      timeSlotHeight: 26,
      calendarPadding: 16,
      timeColumnWidth: 52,
    };
  } else { // IS_TABLET
    return {
      calendarHeight: Math.max(400, height * 0.45),
      timeSlotHeight: 30,
      calendarPadding: 20,
      timeColumnWidth: 60,
    };
  }
};

const dimensions = getResponsiveDimensions();
const CALENDAR_HEIGHT = dimensions.calendarHeight;
const TIME_SLOT_HEIGHT = dimensions.timeSlotHeight;
const CALENDAR_PADDING = dimensions.calendarPadding;
const TIME_COLUMN_WIDTH = dimensions.timeColumnWidth;

// Calcular valores escalados para el diseño responsivo
const scale = width / 375; // Escala basada en iPhone 8 (375px)
const verticalScale = height / 667; // Escala vertical basada en iPhone 8 (667px)

// Valores escalados para diferentes elementos
const SCALED_VALUES = {
  eventTitleFontSize: Math.max(10, Math.min(16, 12 * scale)),
  eventTimeFontSize: Math.max(8, Math.min(14, 10 * scale)),
  timeTextFontSize: Math.max(8, Math.min(13, 10 * scale)),
  eventPadding: Math.max(6, Math.min(12, 8 * scale)),
  eventBorderRadius: Math.max(12, Math.min(20, 16 * scale)), // Aún más redondeado
  eventBorderWidth: Math.max(3, Math.min(5, 4 * scale)), // Un poco más ancho
  eventMinHeight: Math.max(35, Math.min(60, 45 * verticalScale)),
  containerPadding: Math.max(4, Math.min(15, CALENDAR_PADDING * 0.8)),
  eventsContainerPadding: Math.max(2, Math.min(5, 3 * scale)),
};

export default function HomeScreen() {
  const { tasks, isLoading, fetchTasks } = useTasks();
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Colores por categoría
  const categoryColors: { [key: string]: string } = {
    'pintura': '#FF2D92',
    'plomeria': '#FF9500', 
    'electricidad': '#007AFF',
    'construccion': '#8A2BE2',
    'default': '#999999'
  };

  const getCategoryColor = (category: string): string => {
    const normalizedCategory = category.toLowerCase().trim();
    return categoryColors[normalizedCategory] || categoryColors['default'];
  };

  // Cargar tareas al montar el componente
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Convertir tareas del día actual en eventos
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const events = tasks
        .filter(task => {
          if (!task.start_date || !task.end_date) return false;
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          
          // Verificar si la tarea está programada para hoy
          return (
            (startDate.toDateString() === today.toDateString()) ||
            (endDate.toDateString() === today.toDateString()) ||
            (startDate <= todayStart && endDate >= todayEnd)
          );
        })
        .map((task, index) => {
          const startDate = new Date(task.start_date!);
          const endDate = new Date(task.end_date!);
          
          const startHour = startDate.getHours();
          const startMinute = startDate.getMinutes();
          const endHour = endDate.getHours();
          const endMinute = endDate.getMinutes();
          
          // Si las fechas tienen horarios específicos (no son 00:00), usarlos
          const hasStartTime = startHour !== 0 || startMinute !== 0;
          const hasEndTime = endHour !== 0 || endMinute !== 0;
          
          const taskStartTime = hasStartTime 
            ? `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
            : '09:00';
          
          const taskEndTime = hasEndTime 
            ? `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
            : '17:00';
          
          return {
            id: task.id,
            title: task.title,
            category: task.category || 'default',
            color: getCategoryColor(task.category || 'default'),
            startTime: taskStartTime,
            endTime: taskEndTime,
          };
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime)); // Ordenar por hora de inicio

      setTodayEvents(events.slice(0, 4)); // Mostrar máximo 4 eventos
    } else {
      setTodayEvents([]);
    }
  }, [tasks]);

  // Refrescar datos cuando se enfoca la pantalla
  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  // Función para refrescar datos
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // Funciones de navegación
  const navigateToTasks = () => router.push("/(tabs)/tasks");
  const navigateToPurchases = () => router.push("/purchases/purchases");
  const navigateToCalendar = () => router.push("/(tabs)/teamCalendar");
  const navigateToGantt = () => router.push("/gantt/project-1");
  const navigateToNewTask = () => router.push("/tasks/new-task");
  const navigateToNewPurchase = () => router.push("/purchases/new-purchase");
  const navigateToNewUpdate = () => router.push("/updates/new-update");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Hoy</Text>

        {/* Today's Schedule - Clickeable para ir al calendario */}
        <TouchableOpacity onPress={navigateToCalendar} activeOpacity={0.7}>
          <View style={styles.scheduleCard}>
            {/* Time Column - igual que el calendario real */}
            <View style={[styles.timeColumn, { top: CALENDAR_PADDING }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.timeSlot, { height: TIME_SLOT_HEIGHT }]}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Grid Lines Background - mismo patrón que el calendario real */}
            <View style={[styles.gridContainer, { left: TIME_COLUMN_WIDTH }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.gridLine, { top: index * TIME_SLOT_HEIGHT + CALENDAR_PADDING }]} />
              ))}
            </View>

            {/* Events - Mostrar datos reales */}
            <View style={[styles.eventsContainer, { 
              marginLeft: TIME_COLUMN_WIDTH, 
              height: CALENDAR_HEIGHT - CALENDAR_PADDING * 2,
              width: SCREEN_WIDTH - TIME_COLUMN_WIDTH - CALENDAR_PADDING * 2 - (IS_TABLET ? 50 : IS_LARGE_DEVICE ? 40 : 35)
            }]}>
              {todayEvents.length > 0 ? (
                todayEvents.map((event, index) => {
                  const timeToMinutes = (time: string) => {
                    const [hours, minutes] = time.split(':').map(Number);
                    return hours * 60 + minutes;
                  };

                  const getEventPosition = (startTime: string, endTime: string) => {
                    const startMinutes = timeToMinutes(startTime);
                    const endMinutes = timeToMinutes(endTime);
                    const calendarStartMinutes = 8 * 60; // 8:00 AM en minutos
                    
                    // Calcular la posición relativa desde las 8:00 AM (igual que calendario real)
                    const relativeStartMinutes = startMinutes - calendarStartMinutes;
                    const durationMinutes = endMinutes - startMinutes;
                    
                    // Usar la misma proporción que el calendario real pero escalada
                    const pixelsPerMinute = TIME_SLOT_HEIGHT / 60; // Escalado según nuestro TIME_SLOT_HEIGHT
                    const top = relativeStartMinutes * pixelsPerMinute;
                    
                    // Si la duración es 0, usar altura mínima pequeña, sino usar altura mínima normal (igual que calendario real)
                    const minHeight = durationMinutes === 0 ? Math.max(TIME_SLOT_HEIGHT * 0.5, 15) : Math.max(TIME_SLOT_HEIGHT * 0.8, 20);
                    const height = Math.max(durationMinutes * pixelsPerMinute, minHeight);
                    
                    return { top, height };
                  };
                  
                  const position = getEventPosition(event.startTime, event.endTime);
                  
                  // Lógica que usa todo el ancho disponible del contenedor con responsive design
                  const getEventLayout = (index: number) => {
                    // Calcular el ancho real disponible basado en el tipo de dispositivo
                    const marginSafety = IS_TABLET ? 50 : IS_LARGE_DEVICE ? 45 : IS_MEDIUM_DEVICE ? 40 : 35;
                    const availableWidth = SCREEN_WIDTH - TIME_COLUMN_WIDTH - CALENDAR_PADDING * 2 - marginSafety;
                    
                    // Verificar eventos superpuestos
                    const overlappingEvents = todayEvents.filter((otherEvent, otherIndex) => {
                      if (otherIndex === index) return true;
                      
                      const currentStart = timeToMinutes(event.startTime);
                      const currentEnd = timeToMinutes(event.endTime);
                      const otherStart = timeToMinutes(otherEvent.startTime);
                      const otherEnd = timeToMinutes(otherEvent.endTime);
                      
                      return currentStart < otherEnd && currentEnd > otherStart;
                    });
                    
                    const numOverlapping = overlappingEvents.length;
                    const eventIndex = overlappingEvents.findIndex(e => e.id === event.id);
                    
                    let eventWidth: number;
                    let leftOffset = 0;
                    
                    // Calcular ancho de contenedor dinámicamente
                    const containerWidth = width - TIME_COLUMN_WIDTH - (CALENDAR_PADDING * 2);
                    const eventMaxWidth = containerWidth - 45; // Usar casi todo el ancho menos un pequeño margen para los bordes redondeados
                    
                    if (numOverlapping === 1) {
                      // Evento único - usar todo el ancho disponible hasta las líneas
                      eventWidth = eventMaxWidth;
                    } else {
                      // Eventos superpuestos - ajustar proporcionalmente al tamaño de pantalla
                      const baseWidth = eventMaxWidth * 0.85; // Base ligeramente reducida para superpuestos
                      const offsetScale = Math.max(0.5, Math.min(1, width / 375)); // Escala entre 0.5 y 1
                      
                      eventWidth = baseWidth;
                      leftOffset = eventIndex * (12 * offsetScale); // Offset escalado
                      eventWidth = Math.max(eventWidth - leftOffset, eventMaxWidth * 0.60); // Mínimo 60%
                    }
                    
                    return {
                      left: Math.max(0, Math.min(leftOffset, availableWidth * 0.3)), // Asegurar que no salga del contenedor
                      width: Math.max(eventWidth, eventMaxWidth * 0.45), // Usar ancho fijo basado en containerWidth
                      zIndex: index + 1
                    };
                  };
                  
                  const layout = getEventLayout(index);
                  
                  return (
                    <View key={event.id}>
                      {/* Fondo del evento - igual que calendario real */}
                      <View
                        style={[
                          styles.eventBackground,
                          {
                            top: position.top + CALENDAR_PADDING,
                            height: position.height,
                            left: layout.left,
                            width: layout.width, // Ancho completo como en la imagen
                            backgroundColor: event.color + '20',
                          }
                        ]}
                      />
                      
                      {/* Barra lateral de color - igual que calendario real */}
                      <View
                        style={[
                          styles.eventBar,
                          {
                            top: position.top + CALENDAR_PADDING + 2, // Menos separación desde arriba
                            height: position.height - 4, // Menos reducción de altura
                            left: layout.left + 1, // Un pixel más a la izquierda
                            backgroundColor: event.color,
                          }
                        ]}
                      />
                      
                      {/* Texto del evento - adaptativo según el ancho (igual que calendario real) */}
                      {layout.width >= 30 && (
                        <View
                          style={[
                            styles.eventContent,
                            {
                              top: position.top + CALENDAR_PADDING,
                              height: position.height,
                              left: layout.left + Math.max(12, SCALED_VALUES.eventBorderWidth + 6), // Espacio para la barra más ancha
                              width: layout.width - Math.max(16, SCALED_VALUES.eventBorderWidth + 10), // Compensar correctamente
                            }
                          ]}
                        >
                          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                          {layout.width >= 60 && position.height >= TIME_SLOT_HEIGHT && (
                            <Text style={styles.eventTime}>{event.startTime} - {event.endTime}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                // Mostrar mensaje cuando no hay tareas
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEventsText}>No hay tareas programadas para hoy</Text>
                  <Text style={styles.noEventsSubtext}>Toca aquí para ver el calendario completo</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Tableros Section - Solo 2 tableros */}
        <Text style={styles.sectionTitle}>Tableros</Text>
        <View style={styles.boardsRow}>
          <TouchableOpacity onPress={navigateToTasks} style={styles.boardCard}>
            <View>
              <Text style={styles.boardTitle}>Seguimiento de tareas</Text>
              <Text style={styles.boardSubtitle}>Abierto hace 2 días</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToPurchases} style={styles.boardCard}>
            <View>
              <Text style={styles.boardTitle}>Seguimiento de compra</Text>
              <Text style={styles.boardSubtitle}>Abierto hace 2 días</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Atajos Section */}
        <Text style={styles.sectionTitle}>Atajos</Text>
        <View style={styles.shortcutsContainer}>
          <TouchableOpacity onPress={navigateToNewUpdate} style={styles.shortcutItem}>
            <View style={styles.shortcutIcon}>
              <Image source={require('../../assets/icons/update-icon.png')} style={styles.shortcutIconImage} />
            </View>
            <Text style={styles.shortcutLabel}>Subir Avance</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToNewTask} style={styles.shortcutItem}>
            <View style={styles.shortcutIcon}>
              <Image source={require('../../assets/icons/task-icon.png')} style={styles.shortcutIconImage} />
            </View>
            <Text style={styles.shortcutLabel}>Crear Tarea</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToNewPurchase} style={styles.shortcutItem}>
            <View style={styles.shortcutIcon}>
              <Image source={require('../../assets/icons/shopping-cart-icon.png')} style={styles.shortcutIconImage} />
            </View>
            <Text style={styles.shortcutLabel}>Crear Solicitud de Compra</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToGantt} style={styles.shortcutItem}>
            <View style={styles.shortcutIcon}>
              <Image source={require('../../assets/icons/gantt.png')} style={styles.shortcutIconImage} />
            </View>
            <Text style={styles.shortcutLabel}>Diagrama de Gantt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100, // Espacio extra para scroll completo
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 10,
    marginBottom: 20,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: CALENDAR_PADDING,
    marginBottom: 32,
    minHeight: CALENDAR_HEIGHT,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gridContainer: {
    position: 'absolute',
    right: CALENDAR_PADDING,
    top: CALENDAR_PADDING,
    bottom: 0,
    left: 0, // Asegurar que las líneas ocupen todo el ancho disponible
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  timeColumn: {
    position: 'absolute',
    left: CALENDAR_PADDING,
    zIndex: 2,
    width: TIME_COLUMN_WIDTH,
  },
  timeSlot: {
    height: TIME_SLOT_HEIGHT,
    paddingRight: 8,
    position: 'relative',
  },
  timeText: {
    fontSize: SCALED_VALUES.timeTextFontSize,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.2,
    position: 'absolute',
    top: -(SCALED_VALUES.timeTextFontSize * 0.5) + (TIME_SLOT_HEIGHT / 2), // Centrado en la línea
  },
  eventsContainer: {
    flex: 1,
    position: 'relative',
    paddingRight: SCALED_VALUES.containerPadding,
    paddingLeft: SCALED_VALUES.eventsContainerPadding,
    overflow: 'hidden',
    zIndex: 3,
  },
  // Estilos para eventos - igual que el calendario real pero escalado
  eventBackground: {
    position: 'absolute',
    borderRadius: 6, // Exactamente igual que el calendario completo
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 2,
    overflow: 'hidden',
  },
  eventBar: {
    position: 'absolute',
    width: 6, // Exactamente igual que el calendario completo
    borderRadius: 3, // Exactamente igual que el calendario completo
  },
  eventContent: {
    position: 'absolute',
    justifyContent: 'flex-start',
    paddingHorizontal: Math.max(6, SCALED_VALUES.eventPadding),
    paddingVertical: Math.max(4, SCALED_VALUES.eventPadding * 0.6),
    paddingTop: Math.max(6, SCALED_VALUES.eventPadding * 0.8),
  },
  eventTitle: {
    fontSize: SCALED_VALUES.eventTitleFontSize,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: SCALED_VALUES.eventTitleFontSize * 1.2,
    marginBottom: Math.max(1, SCALED_VALUES.eventTitleFontSize * 0.2),
    letterSpacing: -0.2,
  },
  eventTime: {
    fontSize: SCALED_VALUES.eventTimeFontSize,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: SCALED_VALUES.eventTimeFontSize * 1.3,
    marginTop: SCALED_VALUES.eventTimeFontSize > 10 ? 1 : 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  boardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  boardCard: {
    borderRadius: 20,
    padding: IS_SMALL_DEVICE ? 16 : 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: (SCREEN_WIDTH - 60) / 2,
    minHeight: IS_SMALL_DEVICE ? 90 : 100,
    justifyContent: 'space-between',
  },
  boardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  boardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  shortcutsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  shortcutItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 60) / 4,
    marginBottom: 20,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutIconText: {
    fontSize: 20,
  },
  shortcutIconImage: {
    width: 24,
    height: 24,
    tintColor: '#6B7280',
  },
  shortcutLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 12,
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Math.max(25, height * 0.05),
    paddingHorizontal: SCALED_VALUES.containerPadding,
  },
  noEventsText: {
    fontSize: SCALED_VALUES.eventTitleFontSize * 1.1,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Math.max(4, SCALED_VALUES.eventTitleFontSize * 0.5),
    lineHeight: SCALED_VALUES.eventTitleFontSize * 1.4,
  },
  noEventsSubtext: {
    fontSize: SCALED_VALUES.eventTimeFontSize * 1.1,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: SCALED_VALUES.eventTimeFontSize * 1.4,
  },
});
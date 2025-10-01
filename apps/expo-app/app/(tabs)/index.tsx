import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../../hooks/useTasks';

const { width, height } = Dimensions.get('window');

// Calcular dimensiones responsivas
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;
const IS_SMALL_DEVICE = width < 375;
const IS_LARGE_DEVICE = width > 414;

// Dimensiones del calendario basadas en el dispositivo
const CALENDAR_HEIGHT = Math.max(380, height * 0.45);
const TIME_SLOT_HEIGHT = IS_SMALL_DEVICE ? 28 : 30;
const CALENDAR_PADDING = IS_SMALL_DEVICE ? 16 : 20;
const TIME_COLUMN_WIDTH = IS_SMALL_DEVICE ? 50 : 55;

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
            {/* Time Column */}
            <View style={[styles.timeColumn, { top: CALENDAR_PADDING }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.timeSlot, { height: TIME_SLOT_HEIGHT }]}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Grid Lines Background */}
            <View style={[styles.gridContainer, { left: TIME_COLUMN_WIDTH }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.gridLine, { top: index * TIME_SLOT_HEIGHT }]} />
              ))}
            </View>

            {/* Events - Mostrar datos reales */}
            <View style={[styles.eventsContainer, { 
              marginLeft: TIME_COLUMN_WIDTH, 
              height: CALENDAR_HEIGHT - CALENDAR_PADDING * 2 
            }]}>
              {todayEvents.length > 0 ? (
                todayEvents.map((event, index) => {
                  // COPIAR EXACTAMENTE del teamCalendar.tsx
                  const timeToMinutes = (time: string) => {
                    const [hours, minutes] = time.split(':').map(Number);
                    return hours * 60 + minutes;
                  };

                  const getEventPosition = (startTime: string, endTime: string) => {
                    const startMinutes = timeToMinutes(startTime);
                    const endMinutes = timeToMinutes(endTime);
                    const startHour = 8 * 60; // 8:00 AM en minutos
                    
                    // Alinear exactamente con las líneas de tiempo y el timeColumn
                    const top = ((startMinutes - startHour) / 60) * TIME_SLOT_HEIGHT;
                    const height = ((endMinutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;
                    
                    return { top, height };
                  };
                  
                  const position = getEventPosition(event.startTime, event.endTime);
                  
                  // Algoritmo optimizado para distribución de eventos superpuestos
                  const getEventLayout = (index: number) => {
                    const availableWidth = SCREEN_WIDTH - TIME_COLUMN_WIDTH - CALENDAR_PADDING * 3;
                    const currentStart = timeToMinutes(event.startTime);
                    const currentEnd = timeToMinutes(event.endTime);
                    
                    // Agrupar eventos que se superponen entre sí
                    const findOverlappingGroup = () => {
                      const group: number[] = [index];
                      const checked = new Set<number>([index]);
                      const toCheck = [index];
                      
                      while (toCheck.length > 0) {
                        const current = toCheck.pop()!;
                        const currentEvent = todayEvents[current];
                        const currStart = timeToMinutes(currentEvent.startTime);
                        const currEnd = timeToMinutes(currentEvent.endTime);
                        
                        todayEvents.forEach((otherEvent, otherIndex) => {
                          if (checked.has(otherIndex)) return;
                          
                          const otherStart = timeToMinutes(otherEvent.startTime);
                          const otherEnd = timeToMinutes(otherEvent.endTime);
                          
                          // Verificar si hay superposición
                          if (currStart < otherEnd && currEnd > otherStart) {
                            group.push(otherIndex);
                            checked.add(otherIndex);
                            toCheck.push(otherIndex);
                          }
                        });
                      }
                      
                      return group.sort((a, b) => a - b);
                    };
                    
                    const overlappingGroup = findOverlappingGroup();
                    
                    if (overlappingGroup.length === 1) {
                      // Sin superposiciones - ocupar exactamente el mismo ancho que dos columnas juntas
                      const totalColumns = 2;
                      const columnWidth = (availableWidth - (totalColumns - 1) * 10) / totalColumns;
                      const eventWidth = Math.min(columnWidth, 140);
                      const totalWidth = (eventWidth * 2) + 10; // Dos columnas + gap
                      return { 
                        left: 0, 
                        width: totalWidth,
                        zIndex: 1
                      };
                    }
                    
                    // Calcular cuántas columnas necesitamos (máximo 2)
                    const totalColumns = Math.min(2, overlappingGroup.length);
                    const columnWidth = (availableWidth - (totalColumns - 1) * 10) / totalColumns;
                    const eventWidth = Math.min(columnWidth, 140);
                    
                    // Asignar columna basado en la posición en el grupo
                    const positionInGroup = overlappingGroup.indexOf(index);
                    const column = positionInGroup % totalColumns;
                    
                    // Si hay más de 2 eventos, alternar columnas de manera inteligente
                    let adjustedColumn = column;
                    if (overlappingGroup.length > 2) {
                      // Para el tercer evento en adelante, buscar la columna con menos eventos
                      if (positionInGroup >= 2) {
                        const eventsInCol0 = overlappingGroup.filter((i, pos) => pos % 2 === 0 && pos < positionInGroup).length;
                        const eventsInCol1 = overlappingGroup.filter((i, pos) => pos % 2 === 1 && pos < positionInGroup).length;
                        adjustedColumn = eventsInCol0 <= eventsInCol1 ? 0 : 1;
                      }
                    }
                    
                    return {
                      left: adjustedColumn * (eventWidth + 10),
                      width: eventWidth,
                      zIndex: index + 1
                    };
                  };
                  
                  const layout = getEventLayout(index);
                  
                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.eventBlock,
                        {
                          backgroundColor: event.color + '30',
                          borderLeftColor: event.color,
                          left: layout.left,
                          top: position.top,
                          width: layout.width,
                          height: position.height,
                          zIndex: layout.zIndex,
                        }
                      ]}
                    >
                      <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.eventTime}>{event.startTime} - {event.endTime}</Text>
                      </View>
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
    left: 16,
    zIndex: 2,
  },
  timeSlot: {
    height: TIME_SLOT_HEIGHT,
    paddingRight: 8,
    position: 'relative',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.2,
    position: 'absolute',
    top: -7,
  },
  eventsContainer: {
    flex: 1,
    position: 'relative',
    paddingRight: 15,
    overflow: 'hidden',
    zIndex: 3,
  },
  eventBlock: {
    position: 'absolute',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingLeft: 14,
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    minWidth: 140,
    minHeight: 55,
    justifyContent: 'space-between',
  },
  eventBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  eventContent: {
    flex: 1,
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  eventTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 16,
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
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
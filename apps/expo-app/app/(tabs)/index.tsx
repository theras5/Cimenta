import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
          
          return {
            id: task.id,
            title: task.title,
            category: task.category || 'default',
            color: getCategoryColor(task.category || 'default'),
            startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
            endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
          };
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime)); // Ordenar por hora de inicio

      setTodayEvents(events.slice(0, 4)); // Mostrar máximo 4 eventos
    } else {
      setTodayEvents([]);
    }
  }, [tasks]);

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
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Hoy</Text>

        {/* Today's Schedule - Clickeable para ir al calendario */}
        <TouchableOpacity onPress={navigateToCalendar} activeOpacity={0.7}>
          <View style={styles.scheduleCard}>
            {/* Grid Lines Background */}
            <View style={[styles.gridContainer, { left: TIME_COLUMN_WIDTH }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.gridLine, { top: index * TIME_SLOT_HEIGHT + CALENDAR_PADDING + 8 }]} />
              ))}
            </View>
            
            {/* Time Column */}
            <View style={[styles.timeColumn, { top: CALENDAR_PADDING }]}>
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time, index) => (
                <View key={time} style={[styles.timeSlot, { height: TIME_SLOT_HEIGHT }]}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Events - Mostrar datos reales */}
            <View style={[styles.eventsContainer, { 
              marginLeft: TIME_COLUMN_WIDTH, 
              height: CALENDAR_HEIGHT - CALENDAR_PADDING * 2 
            }]}>
              {todayEvents.length > 0 ? (
                todayEvents.map((event, index) => {
                  // Cálculo simple y directo de posición
                  const getEventPosition = (startTime: string, endTime: string) => {
                    const [startHour, startMinute] = startTime.split(':').map(Number);
                    const [endHour, endMinute] = endTime.split(':').map(Number);
                    
                    // Convertir horas a posición en pixels
                    // Si timeline empieza en 08:00, entonces:
                    // - 08:00 = posición 0
                    // - 09:00 = posición 1 * TIME_SLOT_HEIGHT
                    // - 14:00 = posición 6 * TIME_SLOT_HEIGHT
                    const hoursFromStart = (startHour - 8) + (startMinute / 60);
                    const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);
                    
                    const top = hoursFromStart * TIME_SLOT_HEIGHT + CALENDAR_PADDING + 8;
                    const height = duration * TIME_SLOT_HEIGHT;
                    
                    return { top, height: Math.max(height, 20) };
                  };
                  
                  const position = getEventPosition(event.startTime, event.endTime);
                  
                  // Posicionamiento responsivo para evitar superposiciones
                  const getEventLayout = (index: number) => {
                    const totalEvents = todayEvents.length;
                    const availableWidth = SCREEN_WIDTH - TIME_COLUMN_WIDTH - CALENDAR_PADDING * 3;
                    
                    if (totalEvents === 1) {
                      return { left: 0, width: Math.min(150, availableWidth * 0.8) };
                    } else if (totalEvents === 2) {
                      const eventWidth = Math.min(110, availableWidth * 0.45);
                      return { left: index * (eventWidth + 10), width: eventWidth };
                    } else if (totalEvents === 3) {
                      const eventWidth = Math.min(95, availableWidth * 0.3);
                      const positions = [0, eventWidth + 5, (eventWidth + 5) * 2];
                      return { left: positions[index] || 0, width: eventWidth };
                    } else {
                      // Para 4 o más eventos, distribuir en grid responsivo
                      const row = Math.floor(index / 2);
                      const col = index % 2;
                      const eventWidth = Math.min(105, availableWidth * 0.45);
                      return { 
                        left: col * (eventWidth + 5), 
                        width: eventWidth,
                        extraTop: row * (TIME_SLOT_HEIGHT * 0.8)
                      };
                    }
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
                          top: position.top + (layout.extraTop || 0),
                          width: layout.width,
                          height: Math.min(position.height, 80), // Limitar altura máxima
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
    top: 8,
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
    justifyContent: 'center',
    marginBottom: 0,
    paddingRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.2,
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
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { Task } from '../../services/taskService';

const { width } = Dimensions.get('window');

// Interfaz para eventos del calendario
interface CalendarEvent {
  id: string;
  taskId: string;
  title: string;
  category: string;
  categoryColor: string;
  startTime: string;
  endTime: string;
  date: number;
  status: string;
}

// Interface ya no es necesaria con el nuevo algoritmo

const CalendarSchedule = () => {
  const router = useRouter();
  const { tasks, isLoading, fetchTasks } = useTasks();
  
  // Obtener la fecha "ahora" en cada render para que el día actual siempre sea correcto
  const now = new Date();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  
  // Inicializar con la fecha actual
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    return new Date().getDate();
  });
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(todayMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // Ref para rastrear si venimos de una navegación a tarea
  const navigationFromTask = useRef(false);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const currentMonth = `${months[currentMonthIndex]}, ${currentYear}`;
  
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

  const handleTaskPress = (taskId: string) => {
    // Marcar que estamos navegando a una tarea para no resetear cuando regresemos
    navigationFromTask.current = true;
    router.push(`/tasks/${taskId}`);
  };

  useEffect(() => {
    fetchTasks();
  }, [currentYear, currentMonthIndex, fetchTasks]);

  useFocusEffect(
    React.useCallback(() => {
      // Solo resetear si NO venimos de ver una tarea
      if (!navigationFromTask.current) {
        setSelectedDate(todayDate);
        setCurrentMonthIndex(todayMonth);
        setCurrentYear(todayYear);
      }
      // Resetear el flag después de procesar
      navigationFromTask.current = false;
      
      // Fetch tasks cuando la pantalla recibe foco
      fetchTasks();
    }, [todayDate, todayMonth, todayYear, fetchTasks])
  );

  const convertTasksToEvents = (): CalendarEvent[] => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks
      .filter(task => task.start_date && task.end_date)
      .map(task => {
        const startDate = new Date(task.start_date!);
        const endDate = new Date(task.end_date!);
        
        if (startDate.getFullYear() !== currentYear || startDate.getMonth() !== currentMonthIndex) {
          return [];
        }
        
        const startHour = startDate.getHours();
        const startMinute = startDate.getMinutes();
        const endHour = endDate.getHours();
        const endMinute = endDate.getMinutes();
        
        // Usar SIEMPRE los horarios reales de las tareas
        const taskStartTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        const taskEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        return [{
          id: `${task.id}_${startDate.getDate()}`,
          taskId: task.id,
          title: task.title,
          category: task.category,
          categoryColor: task.categoryColor || getCategoryColor(task.category),
          startTime: taskStartTime,
          endTime: taskEndTime,
          date: startDate.getDate(),
          status: task.status
        }];
      })
      .flat()
      .filter(event => event !== null && event !== undefined);
  };

  const events = convertTasksToEvents();

  const generateCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay();
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    // Verificar si estamos viendo el mes y año actual
    const isCurrentMonth = currentYear === todayYear && currentMonthIndex === todayMonth;

    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      calendarDays.push({
        date: day,
        dayName: dayNames[dayOfWeek],
        isToday: isCurrentMonth && day === todayDate
      });
    }
    return calendarDays;
  };
  
  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonthIndex === 11) {
        setCurrentMonthIndex(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonthIndex(currentMonthIndex + 1);
      }
    } else {
      if (currentMonthIndex === 0) {
        setCurrentMonthIndex(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonthIndex(currentMonthIndex - 1);
      }
    }
    setSelectedDate(1);
  };
  
  const calendarDays = generateCalendarDays();
    const hours = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`); // De 8:00 a 21:00

  const todayEvents = events.filter(event => event.date === selectedDate);
  
  const activeCategories = Array.from(new Set(todayEvents.map(event => event.category)))
    .map(category => ({
      name: category,
      color: getCategoryColor(category)
    }));
  
  const isSimplifiedView = true; // Siempre usar vista simplificada

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const sortedTodayEvents = [...todayEvents].sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const getEventPosition = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const calendarStartMinutes = 8 * 60; // 8:00 AM en minutos
    const calendarEndMinutes = 21 * 60; // 9:00 PM en minutos - límite del calendario
    
    // No mostrar eventos que empiecen después de las 21:00
    if (startMinutes >= calendarEndMinutes) {
      return { top: -1000, height: 0 }; // Posición fuera de vista
    }
    
    // Calcular la posición relativa desde las 8:00 AM (igual que index)
    const relativeStartMinutes = startMinutes - calendarStartMinutes;
    // Limitar el endTime a las 21:00 para ambos cálculos (igual que index)
    const effectiveEndMinutes = Math.min(endMinutes, calendarEndMinutes);
    const durationMinutes = effectiveEndMinutes - startMinutes;
    
    // Calcular píxeles por minuto basado en el valor fijo del teamCalendar (55px por hora)
    const pixelsPerMinute = 55 / 60; // Cada hora = 55 píxeles
    const top = relativeStartMinutes * pixelsPerMinute;
    
    // Altura completamente proporcional - sin alturas mínimas (igual que index)
    const height = durationMinutes * pixelsPerMinute;
    
    return { top, height };
  };

  // No necesitamos cálculo complejo de posiciones con el nuevo algoritmo





  // Memoización para evitar recalcular grupos de superposición
  const overlappingGroupsCache = React.useMemo(() => {
    const cache = new Map<string, CalendarEvent[]>();
    const processed = new Set<string>();
    
    sortedTodayEvents.forEach(event => {
      if (processed.has(event.id)) return;
      
      // Encontrar todos los eventos que se superponen con este
      const group: CalendarEvent[] = [event];
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      
      // Buscar eventos superpuestos usando un enfoque más eficiente
      for (let i = 0; i < sortedTodayEvents.length; i++) {
        const otherEvent = sortedTodayEvents[i];
        if (otherEvent.id === event.id || processed.has(otherEvent.id)) continue;
        
        const otherStart = timeToMinutes(otherEvent.startTime);
        const otherEnd = timeToMinutes(otherEvent.endTime);
        
        // Verificar superposición directa
        if (eventStart < otherEnd && eventEnd > otherStart) {
          group.push(otherEvent);
        }
      }
      
      // Si hay más de un evento, verificar superposiciones transitivas
      if (group.length > 1) {
        let changed = true;
        while (changed) {
          changed = false;
          const currentSize = group.length;
          
          for (const groupEvent of [...group]) {
            const groupStart = timeToMinutes(groupEvent.startTime);
            const groupEnd = timeToMinutes(groupEvent.endTime);
            
            for (const candidate of sortedTodayEvents) {
              if (group.some(g => g.id === candidate.id) || processed.has(candidate.id)) continue;
              
              const candidateStart = timeToMinutes(candidate.startTime);
              const candidateEnd = timeToMinutes(candidate.endTime);
              
              if (groupStart < candidateEnd && groupEnd > candidateStart) {
                group.push(candidate);
                changed = true;
              }
            }
          }
          
          if (group.length === currentSize) break;
        }
      }
      
      // Ordenar el grupo por hora de inicio y luego por ID para consistencia
      group.sort((a, b) => {
        const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
      
      // Cachear el grupo para todos sus miembros
      group.forEach(groupEvent => {
        cache.set(groupEvent.id, group);
        processed.add(groupEvent.id);
      });
    });
    
    return cache;
  }, [sortedTodayEvents]);

  const renderSimplifiedEvent = (event: CalendarEvent, eventIndex: number) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);
    
    // Obtener el grupo de eventos superpuestos desde el cache
    const overlappingGroup = overlappingGroupsCache.get(event.id) || [event];
    
    // Calcular ancho y posición
    const availableWidth = width - 95; // Espacio disponible (75px inicio + 20px final)
    let eventWidth: number;
    let leftPosition: number;
    
    if (overlappingGroup.length === 1) {
      // Evento único sin superposición
      eventWidth = availableWidth;
      leftPosition = 75;
    } else {
      // Eventos superpuestos
      const spacing = 4; // Espacio entre eventos
      const totalSpacing = (overlappingGroup.length - 1) * spacing;
      eventWidth = (availableWidth - totalSpacing) / overlappingGroup.length;
      
      // El grupo ya está ordenado desde el cache
      const eventPosition = overlappingGroup.findIndex((e: CalendarEvent) => e.id === event.id);
      leftPosition = 75 + eventPosition * (eventWidth + spacing);
    }
    
    return (
      <TouchableOpacity key={event.id} onPress={() => handleTaskPress(event.taskId)} activeOpacity={0.7}>
        {/* Fondo del evento */}
        <View
          style={[
            styles.simplifiedEventBackground,
            {
              top: top + 20,
              height: height, // Altura completamente proporcional
              left: leftPosition,
              width: eventWidth,
              backgroundColor: event.categoryColor + '20',
            }
          ]}
        />
        
        {/* Barra lateral de color */}
        <View
          style={[
            styles.simplifiedEventBar,
            {
              top: top + 20,
              height: height, // Altura completamente proporcional
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        {/* Texto del evento - solo mostrar cuando sea realmente útil */}
        {(() => {
          const eventDurationMinutes = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
          return eventWidth >= 40 && eventDurationMinutes >= 30; // Solo mostrar texto para eventos de 30+ minutos
        })() && (
          <View
            style={[
              styles.simplifiedEventText,
              {
                top: top + (event.startTime === event.endTime ? 22 : 26),
                left: leftPosition + 6,
                maxWidth: eventWidth - 12,
                height: height - 4, // Altura proporcional con pequeño ajuste
              }
            ]}          
          >
            {(() => {
              const eventDurationMinutes = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
              
              if (eventWidth >= 80) {
                // Ancho suficiente: mostrar todo el texto
                return (
                  <>
                    <Text style={styles.eventPersonName} numberOfLines={1}>
                      {event.title}
                    </Text>
                    {event.startTime !== event.endTime && (
                      <>
                        <Text style={styles.eventCategory} numberOfLines={1}>
                          {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                        </Text>
                        {eventDurationMinutes >= 60 && (
                          <Text style={styles.eventTime} numberOfLines={1}>{event.startTime} - {event.endTime}</Text>
                        )}
                      </>
                    )}
                  </>
                );
              } else {
                // Ancho medio: solo título
                return (
                  <Text style={styles.eventPersonName} numberOfLines={1}>
                    {event.title.length > 8 ? event.title.substring(0, 8) + '...' : event.title}
                  </Text>
                );
              }
            })()}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderComplexEvent = (event: CalendarEvent, eventIndex: number) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);

    // Calcular posición horizontal simple por categoría
    const categoryIndex = activeCategories.findIndex(cat => cat.name === event.category);
    const totalWidth = width - 80;
    const baseColumnWidth = totalWidth / activeCategories.length;
    const eventWidth = Math.max(baseColumnWidth - 10, 30);
    const leftPosition = 75 + (categoryIndex * baseColumnWidth); // Ajustado para evitar horas
    
    return (
      <TouchableOpacity key={event.id} onPress={() => handleTaskPress(event.taskId)} activeOpacity={0.7}>
        {/* Fondo del evento */}
        <View
          style={[
            styles.complexEventBackground,
            {
              top: top + 20,
              height: height, // Altura completamente proporcional
              left: leftPosition,
              width: eventWidth,
              backgroundColor: event.categoryColor + '20',
            }
          ]}
        />
        
        {/* Barra de color */}
        <View
          style={[
            styles.complexEventBar,
            {
              top: top + 20,
              height: height, // Altura completamente proporcional
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => changeMonth('prev')}
          activeOpacity={0.7}
          delayLongPress={100}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.monthSelector}
          onPress={() => setShowMonthPicker(!showMonthPicker)}
        >
          <Text style={styles.monthText}>{currentMonth}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => changeMonth('next')}
          activeOpacity={0.7}
          delayLongPress={100}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>
      
      {showMonthPicker && (
        <View style={styles.monthPickerContainer}>
          <TouchableOpacity 
            style={styles.monthPickerOverlay}
            onPress={() => setShowMonthPicker(false)}
          />
          <View style={styles.monthPickerContent}>
            <ScrollView style={styles.monthPicker} showsVerticalScrollIndicator={false}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthOption,
                    index === currentMonthIndex && styles.selectedMonthOption
                  ]}
                  onPress={() => {
                    setCurrentMonthIndex(index);
                    setSelectedDate(1);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.monthOptionText,
                    index === currentMonthIndex && styles.selectedMonthOptionText
                  ]}>
                    {month} {currentYear}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}



      <View style={styles.calendarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarScrollContent}
          style={styles.calendarScroll}
        >
        {calendarDays.map((dayInfo, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.dayText}>{dayInfo.dayName}</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                // Aplicar estilo de selección solo si NO es el día actual
                dayInfo.date === selectedDate && !dayInfo.isToday && styles.selectedDate,
                // Aplicar el estilo de fondo de "hoy" sólo si HOY está seleccionado (mantener el círculo naranja sólo cuando se selecciona hoy)
                dayInfo.isToday && dayInfo.date === selectedDate && styles.todayDate
              ]}
              onPress={() => setSelectedDate(dayInfo.date)}
              activeOpacity={1}
            >
              <Text style={[
                styles.dateText,
                // Texto seleccionado sólo si no es hoy
                dayInfo.date === selectedDate && !dayInfo.isToday && styles.selectedDateText,
                // Texto para el día actual siempre (naranja) — cuando no está seleccionado solo cambia el texto
                dayInfo.isToday && styles.todayDateText
              ]}>
                {dayInfo.date}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.schedule}>
          <View style={styles.timeColumn}>
            {hours.map(hour => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeText}>{hour}</Text>
              </View>
            ))}
          </View>

          <View style={styles.gridContainer}>
            {hours.map((hour, index) => (
              <View key={hour} style={[styles.gridLine, { top: index * 55 + 20 }]} />
            ))}
          </View>

          <View style={styles.eventsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando tareas...</Text>
              </View>
            ) : (
              sortedTodayEvents.map((event, index) => 
                renderSimplifiedEvent(event, index)
              )
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🏠</Text>
          </View>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📋</Text>
          </View>
          <Text style={styles.navText}>Tasks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>⏰</Text>
          </View>
          <Text style={styles.navText}>Avances</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📅</Text>
          </View>
          <Text style={[styles.navText, styles.activeNavText]}>Calendar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>👤</Text>
          </View>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  dropdownArrow: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  legend: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  legendScrollContent: {
    paddingRight: 20,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
    minWidth: 120,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  calendarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 0,
    marginBottom: 0,
  },
  calendarScroll: {
    paddingBottom: 0,
    marginBottom: 0,
  },
  calendarScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  dayColumn: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 40,
  },
  dayText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDate: {
    backgroundColor: '#007AFF',
  },
  todayDate: {
    backgroundColor: '#FFE5B4',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  todayDateText: {
    color: '#FF9500',
    fontWeight: '700',
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
    paddingTop: 0,
  },
  schedule: {
    position: 'relative',
    paddingBottom: 50,
  },
  timeColumn: {
    position: 'absolute',
    left: 10,
    top: 0,
    zIndex: 2,
  },
  timeSlot: {
    height: 55,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  gridContainer: {
    position: 'absolute',
    left: 60,
    right: 0,
    top: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 20,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  eventsContainer: {
    position: 'relative',
    minHeight: 770, // 14 hours * 55px (de 8:00 a 21:00)
  },
  simplifiedEventBackground: {
    position: 'absolute',
    borderRadius: 12,
  },
  simplifiedEventBar: {
    position: 'absolute',
    width: 5,
    borderRadius: 3,
  },
  simplifiedEventText: {
    position: 'absolute',
    paddingLeft: 8,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  eventPersonName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  eventTime: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  eventCategory: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginBottom: 1,
  },
  complexEventBackground: {
    position: 'absolute',
    borderRadius: 6,
  },
  complexEventBar: {
    position: 'absolute',
    width: 6,
    borderRadius: 3,
  },
  complexEventText: {
    position: 'absolute',
  },
  complexEventTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {},
  navIcon: {
    marginBottom: 4,
  },
  navIconText: {
    fontSize: 18,
  },
  navText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  navButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  monthPickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
  },
  monthPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  monthPickerContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 20,
    maxWidth: 200,
  },
  monthPicker: {
    maxHeight: 300,
  },
  monthOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedMonthOption: {
    backgroundColor: '#007AFF',
  },
  monthOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedMonthOptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CalendarSchedule;
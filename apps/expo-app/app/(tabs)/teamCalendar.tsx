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
  
  // Obtener la fecha actual dinámicamente
  const today = React.useMemo(() => new Date(), []);
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  // Inicializar con la fecha actual
  const [selectedDate, setSelectedDate] = useState(() => {
    return todayDate;
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
    
    const isCurrentMonth = currentYear === 2025 && currentMonthIndex === 8;
    
    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      calendarDays.push({
        date: day,
        dayName: dayNames[dayOfWeek],
        isToday: isCurrentMonth && day === 30
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
    
    // Calcular la posición relativa desde las 8:00 AM
    const relativeStartMinutes = startMinutes - calendarStartMinutes;
    const durationMinutes = endMinutes - startMinutes;
    
    // Cada hora ocupa 55px, entonces cada minuto ocupa 55/60 px
    const pixelsPerMinute = 55 / 60;
    const top = relativeStartMinutes * pixelsPerMinute;
    
    // Si la duración es 0 (misma hora), usar altura mínima pequeña, sino usar altura mínima normal
    const minHeight = durationMinutes === 0 ? 25 : 30;
    const height = Math.max(durationMinutes * pixelsPerMinute, minHeight);
    
    return { top, height };
  };

  // No necesitamos cálculo complejo de posiciones con el nuevo algoritmo





  const renderSimplifiedEvent = (event: CalendarEvent, eventIndex: number) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);
    
    // Detectar si hay otros eventos que se superponen con este
    const currentEventStart = timeToMinutes(event.startTime);
    const currentEventEnd = timeToMinutes(event.endTime);
    
    const overlappingEvents = sortedTodayEvents.filter(otherEvent => {
      if (otherEvent.id === event.id) return false;
      const otherStart = timeToMinutes(otherEvent.startTime);
      const otherEnd = timeToMinutes(otherEvent.endTime);
      return currentEventStart < otherEnd && currentEventEnd > otherStart;
    });
    
    // Calcular ancho consistente para todos los eventos
    const availableWidth = width - 95; // Espacio disponible para eventos únicos (75px inicio + 20px final)
    let eventWidth;
    let leftPosition;
    
    if (overlappingEvents.length === 0) {
      // Si no hay superposición, ocupar el 100% del ancho disponible (como estaba antes)
      eventWidth = availableWidth;
      leftPosition = 75;
    } else {
      // EVENTOS SUPERPUESTOS: usar el MISMO espacio base que eventos únicos
      const totalOverlappingEvents = overlappingEvents.length + 1;
      const spacing = 4; // Espacio normal entre eventos
      const totalSpacing = (totalOverlappingEvents - 1) * spacing;
      
      // Usar el mismo availableWidth que eventos únicos, distribuido entre todos los eventos superpuestos
      eventWidth = (availableWidth - totalSpacing) / totalOverlappingEvents;
      
      // Encontrar la posición de este evento entre los superpuestos
      const allOverlappingEvents = [event, ...overlappingEvents].sort((a, b) => {
        const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
      const eventPosition = allOverlappingEvents.findIndex(e => e.id === event.id);
      leftPosition = 75 + eventPosition * (eventWidth + spacing); // Usar la misma posición base que eventos únicos
    }
    
    return (
      <TouchableOpacity key={event.id} onPress={() => handleTaskPress(event.taskId)} activeOpacity={0.7}>
        {/* Fondo del evento */}
        <View
          style={[
            styles.simplifiedEventBackground,
            {
              top: top + 20,
              height: event.startTime === event.endTime ? Math.max(height, 25) : Math.max(height, 50),
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
              height: event.startTime === event.endTime ? Math.max(height, 25) : Math.max(height, 50),
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        {/* Texto del evento - adaptativo según el ancho */}
        {eventWidth >= 30 && ( // Solo mostrar texto si hay suficiente espacio
          <View
            style={[
              styles.simplifiedEventText,
              {
                top: top + (event.startTime === event.endTime ? 22 : 26),
                left: leftPosition + 6,
                maxWidth: eventWidth - 12,
                height: event.startTime === event.endTime ? Math.max(height - 4, 20) : Math.max(height - 10, 40),
              }
            ]}          
          >
            {eventWidth >= 80 ? (
              // Ancho suficiente: mostrar todo el texto
              <>
                <Text style={styles.eventPersonName} numberOfLines={1}>
                  {event.title}
                </Text>
                {event.startTime !== event.endTime && (
                  <>
                    <Text style={styles.eventCategory} numberOfLines={1}>
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </Text>
                    <Text style={styles.eventTime} numberOfLines={1}>{event.startTime} - {event.endTime}</Text>
                  </>
                )}
              </>
            ) : eventWidth >= 50 ? (
              // Ancho medio: solo título y tiempo
              <>
                <Text style={styles.eventPersonName} numberOfLines={1}>
                  {event.title.length > 8 ? event.title.substring(0, 8) + '...' : event.title}
                </Text>
                {event.startTime !== event.endTime && (
                  <Text style={styles.eventTime} numberOfLines={1}>{event.startTime}</Text>
                )}
              </>
            ) : (
              // Ancho pequeño: solo título muy corto o iniciales
              <Text style={styles.eventPersonName} numberOfLines={1}>
                {event.title.length > 3 ? event.title.substring(0, 3) + '...' : event.title}
              </Text>
            )}
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
              height: Math.max(height, 25),
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
              height: Math.max(height, 25),
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
                dayInfo.date === selectedDate && styles.selectedDate,
                dayInfo.isToday && styles.todayDate
              ]}
              onPress={() => setSelectedDate(dayInfo.date)}
              activeOpacity={1}
            >
              <Text style={[
                styles.dateText,
                dayInfo.date === selectedDate && styles.selectedDateText,
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
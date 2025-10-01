import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
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

// Interfaz para eventos posicionados
interface PositionedEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
}

const CalendarSchedule = () => {
  const router = useRouter();
  const { tasks, isLoading, fetchTasks } = useTasks();
  const [selectedDate, setSelectedDate] = useState(30);
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(8);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
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
    router.push(`/tasks/${taskId}`);
  };

  useEffect(() => {
    fetchTasks();
  }, [currentYear, currentMonthIndex, fetchTasks]);

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
        
        const hasStartTime = startHour !== 0 || startMinute !== 0;
        const hasEndTime = endHour !== 0 || endMinute !== 0;
        
        const taskStartTime = hasStartTime 
          ? `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
          : '09:00';
        
        const taskEndTime = hasEndTime 
          ? `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
          : '17:00';
        
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
  const hours = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);

  const todayEvents = events.filter(event => event.date === selectedDate);
  
  const activeCategories = Array.from(new Set(todayEvents.map(event => event.category)))
    .map(category => ({
      name: category,
      color: getCategoryColor(category)
    }));
  
  const isSimplifiedView = activeCategories.length <= 2;

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
    const startHour = 8 * 60;
    
    const top = ((startMinutes - startHour) / 60) * 55;
    const height = ((endMinutes - startMinutes) / 60) * 55;
    
    return { top, height };
  };

  // Algoritmo mejorado para detectar y posicionar eventos superpuestos
  const calculateEventPositions = (events: CalendarEvent[]): PositionedEvent[] => {
    if (events.length === 0) return [];

    // Paso 1: Ordenar eventos por inicio
    const sortedEvents = [...events].sort((a, b) => {
      const startA = timeToMinutes(a.startTime);
      const startB = timeToMinutes(b.startTime);
      if (startA !== startB) return startA - startB;
      // Si empiezan igual, ordenar por fin (más largos primero)
      const endA = timeToMinutes(a.endTime);
      const endB = timeToMinutes(b.endTime);
      return endB - endA;
    });

    // Algoritmo simple: asignar cada evento a una columna
    const columns: number[] = []; // Hora de fin de cada columna
    const result: PositionedEvent[] = [];
    
    for (const event of sortedEvents) {
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      
      // Encontrar la primera columna donde el evento no se superponga
      let columnIndex = 0;
      while (columnIndex < columns.length && columns[columnIndex] > eventStart) {
        columnIndex++;
      }
      
      // Si necesitamos una nueva columna
      if (columnIndex === columns.length) {
        columns.push(eventEnd);
      } else {
        columns[columnIndex] = eventEnd;
      }
      
      console.log(`Evento ${event.title} (${event.startTime}-${event.endTime}) -> Columna ${columnIndex + 1}/${columns.length}`);
      
      result.push({
        ...event,
        column: columnIndex,
        totalColumns: columns.length
      });
    }
    
    // Actualizar totalColumns para todos los eventos con el número final de columnas
    const finalColumns = columns.length;
    return result.map(event => ({
      ...event,
      totalColumns: finalColumns
    }));
  };

  const positionedEvents = calculateEventPositions(sortedTodayEvents);

  // Debug temporal para ver qué está pasando
  if (sortedTodayEvents.length > 0) {
    console.log('=== DEBUG EVENTOS ===');
    console.log('Eventos originales:', sortedTodayEvents.map(e => ({
      title: e.title,
      start: e.startTime,
      end: e.endTime
    })));
    console.log('Eventos posicionados:', positionedEvents.map(e => ({
      title: e.title,
      start: e.startTime,
      end: e.endTime,
      column: e.column,
      totalColumns: e.totalColumns
    })));
  }

  const renderLegend = () => {
    if (isSimplifiedView || activeCategories.length === 0) return null;
    
    return (
      <View style={styles.legend}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendScrollContent}
        >
          <View style={styles.legendContainer}>
            {activeCategories.map((category) => (
              <View key={category.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                <Text style={styles.legendText}>{category.name.charAt(0).toUpperCase() + category.name.slice(1)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSimplifiedEvent = (event: PositionedEvent) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);
    
    const availableWidth = width - 95;
    const columnSpacing = 15; // Espacio visible entre columnas
    const totalSpacing = (event.totalColumns - 1) * columnSpacing;
    const eventWidth = (availableWidth - totalSpacing) / event.totalColumns;
    const leftPosition = 75 + (event.column * (eventWidth + columnSpacing));
    
    // Asegurar ancho mínimo
    const adjustedEventWidth = Math.max(eventWidth, 70);
    
    // Debug para ver posiciones
    console.log(`📅 Renderizando ${event.title}: columna ${event.column + 1}/${event.totalColumns}, left: ${leftPosition.toFixed(1)}, width: ${adjustedEventWidth.toFixed(1)}`);
    
    return (
      <TouchableOpacity key={event.id} onPress={() => handleTaskPress(event.taskId)} activeOpacity={0.7}>
        <View
          style={[
            styles.simplifiedEventBackground,
            {
              top: top + 20,
              height: Math.max(height, 80),
              left: leftPosition,
              width: adjustedEventWidth,
              backgroundColor: event.categoryColor + '15',
              shadowColor: event.categoryColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }
          ]}
        />
        
        <View
          style={[
            styles.simplifiedEventBar,
            {
              top: top + 20,
              height: Math.max(height, 80),
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        <View
          style={[
            styles.simplifiedEventText,
            {
              top: top + 35,
              left: leftPosition + 15,
              maxWidth: adjustedEventWidth - 20,
            }
          ]}
        >
          <Text style={styles.eventPersonName} numberOfLines={event.totalColumns > 2 ? 1 : 2}>
            {event.title}
          </Text>
          <Text style={styles.eventCategory}>
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </Text>
          <Text style={styles.eventTime}>{event.startTime} - {event.endTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderComplexEvent = (event: PositionedEvent) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);

    // En vista compleja, usar tanto la categoría como la columna para posicionamiento
    const categoryIndex = activeCategories.findIndex(cat => cat.name === event.category);
    const totalWidth = width - 80;
    const categoryWidth = totalWidth / activeCategories.length;
    
    // Dentro de cada categoría, dividir por número de columnas si hay superposición
    const columnSpacing = 3;
    const eventWidth = event.totalColumns > 1 
      ? Math.max((categoryWidth - (event.totalColumns - 1) * columnSpacing) / event.totalColumns, 25)
      : Math.max(categoryWidth - 10, 30);
    
    const categoryStartPosition = 75 + (categoryIndex * categoryWidth);
    const leftPosition = event.totalColumns > 1
      ? categoryStartPosition + (event.column * (eventWidth + columnSpacing))
      : categoryStartPosition;
    
    return (
      <TouchableOpacity key={event.id} onPress={() => handleTaskPress(event.taskId)} activeOpacity={0.7}>
        <View
          style={[
            styles.complexEventBackground,
            {
              top: top + 20,
              height: Math.max(height, 30),
              left: leftPosition,
              width: eventWidth,
              backgroundColor: event.categoryColor + '20',
            }
          ]}
        />
        
        <View
          style={[
            styles.complexEventBar,
            {
              top: top + 20,
              height: Math.max(height, 30),
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        {/* Mostrar título solo si hay espacio suficiente */}
        {eventWidth > 40 && height > 20 && (
          <View
            style={[
              styles.complexEventText,
              {
                top: top + 25,
                left: leftPosition + 8,
                maxWidth: eventWidth - 12,
              }
            ]}
          >
            <Text style={styles.complexEventTitle} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => changeMonth('prev')}
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

      {renderLegend()}

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
              positionedEvents.map((event) => 
                isSimplifiedView 
                  ? renderSimplifiedEvent(event)
                  : renderComplexEvent(event)
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
    minHeight: 715,
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
  },
  eventPersonName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  eventCategory: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginBottom: 2,
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
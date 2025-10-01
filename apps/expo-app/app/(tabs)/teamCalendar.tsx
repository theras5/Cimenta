import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { Task } from '../../services/taskService';

const { width } = Dimensions.get('window');

const CalendarSchedule = () => {
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
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const currentMonth = `${months[currentMonthIndex]}, ${currentYear}`;
  
  // Colores por categoría/área de trabajo
  const categoryColors: { [key: string]: string } = {
  'pintura': '#FF2D92',
  'plomeria': '#FF9500', 
  'electricidad': '#007AFF',
  'construccion': '#8A2BE2',
  // Color por defecto
  'default': '#999999'
  };

  // Obtener color para una categoría
  const getCategoryColor = (category: string): string => {
    const normalizedCategory = category.toLowerCase().trim();
    return categoryColors[normalizedCategory] || categoryColors['default'];
  };

  // Actualizar tareas cuando cambie el mes/año o al montar el componente
  useEffect(() => {
    fetchTasks();
  }, [currentYear, currentMonthIndex, fetchTasks]);

  // Inicialización inicial (solo una vez al montar el componente)
  useEffect(() => {
    // Componente montado correctamente
  }, []);

  // Regresar al día de hoy SOLO cuando se navega desde otra pantalla
  useFocusEffect(
    React.useCallback(() => {
      // Recalcular la fecha actual cuando se enfoca la pantalla
      const currentToday = new Date();
      const currentTodayDate = currentToday.getDate();
      const currentTodayMonth = currentToday.getMonth();
      const currentTodayYear = currentToday.getFullYear();
      
      // Solo actualizar al día actual
      setCurrentYear(currentTodayYear);
      setCurrentMonthIndex(currentTodayMonth);
      setSelectedDate(currentTodayDate);
    }, []) // Array vacío para que no dependa de los estados internos
  );

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

  // Convertir tareas en eventos del calendario
  const convertTasksToEvents = (): CalendarEvent[] => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks
      .filter(task => task.start_date && task.end_date) // Solo tareas con fechas
      .map(task => {
        const startDate = new Date(task.start_date!);
        const endDate = new Date(task.end_date!);
        
        // Filtrar solo tareas del mes actual
        if (startDate.getFullYear() !== currentYear || startDate.getMonth() !== currentMonthIndex) {
          return [];
        }
        
        // Extraer horarios de las fechas o usar valores por defecto
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
      .flat() // Aplanar el array de arrays
      .filter(event => event !== null && event !== undefined);
  };

  const events = convertTasksToEvents();

  // Generar todos los días del mes actual
  const generateCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay();
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    
    // Verificar si estamos en el mes/año actual usando la fecha dinámica
    const isCurrentYearMonth = currentYear === todayYear && currentMonthIndex === todayMonth;
    
    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      calendarDays.push({
        date: day,
        dayName: dayNames[dayOfWeek],
        isToday: isCurrentYearMonth && day === todayDate // Marcar el día actual dinámicamente
      });
    }
    return calendarDays;
  };
  
  // Función para cambiar mes
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
    // Resetear fecha seleccionada al 1 del nuevo mes
    setSelectedDate(1);
  };
  
  const calendarDays = generateCalendarDays();
  const hours = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`); // Cambiado para empezar a las 8:00

  // Filtrar eventos del día seleccionado
  const todayEvents = events.filter(event => event.date === selectedDate);
  
  // Obtener categorías activas del día
  const activeCategories = Array.from(new Set(todayEvents.map(event => event.category)))
    .map(category => ({
      name: category,
      color: getCategoryColor(category)
    }));
  
  const isSimplifiedView = todayEvents.length <= 2; // Vista simplificada para ≤2 eventos, vista compleja para >2 eventos

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Ordenar eventos por hora de inicio
  const sortedTodayEvents = [...todayEvents].sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const getEventPosition = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const startHour = 8 * 60; // 8:00 AM en minutos (cambiado de 9)
    
    const top = ((startMinutes - startHour) / 60) * 55; // 55px por hora para mejor espaciado
    const height = ((endMinutes - startMinutes) / 60) * 55;
    
    return { top, height };
  };

  // Función para navegar a la tarea
  const navigateToTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };



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
    
    // Calcular ancho dinámico basado en el número de eventos superpuestos
    const totalOverlappingEvents = overlappingEvents.length + 1; // +1 para incluir el evento actual
    const availableWidth = width - 100; // Espacio disponible (75px inicio + 25px final)
    const spacing = Math.max(3, Math.min(8, availableWidth / (totalOverlappingEvents * 15))); // Espaciado dinámico entre 3-8px
    const eventWidth = Math.max((availableWidth - (totalOverlappingEvents - 1) * spacing) / totalOverlappingEvents, 60); // Mínimo 60px
    
    let leftPosition;
    
    if (overlappingEvents.length === 0) {
      // Si no hay superposición, ocupa todo el ancho disponible
      leftPosition = 75;
    } else {
      // Si hay superposición, distribuir proporcionalmente
      // Encontrar la posición de este evento entre los superpuestos
      const allOverlappingEvents = [event, ...overlappingEvents].sort((a, b) => {
        const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
      const eventPosition = allOverlappingEvents.findIndex(e => e.id === event.id);
      leftPosition = 75 + eventPosition * (eventWidth + spacing);
    }
    
    return (
      <TouchableOpacity 
        key={event.id}
        onPress={() => navigateToTask(event.taskId)}
        activeOpacity={0.7}
      >
        {/* Fondo del evento */}
        <View
          style={[
            styles.simplifiedEventBackground,
            {
              top: top + 20,
              height: Math.max(height, 80),
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
              height: Math.max(height, 80),
              left: leftPosition,
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        {/* Texto del evento */}
        <View
          style={[
            styles.simplifiedEventText,
            {
              top: top + 35,
              left: leftPosition + 15,
            }
          ]}
        >
          <Text style={styles.eventPersonName} numberOfLines={1} ellipsizeMode="tail">{event.title}</Text>
          <Text style={styles.eventCategory} numberOfLines={1} ellipsizeMode="tail">{event.category.charAt(0).toUpperCase() + event.category.slice(1)}</Text>
          <Text style={styles.eventTime} numberOfLines={1} ellipsizeMode="tail">{event.startTime} - {event.endTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderComplexEvent = (event: CalendarEvent, eventIndex: number) => {
    const { top, height } = getEventPosition(event.startTime, event.endTime);

    // Distribuir eventos horizontalmente por índice (no por categoría)
    const totalWidth = width - 100; // Espacio disponible
    const totalEvents = sortedTodayEvents.length;
    const eventWidth = Math.max(totalWidth / totalEvents - 8, 35); // Aumentar mínimo para texto
    const spacing = (totalWidth - (eventWidth * totalEvents)) / (totalEvents + 1); // Espaciado uniforme
    const leftPosition = 75 + spacing + eventIndex * (eventWidth + spacing);
    
    // Función para obtener texto optimizado que quepa en la barra
    const getOptimizedContent = () => {
      const actualHeight = Math.max(height, 30);
      const availableWidth = eventWidth - 12; // Espacio disponible para texto
      const timeText = `${event.startTime}-${event.endTime}`;
      
      // Calcular cuántas líneas podemos mostrar basado en la altura
      const availableLines = Math.floor((actualHeight - 10) / 11); // 11px por línea (9px font + 2px spacing)
      
      if (availableLines >= 3 && actualHeight >= 80) {
        // Espacio para título completo + horario + categoría
        const maxTitleChars = Math.floor(availableWidth / 5.5); // Aproximadamente 5.5px por carácter
        const truncatedTitle = event.title.length > maxTitleChars ? 
          event.title.substring(0, maxTitleChars - 2) + '..' : event.title;
        return {
          title: truncatedTitle,
          time: timeText,
          category: event.category.charAt(0).toUpperCase() + event.category.slice(1),
          lines: 3
        };
      } else if (availableLines >= 2 && actualHeight >= 50) {
        // Espacio para título + horario
        const maxTitleChars = Math.floor(availableWidth / 5.5);
        const truncatedTitle = event.title.length > maxTitleChars ? 
          event.title.substring(0, maxTitleChars - 2) + '..' : event.title;
        return {
          title: truncatedTitle,
          time: timeText,
          category: null,
          lines: 2
        };
      } else if (availableLines >= 1) {
        // Solo una línea - priorizar nombre sobre horario si es posible
        const maxChars = Math.floor(availableWidth / 5.5);
        if (event.title.length + timeText.length + 1 <= maxChars) {
          // Si cabe todo en una línea
          return {
            title: `${event.title} ${timeText}`,
            time: null,
            category: null,
            lines: 1
          };
        } else if (event.title.length <= maxChars - 3) {
          // Si el título cabe con espacio para horario corto
          const shortTime = `${event.startTime.substring(0, 2)}h`;
          return {
            title: `${event.title} ${shortTime}`,
            time: null,
            category: null,
            lines: 1
          };
        } else {
          // Solo título truncado
          const truncatedTitle = event.title.length > maxChars ? 
            event.title.substring(0, maxChars - 2) + '..' : event.title;
          return {
            title: truncatedTitle,
            time: null,
            category: null,
            lines: 1
          };
        }
      } else {
        // Espacio muy limitado - solo iniciales
        const initials = event.title.split(' ')
          .map(word => word.charAt(0))
          .join('')
          .substring(0, 3)
          .toUpperCase();
        return {
          title: initials,
          time: null,
          category: null,
          lines: 1
        };
      }
    };
    
    const content = getOptimizedContent();
    
    return (
      <TouchableOpacity 
        key={event.id}
        onPress={() => navigateToTask(event.taskId)}
        activeOpacity={0.7}
      >
        {/* Fondo del evento */}
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
        
        {/* Barra de color */}
        <View
          style={[
            styles.complexEventBar,
            {
              top: top + 20,
              height: Math.max(height, 30),
              left: leftPosition,
              width: 4, // Barra más fina como en la imagen
              backgroundColor: event.categoryColor,
            }
          ]}
        />
        
        {/* Texto de la tarea */}
        <View
          style={[
            styles.complexEventText,
            {
              top: top + 25,
              left: leftPosition + 8, // Después de la barra de color
              width: eventWidth - 12,
              height: Math.max(height - 10, 20),
            }
          ]}
        >
          {/* Título de la tarea */}
          <Text 
            style={styles.complexEventLabel}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {content.title}
          </Text>
          
          {/* Horario (si hay espacio) */}
          {content.time && (
            <Text 
              style={styles.complexEventTime}
              numberOfLines={1}
            >
              {content.time}
            </Text>
          )}
          
          {/* Categoría (si hay espacio) */}
          {content.category && (
            <Text 
              style={styles.complexEventCategory}
              numberOfLines={1}
            >
              {content.category}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - navegación de mes */}
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
      
      {/* Month Picker Modal */}
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



      {/* Calendar Days */}
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

      {/* Schedule */}
      <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.schedule}>
          {/* Time Labels */}
          <View style={styles.timeColumn}>
            {hours.map(hour => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeText}>{hour}</Text>
              </View>
            ))}
          </View>

          {/* Grid Lines */}
          <View style={styles.gridContainer}>
            {hours.map((hour, index) => (
              <View key={hour} style={[styles.gridLine, { top: index * 55 + 20 }]} />
            ))}
          </View>

          {/* Events */}
          <View style={styles.eventsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando tareas...</Text>
              </View>
            ) : (
              sortedTodayEvents.map((event, index) => 
                isSimplifiedView 
                  ? renderSimplifiedEvent(event, index)
                  : renderComplexEvent(event, index)
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
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
    paddingTop: 70, // Bajado más para igualar la pantalla de tareas
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
    minHeight: 715, // 13 hours * 55px (ahora empieza a las 8:00)
  },
  // Estilos para vista simplificada
  simplifiedEventBackground: {
    position: 'absolute',
    borderRadius: 8,
  },
  simplifiedEventBar: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
  simplifiedEventText: {
    position: 'absolute',
    paddingLeft: 8,
  },
  eventPersonName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  eventTime: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  eventCategory: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
    marginBottom: 1,
  },
  // Estilos para vista compleja
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  complexEventLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
    textAlign: 'left',
    lineHeight: 11,
  },
  complexEventTime: {
    fontSize: 8,
    fontWeight: '500',
    color: '#666',
    textAlign: 'left',
    lineHeight: 10,
  },
  complexEventCategory: {
    fontSize: 7,
    fontWeight: '400',
    color: '#888',
    textAlign: 'left',
    lineHeight: 9,
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
  activeNavItem: {
    // Styles for active nav item
  },
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
  // Estilos para navegación de meses
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
  // Estilos para el selector de mes
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
  // Estilos para estados de carga y vacío
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
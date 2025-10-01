import React, { useState, useEffect } from "react"
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useTasks } from "../../hooks/useTasks"
import { Task } from "../../services/taskService"

const { width } = Dimensions.get("window")

// Colores por categoría/área de trabajo (mismo esquema que el calendario)
const categoryColors: { [key: string]: string } = {
  'pintura': '#FF2D92',
  'plomeria': '#FF9500', 
  'electricidad': '#007AFF',
  'construccion': '#8A2BE2',
  // Color por defecto
  'default': '#999999'
}

// Función para obtener color de categoría
const getCategoryColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase().trim();
  return categoryColors[normalizedCategory] || categoryColors['default'];
}

const GanttChart = () => {
  const { tasks, isLoading, fetchTasks } = useTasks();
  
  // Estado para controlar qué categorías están expandidas
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]) // Array de nombres de categorías
  
  // Función para navegar a la tarea
  const navigateToTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };
  
  // Cargar tareas al montar el componente
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  // Función para obtener color por categoría
  const getCategoryColor = (categoryName: string): string => {
    return categoryColors[categoryName] || '#666666'
  }
  
  // Procesar tareas para el Gantt
  const processedTasks = tasks
    .filter(task => task.start_date && task.end_date && task.category)
    .map(task => ({
      id: task.id,
      name: task.title,
      category: task.category!,
      startDate: new Date(task.start_date!),
      endDate: new Date(task.end_date!),
      color: getCategoryColor(task.category!)
    }));
  
  // Obtener categorías únicas de las tareas
  const categories = Array.from(new Set(processedTasks.map(task => task.category)))
    .map(categoryName => ({
      name: categoryName,
      color: getCategoryColor(categoryName),
      tasks: processedTasks.filter(task => task.category === categoryName)
    }))
    .filter(category => category.tasks.length > 0); // Solo categorías con tareas
  
  console.log('TAREAS PROCESADAS:');
  processedTasks.forEach(task => {
    console.log(`${task.name}: ${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}`);
  });
    
  // Timeline dinámico basado en las fechas de las tareas, empezando desde hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalizar a medianoche
  console.log('=== DIAGNÓSTICO GANTT ===');
  console.log('HOY:', today.toLocaleDateString());
  console.log('HOY:', today);
  
  // Calcular rango de fechas de las tareas
  const taskDates = processedTasks.flatMap(task => {
    const start = new Date(task.startDate)
    const end = new Date(task.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return [start, end]
  })
  const latestTaskDate = taskDates.length > 0 ? new Date(Math.max(...taskDates.map(d => d.getTime()))) : today
  
  // Definir inicio del timeline desde el inicio de la semana actual
  const timelineStart = new Date(today)
  timelineStart.setDate(today.getDate() - today.getDay()) // Domingo de esta semana
  timelineStart.setHours(0, 0, 0, 0)
  console.log('TIMELINE START:', timelineStart.toLocaleDateString());
  
  // Verificar si alguna tarea empieza antes del timeline
  const earliestTaskDate = taskDates.length > 0 ? new Date(Math.min(...taskDates.map(d => d.getTime()))) : today
  console.log('TAREA MÁS TEMPRANA:', earliestTaskDate.toLocaleDateString());
  console.log('TAREA MÁS TARDÍA:', latestTaskDate.toLocaleDateString());
  
  // Si hay tareas antes del timeline, ajustar el inicio
  const adjustedTimelineStart = new Date(Math.min(timelineStart.getTime(), earliestTaskDate.getTime()))
  adjustedTimelineStart.setHours(0, 0, 0, 0)
  console.log('TIMELINE START AJUSTADO:', adjustedTimelineStart.toLocaleDateString());
  
  // Definir fin del timeline (al menos 60 días desde hoy o 2 semanas después de la última tarea)
  const timelineEnd = new Date(Math.max(
    today.getTime() + (60 * 24 * 60 * 60 * 1000), // Al menos 60 días desde hoy
    latestTaskDate.getTime() + (14 * 24 * 60 * 60 * 1000) // 2 semanas después de la última tarea
  ))
  timelineEnd.setHours(23, 59, 59, 999) // Final del día
  
  const dayWidth = 20 // Píxeles por día - más ancho para mejor visibilidad
  console.log('ANCHO POR DÍA:', dayWidth, 'px');
  const weekWidth = dayWidth * 7 // 140px por semana
  const oneDayMs = 24 * 60 * 60 * 1000
  
  // Generar semanas para el header - CORREGIDO
  const weeks: Date[] = []
  const currentWeek = new Date(adjustedTimelineStart)
  while (currentWeek <= timelineEnd) {
    weeks.push(new Date(currentWeek))
    currentWeek.setDate(currentWeek.getDate() + 7)
  }
  
  const getTaskPosition = (task: any) => {
    // Usar directamente las fechas sin normalización compleja
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    
    // Resetear a medianoche para cálculo consistente
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
    
    // Calcular días desde el inicio del timeline
    const daysSinceStart = Math.round((startDate.getTime() - adjustedTimelineStart.getTime()) / oneDayMs)
    const daysSinceEnd = Math.round((endDate.getTime() - adjustedTimelineStart.getTime()) / oneDayMs)
    
    // La duración es la diferencia + 1 día (para incluir ambos días)
    const duration = Math.max(1, daysSinceEnd - daysSinceStart + 1)
    
    const left = daysSinceStart * dayWidth
    const width = duration * dayWidth
    
    console.log(`TAREA ${task.name} [${task.category}]:`);
    console.log(`  Fechas: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log(`  Días: ${daysSinceStart} - ${daysSinceEnd} (duración: ${duration})`);
    console.log(`  Posición: ${left}px, ancho: ${width}px`);
    
    return {
      left: Math.max(0, left),
      width: Math.max(dayWidth, width)
    }
  }
  
  const getWeekLabel = (weekStart: Date) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const startDay = weekStart.getDate()
    const endDay = weekEnd.getDate()
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", 
                       "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    const startMonth = monthNames[weekStart.getMonth()]
    const endMonth = monthNames[weekEnd.getMonth()]

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startDay}-${endDay}\n${startMonth}`
    } else {
      return `${startDay} ${startMonth}\n${endDay} ${endMonth}`
    }
  }
  const rowHeight = 50

  // Función para toggle de categorías
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    )
  }

  // Función para obtener la posición de la barra unificada de una categoría
  const getCategoryUnifiedPosition = (categoryName: string) => {
    const categoryTasks = processedTasks.filter(t => t.category === categoryName)
    if (categoryTasks.length === 0) return { left: 0, width: 0 }
    
    // Calcular la posición de cada tarea usando la misma lógica que getTaskPosition
    const taskPositions = categoryTasks.map(task => {
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      
      // Resetear a medianoche para cálculo consistente
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)
      
      const daysSinceStart = Math.round((startDate.getTime() - adjustedTimelineStart.getTime()) / oneDayMs)
      const daysSinceEnd = Math.round((endDate.getTime() - adjustedTimelineStart.getTime()) / oneDayMs)
      
      return {
        startDay: daysSinceStart,
        endDay: daysSinceEnd,
        taskName: task.name
      }
    })
    
    // Encontrar el día más temprano y más tardío
    const earliestDay = Math.min(...taskPositions.map(p => p.startDay))
    const latestDay = Math.max(...taskPositions.map(p => p.endDay))
    
    const duration = Math.max(1, latestDay - earliestDay + 1)
    const left = earliestDay * dayWidth
    const width = duration * dayWidth
    
    console.log(`CATEGORÍA ${categoryName}:`);
    console.log(`  Rango: día ${earliestDay} - ${latestDay} (${duration} días)`);
    console.log(`  Posición: ${left}px, ancho: ${width}px`);
    
    console.log(`CATEGORÍA ${categoryName}: ${duration} días totales`);    
    return {
      left: Math.max(0, left),
      width: Math.max(dayWidth, width)
    }
  }
  
  // Verificar si una categoría está expandida
  const isCategoryExpanded = (categoryName: string) => {
    return expandedCategories.includes(categoryName)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>Diagrama de Gantt</Text>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (processedTasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>Diagrama de Gantt</Text>
          </View>
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No hay tareas con fechas programadas</Text>
          <Text style={styles.emptySubtitle}>Agrega fechas de inicio y fin a tus tareas</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Diagrama de Gantt</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Left column - Fixed task names */}
        <View style={styles.leftColumn}>
          {/* Timeline header spacer */}
          <View style={styles.timelineHeaderSpacer} />

          {/* Category and task names */}
          <View style={styles.namesContainer}>
            {categories.map((category) => {
              const categoryTasks = category.tasks
              const isExpanded = isCategoryExpanded(category.name)

              return (
                <View key={category.name} style={styles.categorySection}>
                  {/* Category Name */}
                  <TouchableOpacity 
                    style={styles.categoryNameCell}
                    onPress={() => toggleCategory(category.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryHeader}>
                      <Ionicons 
                        name={isExpanded ? "chevron-down" : "chevron-forward"} 
                        size={16} 
                        color="#666"
                        style={{ marginRight: 4 }}
                      />
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Task Names - Solo mostrar si está expandida */}
                  {isExpanded && categoryTasks.map((task) => (
                    <View key={task.id} style={styles.taskNameCell}>
                      <Text style={styles.taskName} numberOfLines={1}>
                        {task.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        </View>

        {/* Right column - Scrollable timeline and bars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rightColumn}>
          <View>
            {/* Timeline Header */}
            <View style={styles.timelineHeaderRow}>
              {weeks.map((week, index) => (
                <View key={index} style={[styles.dateCell, { width: weekWidth }]}>
                  <Text style={styles.weekLabel}>{getWeekLabel(week)}</Text>
                </View>
              ))}
            </View>

            {/* Gantt Chart Content */}
            <View>
              {categories.map((category) => {
                const categoryTasks = category.tasks
                const isExpanded = isCategoryExpanded(category.name)

                return (
                  <View key={category.name} style={styles.categorySection}>
                    {/* Category Row */}
                    <View style={styles.categoryTimelineRow}>
                      <View style={[styles.timelineRow, { width: weeks.length * weekWidth }]}>
                        {weeks.map((_, index) => (
                          <View key={index} style={[styles.gridCell, { width: weekWidth }]} />
                        ))}
                        {/* Barra unificada cuando está colapsada */}
                        {!isExpanded && categoryTasks.length > 0 && (
                          <View
                            style={[
                              styles.taskBar,
                              {
                                backgroundColor: category.color,
                                ...getCategoryUnifiedPosition(category.name),
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.taskBarBackground,
                                {
                                  backgroundColor: category.color + "20",
                                },
                              ]}
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Task Rows - Solo mostrar si está expandida */}
                    {isExpanded && categoryTasks.map((task) => {
                      const position = getTaskPosition(task)
                      return (
                        <View key={task.id} style={styles.taskTimelineRow}>
                          <View style={[styles.timelineRow, { width: weeks.length * weekWidth }]}>
                            {weeks.map((_, index) => (
                              <View key={index} style={[styles.gridCell, { width: weekWidth }]} />
                            ))}
                            <TouchableOpacity 
                              onPress={() => navigateToTask(task.id)}
                              activeOpacity={0.7}
                              style={[
                                styles.taskBar,
                                {
                                  backgroundColor: task.color,
                                  left: position.left,
                                  width: position.width,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.taskBarBackground,
                                  {
                                    backgroundColor: task.color + "20",
                                  },
                                ]}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  leftColumn: {
    width: 180,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  rightColumn: {
    flex: 1,
  },
  timelineHeaderSpacer: {
    height: 50,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  namesContainer: {
    flex: 1,
  },
  categoryNameCell: {
    height: 50,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
  },
  taskNameCell: {
    height: 40,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timelineHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    height: 50,
  },
  categoryTimelineRow: {
    height: 50,
    backgroundColor: "#F9F9F9",
  },
  taskTimelineRow: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timelineRow: {
    flexDirection: "row",
    position: "relative",
    height: "100%",
  },
  gridCell: {
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
  },
  taskBar: {
    position: "absolute",
    height: 28,
    top: 11,
    borderRadius: 6,
    overflow: "hidden",
  },
  taskBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
  },
  categorySection: {
    borderBottomWidth: 2,
    borderBottomColor: "#E5E5E5",
  },
  categoryHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 6,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  taskName: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 13,
    color: "#666666",
  },
  dateCell: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666666",
    textAlign: "center",
    lineHeight: 14,
  },
})

export default GanttChart

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
    
  // Timeline dinámico basado en las fechas de las tareas
  const today = new Date()
  
  // Calcular rango de fechas de las tareas
  const taskDates = processedTasks.flatMap(task => [task.startDate, task.endDate])
  const earliestTaskDate = taskDates.length > 0 ? new Date(Math.min(...taskDates.map(d => d.getTime()))) : today
  const latestTaskDate = taskDates.length > 0 ? new Date(Math.max(...taskDates.map(d => d.getTime()))) : today
  
  // Definir inicio y fin del timeline con margen
  const timelineStart = new Date(Math.min(today.getTime(), earliestTaskDate.getTime()))
  const timelineEnd = new Date(Math.max(
    today.getTime() + (30 * 24 * 60 * 60 * 1000), // Al menos 30 días desde hoy
    latestTaskDate.getTime() + (14 * 24 * 60 * 60 * 1000) // 2 semanas después de la última tarea
  ))
  
  const weekWidth = 80
  const dayWidth = weekWidth / 7 // ~11.43px por día para mantener consistencia
  const oneDayMs = 24 * 60 * 60 * 1000
  
  // Generar semanas para el header
  const weeks: Date[] = []
  for (let d = new Date(timelineStart); d <= timelineEnd; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d))
  }
  
  const getTaskPosition = (task: any) => {
    const startDays = (task.startDate.getTime() - timelineStart.getTime()) / oneDayMs
    const endDays = (task.endDate.getTime() - timelineStart.getTime()) / oneDayMs
    
    const startX = startDays * dayWidth
    const endX = endDays * dayWidth
    
    console.log(`Task: ${task.name}`)
    console.log(`Start Date: ${task.startDate.toISOString()}`)
    console.log(`End Date: ${task.endDate.toISOString()}`) 
    console.log(`Start Days: ${startDays}, End Days: ${endDays}`)
    console.log(`Start X: ${startX}, End X: ${endX}, Width: ${endX - startX}`)
    
    return {
      left: Math.max(0, startX),
      width: Math.max(dayWidth, endX - startX), // Mínimo ancho de 1 día
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
    
    const earliestStart = Math.min(...categoryTasks.map(t => t.startDate.getTime()))
    const latestEnd = Math.max(...categoryTasks.map(t => t.endDate.getTime()))
    
    const startDays = (earliestStart - timelineStart.getTime()) / oneDayMs
    const endDays = (latestEnd - timelineStart.getTime()) / oneDayMs
    
    const startX = startDays * dayWidth
    const endX = endDays * dayWidth
    
    return {
      left: Math.max(0, startX),
      width: Math.max(dayWidth, endX - startX),
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
                            <View
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
                            </View>
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

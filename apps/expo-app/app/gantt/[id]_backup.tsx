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
  'otros': '#666666'
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
    
  // Constantes para el timeline
  const timelineStart = new Date()
  const timelineEnd = new Date(timelineStart.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 días
  const dayWidth = 100
  const oneDayMs = 24 * 60 * 60 * 1000
  const weekWidth = 80  // Más compacto
  
  // Generar semanas para el header
  const weeks: Date[] = []
  for (let d = new Date(timelineStart); d <= timelineEnd; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d))
  }
  
  const getTaskPosition = (task: any) => {
    const startX = ((task.startDate.getTime() - timelineStart.getTime()) / oneDayMs) * dayWidth
    const endX = ((task.endDate.getTime() - timelineStart.getTime()) / oneDayMs) * dayWidth
    
    return {
      left: Math.max(0, startX),
      width: Math.max(0, endX - startX),
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

  const getCategoryUnifiedPosition = (categoryName: string) => {
    const categoryTasks = processedTasks.filter(t => t.category === categoryName)
    if (categoryTasks.length === 0) return { left: 0, width: 0 }
    
    const earliestStart = Math.min(...categoryTasks.map(t => t.startDate.getTime()))
    const latestEnd = Math.max(...categoryTasks.map(t => t.endDate.getTime()))
    
    const startX = ((earliestStart - timelineStart.getTime()) / oneDayMs) * dayWidth
    const endX = ((latestEnd - timelineStart.getTime()) / oneDayMs) * dayWidth
    
    return {
      left: Math.max(0, startX),
      width: Math.max(0, endX - startX),
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Diagrama de Gantt</Text>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Diagrama de Gantt</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Diagrama de Gantt</Text>
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
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 8,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
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
    width: 150,  // Más compacto
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  rightColumn: {
    flex: 1,
  },
  timelineHeaderSpacer: {
    height: 40,  // Más compacto
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  namesContainer: {
    flex: 1,
  },
  categoryNameCell: {
    height: 45,  // Más compacto
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
  },
  taskNameCell: {
    height: 35,  // Más compacto
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timelineHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    height: 40,  // Más compacto
  },
  categoryTimelineRow: {
    height: 45,  // Más compacto
    backgroundColor: "#F9F9F9",
  },
  taskTimelineRow: {
    height: 35,  // Más compacto
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
    height: 24,  // Más compacto
    top: 10,
    borderRadius: 4,
    overflow: "hidden",
  },
  taskBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  categorySection: {
    borderBottomWidth: 1,
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
    width: 10,  // Más pequeño
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 14,  // Más pequeño
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  taskName: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,  // Más pequeño
    color: "#666666",
  },
  dateCell: {
    height: 40,  // Más compacto
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
  },
  weekLabel: {
    fontSize: 10,  // Más pequeño
    fontWeight: "500",
    color: "#666666",
    textAlign: "center",
    lineHeight: 12,
  },
})

export default GanttChart
import type React from "react";
import { Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Task } from "@/services/taskService";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useAssignedTo } from "@/hooks/useAssignedTo";

export interface Category{
  name: string;
  color: string;
}

interface TaskCardProps {
  task: Task;
  changes?: boolean;
  routePrefix?: 'tasks' | 'changes' | 'purchases';
}

const getStatusBgColor = (status: Task["status"]) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100";
    case "in_progress":
      return "bg-blue-100";
    case "completed":
      return "bg-green-100";
    case "blocked":
      return "bg-orange-100";
    case "changes":
      return "bg-purple-100";
    case "rejected":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
};

const getCategoryColor = (category: string) => {
  const normalizedCategory = category.toLowerCase();
  switch (normalizedCategory) {
    case "electricidad":
      return "#007AFF";
    case "plomeria":
      return "#FF9500";
    case "construccion":
      return "#8A2BE2";
    case "pintura":
      return "#FF2D92";
    default:
      return "#999999";
  }
};


const TaskCard: React.FC<TaskCardProps> = ({ task, changes, routePrefix }) => {

  const { getWorkersByTask } = useAssignedTo();
  const [assignedWorkersCount, setAssignedWorkersCount] = useState<number>(0);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    const loadAssignedWorkers = async () => {
      if (!task?.id) {
        setLoadingWorkers(false);
        return;
      }

      try {
        setLoadingWorkers(true);
        const workers = await getWorkersByTask(task.id);
        setAssignedWorkersCount(workers.length);
      } catch (error) {
        // Silenciar errores de red - no crítico para la funcionalidad principal
        setAssignedWorkersCount(0);
      } finally {
        setLoadingWorkers(false);
      }
    };

    loadAssignedWorkers();
  }, [task?.id, getWorkersByTask]);

  return (
    <TouchableOpacity
      className={`${getStatusBgColor(task.status)} rounded-2xl p-5 mb-3 mr-3 w-72 h-40`}
      onPress={() => {
        // Si se especifica un routePrefix, usarlo
        if (routePrefix) {
          router.push(`/${routePrefix}/${task.id}`);
          return;
        }

        // Si la tarea está REJECTED, forzamos la navegación a /tasks/:id para mostrar el detalle de task
        if (task.status === 'rejected') {
          router.push(`/tasks/${task.id}`);
          return;
        }

        // Si es una solicitud de cambio (prop o status), vamos a /changes/:id
        if (changes || task.status === 'changes') {
          router.push(`/changes/${task.id}`);
          return;
        }

        // Por defecto navegamos al detalle de tarea
        router.push(`/tasks/${task.id}`);
      }}
    >
      <View className="flex-1">
        {/* Contenido superior */}
        <View className="flex-1">
          <Text className="text-gray-800 font-semibold text-lg mb-2" numberOfLines={1}>
            {task.title}
          </Text>
          <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
            {task.description}
          </Text>
        </View>

        {/* Footer fijo en la parte inferior */}
        <View className="flex-row justify-between items-center">
          {/* Workers asignados */}

          {/* Para implementar esta propiedad tengo que ver de que cuando voy para la pantalla de tasks después de editar una tarea se actualice la info de la TaskCard */}

          {/* <View className="flex-row items-center">
            {loadingWorkers ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : assignedWorkersCount > 0 ? (
              <View className="flex-row items-center bg-white/50 px-2 py-1 rounded-full">
                <Ionicons name="people" size={14} color="#6B7280" />
                <Text className="text-gray-700 text-xs font-medium ml-1">
                  {assignedWorkersCount}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center opacity-50">
                <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">
                  Sin asignar
                </Text>
              </View>
            )}
          </View> */}

          {/* Categoría */}
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: task.categoryColor || getCategoryColor(task.category) }}
          >
            <Text className="text-white text-xs font-medium">
              {task.category}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TaskCard;
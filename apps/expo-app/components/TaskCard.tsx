import type React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Task } from "@/services/taskService";

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
          <View className="flex-row">
            {task.assignedMembers && task.assignedMembers.length > 0 && (
              <Text className="text-gray-500 text-xs">
                {task.assignedMembers.length} miembro(s)
              </Text>
            )}
          </View>

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
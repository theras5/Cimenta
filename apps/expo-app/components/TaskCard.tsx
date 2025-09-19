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
  changes?: boolean
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
      return "bg-red-100";
    case "changes":
      return "bg-purple-100";
    default:
      return "bg-gray-100";
  }
};

const getCategoryColor = (category: string) => {
  const normalizedCategory = category.toUpperCase();
  switch (normalizedCategory) {
    case "ELECTRICIDAD":
      return "bg-blue-500";
    case "PLOMERÍA":
    case "PLOMERIA":
      return "bg-orange-500";
    case "CONSTRUCCIÓN":
    case "CONSTRUCCION":
      return "bg-gray-500";
    case "PINTURA":
      return "bg-pink-500";
    default:
      return "bg-purple-500";
  }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, changes }) => {
  return (
    <TouchableOpacity
      className={`${getStatusBgColor(task.status)} rounded-2xl p-5 mb-3 mr-3 w-72 h-40`}
      onPress={changes ? () => router.push(`/changes/${task.id}`) : () => router.push(`/tasks/${task.id}`)}
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
            className={`${task.categoryColor || getCategoryColor(task.category)} px-3 py-1 rounded-full`}
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
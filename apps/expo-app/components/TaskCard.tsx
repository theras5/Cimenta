import type React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

export interface Category {
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  category: Category["name"];
  categoryColor: Category["color"];
  bgColor: string;
  avatars: string[];
}

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const handlePress = () => {
    // Navigate to task detail screen with task ID
    router.push(`/tasks/${task.id}`);
  };

  return (
    <TouchableOpacity 
      className={`${task.bgColor} rounded-2xl p-4 mb-3 mr-3 w-72`} 
      onPress={handlePress}
    >
      <Text className="text-gray-800 font-semibold text-lg mb-1">
        {task.title}
      </Text>
      <Text className="text-gray-600 text-sm mb-4 leading-5">
        {task.description}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="flex-row">
          {task.avatars.map((avatar, index) => (
            <View
              key={index}
              className="w-8 h-8 rounded-full bg-white items-center justify-center border-2 border-white -ml-1 first:ml-0"
            >
              <Text className="text-xs">{avatar}</Text>
            </View>
          ))}
        </View>

        <View className={`${task.categoryColor} px-3 py-1 rounded-full`}>
          <Text className="text-white text-xs font-medium">{task.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TaskCard;
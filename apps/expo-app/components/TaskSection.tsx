import type React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import TaskCard, { type Task } from "./TaskCard";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  onSeeAll: () => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  tasks,
  onSeeAll,
}) => (
  <View className="mb-6">
    <View className="flex-row justify-between items-center mb-4 px-4">
      <Text className="text-gray-800 font-bold text-xl">{title}</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text className="text-blue-500 font-medium">ver todo</Text>
      </TouchableOpacity>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="pl-4"
    >
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </ScrollView>
  </View>
);

export default TaskSection;

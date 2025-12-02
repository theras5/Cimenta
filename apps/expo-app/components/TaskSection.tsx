import type React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import TaskCard from "./TaskCard";
import { Task } from "@/services/taskService";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  onSeeAll?: () => void;
  changes?: boolean;
  routePrefix?: 'tasks' | 'changes' | 'purchases';
}

const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  tasks,
  onSeeAll,
  changes,
  routePrefix,
}) => (
  <View className="mb-6">
    <View className="flex-row justify-between items-center mb-4 px-4">
      <Text className="text-gray-800 font-bold text-xl">{title} ({tasks.length})</Text>
      {/* <TouchableOpacity onPress={onSeeAll}>
        <Text className="text-blue-500 font-medium">ver todo</Text>
      </TouchableOpacity> */}
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="pl-4"
    >
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} changes={changes} routePrefix={routePrefix} />
      ))}
    </ScrollView>
  </View>
);

export default TaskSection;

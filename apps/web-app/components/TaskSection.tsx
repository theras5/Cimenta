"use client"

import type React from "react"
import TaskCard from "./TaskCard"
import { Task } from "@/lib/api"

interface TaskSectionProps {
  title: string
  tasks: Task[]
  onSeeAll?: () => void
  changes?: boolean
  onEditTask?: (task: Task) => void
}

const TaskSection: React.FC<TaskSectionProps> = ({ title, tasks, onSeeAll, changes, onEditTask }) => (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-gray-800">
        {title} ({tasks.length})
      </h2>
    </div>

    <div className="flex overflow-x-auto space-x-4 pb-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} changes={changes} onEdit={onEditTask} />
      ))}
    </div>
  </div>
)

export default TaskSection

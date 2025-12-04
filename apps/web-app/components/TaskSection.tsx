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
  onAssignWorkers?: (task: Task) => void
}

const TaskSection: React.FC<TaskSectionProps> = ({ 
  title, 
  tasks, 
  onSeeAll, 
  changes, 
  onEditTask,
  onAssignWorkers 
}) => (
  <div className="mb-2">
    <div className="flex justify-between items-center mb-3">
      <h2 className="text-xl font-bold text-gray-800">
        {title} ({tasks.length})
      </h2>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Ver todas
        </button>
      )}
    </div>

    <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-hide">
      {tasks.map((task) => (
        <TaskCard 
          key={task.id} 
          task={task} 
          changes={changes} 
          onEdit={onEditTask}
          onAssignWorkers={onAssignWorkers}
        />
      ))}
    </div>
  </div>
)

export default TaskSection
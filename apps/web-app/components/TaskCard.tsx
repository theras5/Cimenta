"use client"

import type React from "react"

interface Task {
  id: number
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "blocked" | "changes"
  category: string
  assignedMembers?: string[]
}

interface TaskCardProps {
  task: Task
  changes?: boolean
}

const getStatusBgColor = (status: Task["status"]) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100"
    case "in_progress":
      return "bg-blue-100"
    case "completed":
      return "bg-green-100"
    case "blocked":
      return "bg-red-100"
    case "changes":
      return "bg-purple-100"
    default:
      return "bg-gray-100"
  }
}

const getCategoryColor = (category: string) => {
  const normalizedCategory = category.toUpperCase()
  switch (normalizedCategory) {
    case "ELECTRICIDAD":
      return "bg-blue-500"
    case "PLOMERÍA":
    case "PLOMERIA":
      return "bg-orange-500"
    case "CONSTRUCCIÓN":
    case "CONSTRUCCION":
      return "bg-gray-500"
    case "PINTURA":
      return "bg-pink-500"
    default:
      return "bg-purple-500"
  }
}

const TaskCard: React.FC<TaskCardProps> = ({ task, changes }) => {
  const handleClick = () => {
    console.log(`Clicked task ${task.id}`, changes ? "changes" : "tasks")
  }

  return (
    <div
      className={`${getStatusBgColor(task.status)} rounded-2xl p-5 w-72 h-40 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-gray-800 font-semibold text-lg mb-2 line-clamp-1">{task.title}</h3>
          <p className="text-gray-600 text-sm leading-5 line-clamp-2">{task.description}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex">
            {task.assignedMembers && task.assignedMembers.length > 0 && (
              <span className="text-gray-500 text-xs">{task.assignedMembers.length} miembro(s)</span>
            )}
          </div>

          <div className={`${getCategoryColor(task.category)} px-3 py-1 rounded-full`}>
            <span className="text-white text-xs font-medium">{task.category}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard

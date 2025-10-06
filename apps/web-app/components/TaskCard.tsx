"use client"

import React from "react"
import { Edit2 } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "blocked" | "changes"
  category: string
  assignedMembers?: string[]
}

interface TaskCardProps {
  task: Task
  changes?: boolean
  onEdit?: (task: Task) => void
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

const TaskCard: React.FC<TaskCardProps> = ({ task, changes, onEdit }) => {
  const handleClick = () => {
    console.log(`Clicked task ${task.id}`, changes ? "changes" : "tasks")
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que se dispare el click del card
    if (onEdit) {
      onEdit(task)
    }
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
          <div className="flex items-center gap-2">
            {task.assignedMembers && task.assignedMembers.length > 0 && (
              <span className="text-gray-500 text-xs">{task.assignedMembers.length} miembro(s)</span>
            )}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-1 rounded-md hover:bg-white/50 transition-colors opacity-70 hover:opacity-100"
                title="Editar tarea"
              >
                <Edit2 className="w-3 h-3 text-gray-600" />
              </button>
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

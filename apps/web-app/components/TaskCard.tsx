"use client"

import React, { useEffect, useRef, useState } from "react"
import { Edit2 } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "blocked" | "changes" | "rejected"
  category: string
  assignedMembers?: string[]
  start_date?: string | null
  end_date?: string | null
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
      return "bg-orange-100"
    case "rejected":
      return "bg-red-100"
    case "changes":
      return "bg-purple-100"
    default:
      return "bg-gray-100"
  }
}

const getCategoryColor = (category: string) => {
  if (!category) return "#999999";
  const c = category.toLowerCase();
  switch (c) {
    case "electricidad":
    case "electric":
      return "#007AFF"; // blue
    case "plomería":
    case "plomeria":
    case "plumbing":
      return "#FF9500"; // orange
    case "construcción":
    case "construccion":
    case "construction":
      return "#8A2BE2"; // purple
    case "pintura":
    case "paint":
      return "#FF2D92"; // pink
    default:
      return "#10B981"; // green-ish default to match calendar
  }
}

const TaskCard: React.FC<TaskCardProps> = ({ task, changes, onEdit }) => {
  const handleClick = () => {
    console.log(`Clicked task ${task.id}`, changes ? "changes" : "tasks")
  }

  const descRef = useRef<HTMLParagraphElement | null>(null);
  const [descOverflow, setDescOverflow] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = descRef.current;
      if (!el) return;
      setDescOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [task.description]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que se dispare el click del card
    if (onEdit) {
      onEdit(task)
    }
  }

  return (
    <div
      className={`${getStatusBgColor(task.status)} rounded-2xl p-5 w-72 h-40 flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow relative`}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-gray-800 font-semibold text-lg mb-2 line-clamp-1">{task.title}</h3>
          <p ref={descRef} className="text-gray-600 text-sm leading-5 line-clamp-2">{task.description}</p>
          {/* Date/time info */}
          {(task.start_date || task.end_date) && !descOverflow && (
            <div className="text-xs text-gray-500 mt-2">
              {task.start_date && (
                <div>Inicio: {new Date(task.start_date).toLocaleString()}</div>
              )}
              {task.end_date && (
                <div>Fin: {new Date(task.end_date).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            {task.assignedMembers && task.assignedMembers.length > 0 && (
              <span className="text-gray-500 text-xs">{task.assignedMembers.length} miembro(s)</span>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(e); }}
                className="p-1 rounded-md hover:bg-white/50 transition-colors opacity-70 hover:opacity-100 absolute left-3 bottom-3"
                title="Editar tarea"
                aria-label="Editar tarea"
              >
                <Edit2 className="w-3 h-3 text-gray-600" />
              </button>
            )}
          </div>

          <div style={{ backgroundColor: getCategoryColor(task.category) }} className="px-3 py-1 rounded-full absolute bottom-3 right-3">
            <span className="text-white text-xs font-medium">{task.category}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard

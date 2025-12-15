"use client"

import React, { useEffect, useRef, useState } from "react"
import { Edit2, Users } from "lucide-react"
import { useAssignedTo } from "@/hooks/useAssignedTo"

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
  onAssignWorkers?: (task: Task) => void
  showEditButton?: boolean
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

const TaskCard: React.FC<TaskCardProps> = ({ task, changes, onEdit, onAssignWorkers, showEditButton = false }) => {
  const { getWorkersByTask } = useAssignedTo();
  const [assignedCount, setAssignedCount] = useState(0);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  const descRef = useRef<HTMLParagraphElement | null>(null);
  const [descOverflow, setDescOverflow] = useState(false);

  // Cargar el número de workers asignados
  useEffect(() => {
    const loadAssignedWorkers = async () => {
      try {
        setLoadingWorkers(true);
        const workers = await getWorkersByTask(task.id);
        setAssignedCount(workers.length);
      } catch (error) {
        console.error("Error loading assigned workers:", error);
        setAssignedCount(0);
      } finally {
        setLoadingWorkers(false);
      }
    };

    loadAssignedWorkers();
  }, [task.id, getWorkersByTask]);

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

  const handleClick = () => {
    // Al hacer click en la tarjeta, abrir el modal de detalle/edición
    if (onEdit) {
      onEdit(task)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(task)
    }
  }

  const handleAssignWorkers = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAssignWorkers) {
      onAssignWorkers(task)
    }
  }

  return (
    <div
      className={`${getStatusBgColor(task.status)} rounded-2xl p-5 w-72 min-h-[200px] flex-shrink-0 cursor-pointer hover:shadow-lg transition-shadow relative`}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1 mb-12">
          <h3 className="text-gray-800 font-semibold text-lg mb-2 line-clamp-1">{task.title}</h3>
          <p ref={descRef} className="text-gray-600 text-sm leading-5 line-clamp-2 mb-2">{task.description}</p>
          
          {/* Date/time info */}
          {(task.start_date || task.end_date) && !descOverflow && (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              {task.start_date && (
                <div>Inicio: {new Date(task.start_date).toLocaleString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              )}
              {task.end_date && (
                <div>Fin: {new Date(task.end_date).toLocaleString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              )}
            </div>
          )}

          {/* Assigned Workers Badge */}
          {!loadingWorkers && assignedCount > 0 && !changes && (
            <div className="mt-2 inline-flex items-center bg-blue-500/20 px-2 py-1 rounded-full">
              <Users className="w-3 h-3 text-blue-600 mr-1" />
              <span className="text-xs font-medium text-blue-600">
                {assignedCount} trabajador{assignedCount !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex gap-1">
            {showEditButton && onEdit && (
              <button
                onClick={handleEdit}
                className="p-2 rounded-md hover:bg-white/50 transition-colors opacity-70 hover:opacity-100"
                title="Editar"
                aria-label="Editar"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
            
            {onAssignWorkers && !changes && (
              <button
                onClick={handleAssignWorkers}
                className="p-2 rounded-md hover:bg-white/50 transition-colors opacity-70 hover:opacity-100"
                title={assignedCount > 0 ? "Reasignar trabajadores" : "Asignar trabajadores"}
                aria-label={assignedCount > 0 ? "Reasignar trabajadores" : "Asignar trabajadores"}
              >
                <Users className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Category Badge */}
          <div 
            style={{ backgroundColor: getCategoryColor(task.category) }} 
            className="px-3 py-1 rounded-full"
          >
            <span className="text-white text-xs font-medium">{task.category}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard
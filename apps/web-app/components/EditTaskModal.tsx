"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "blocked" | "changes"
  category: string
  start_date?: string | null | undefined
  end_date?: string | null | undefined
  assignedMembers?: string[]
}

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onSave: (id: string, updatedTask: Partial<Task>) => Promise<void>
  canEdit?: boolean
  isChange?: boolean
  showApproveReject?: boolean
  onApproveChange?: (id: string) => Promise<void>
  onRejectChange?: (id: string) => Promise<void>
}

const categories = [
  { value: "electricidad", label: "ELECTRICIDAD" },
  { value: "pintura", label: "PINTURA" },
  { value: "plomeria", label: "PLOMERIA" },
  { value: "construccion", label: "CONSTRUCCION" },
]

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  canEdit = true,
  isChange = false,
  showApproveReject = false,
  onApproveChange,
  onRejectChange,
}) => {
  const [editedTask, setEditedTask] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending" as Task["status"],
    start_date: "",
    end_date: "",
  })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Actualizar el formulario cuando cambie la tarea
  useEffect(() => {
    if (task) {
      const normalizedCategory = task.category?.toLowerCase() || ""

      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        category: normalizedCategory,
        status: task.status || "pending",
        start_date: task.start_date || "",
        end_date: task.end_date || "",
      })
      setSelectedMembers(task.assignedMembers || [])
    }
  }, [task])

  const handleSave = async () => {
    if (!canEdit || !task || !editedTask.title || !editedTask.category) return

    setIsSaving(true)
    try {
      const startIso = editedTask.start_date
        ? new Date(editedTask.start_date).toISOString()
        : undefined
      const endIso = editedTask.end_date
        ? new Date(editedTask.end_date).toISOString()
        : undefined

      await onSave(task.id, {
        ...editedTask,
        start_date: startIso,
        end_date: endIso,
        assignedMembers: selectedMembers,
      })
      onClose()
    } catch (error) {
      console.error("Error al guardar la tarea:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!task || !onApproveChange) return
    setIsSaving(true)
    try {
      await onApproveChange(task.id)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = async () => {
    if (!task || !onRejectChange) return
    setIsSaving(true)
    try {
      await onRejectChange(task.id)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDateTimeForInput = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const pad = (n: number) => n.toString().padStart(2, "0")
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const min = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  if (!task) return null

  const fieldsDisabled = !canEdit
  const statusDisabled = fieldsDisabled || isChange

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl">
            {isChange ? "Solicitud de cambio" : "Tarea"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Título */}
          <Input
            placeholder="Título de la tarea"
            value={editedTask.title}
            disabled={fieldsDisabled}
            onChange={(e) =>
              setEditedTask({ ...editedTask, title: e.target.value })
            }
          />

          {/* Descripción */}
          <Textarea
            placeholder="Descripción detallada de la tarea"
            value={editedTask.description}
            disabled={fieldsDisabled}
            onChange={(e) =>
              setEditedTask({ ...editedTask, description: e.target.value })
            }
            rows={3}
          />

          {/* Categoría */}
          <Select
            value={editedTask.category}
            disabled={fieldsDisabled}
            onValueChange={(value) =>
              setEditedTask({ ...editedTask, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Estado */}
          <Select
            value={editedTask.status}
            disabled={statusDisabled}
            onValueChange={(value) =>
              setEditedTask({ ...editedTask, status: value as Task["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado de la tarea" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="blocked">Bloqueada</SelectItem>
              <SelectItem value="changes">Cambios</SelectItem>
            </SelectContent>
          </Select>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                Fecha y hora de inicio
              </label>
              <Input
                type="datetime-local"
                value={formatDateTimeForInput(editedTask.start_date)}
                disabled={fieldsDisabled}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, start_date: e.target.value })
                }
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                Fecha y hora de fin
              </label>
              <Input
                type="datetime-local"
                value={formatDateTimeForInput(editedTask.end_date)}
                disabled={fieldsDisabled}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, end_date: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cerrar
            </Button>
            {canEdit && (
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!editedTask.title || !editedTask.category || isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            )}
            {showApproveReject && (
              <div className="flex flex-1 flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSaving || !onRejectChange}
                  className="flex-1"
                >
                  Rechazar
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isSaving || !onApproveChange}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Aceptar
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditTaskModal

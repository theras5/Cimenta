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
  start_date?: string
  end_date?: string
  assignedMembers?: string[]
}

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onSave: (id: string, updatedTask: Partial<Task>) => Promise<void>
}

const teamMembers = [
  "Ana García",
  "Carlos López",
  "María Rodríguez",
  "Juan Pérez",
  "Sofia Martinez",
  "Diego Fernández",
  "Lucía González",
  "Roberto Silva"
]

const categories = [
  { value: "electricidad", label: "ELECTRICIDAD" },
  { value: "pintura", label: "PINTURA" },
  { value: "plomeria", label: "PLOMERÍA" },
  { value: "construccion", label: "CONSTRUCCIÓN" }
]

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
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
      // Normalizar la categoría a minúsculas para que coincida con las opciones del select
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
    if (!task || !editedTask.title || !editedTask.category) return

    setIsSaving(true)
    try {
      await onSave(task.id, {
        ...editedTask,
        assignedMembers: selectedMembers
      })
      onClose()
    } catch (error) {
      console.error("Error al guardar la tarea:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== member))
    } else {
      setSelectedMembers([...selectedMembers, member])
    }
  }

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Editar Tarea
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Título */}
          <Input
            placeholder="Título de la tarea"
            value={editedTask.title}
            onChange={(e) =>
              setEditedTask({ ...editedTask, title: e.target.value })
            }
          />

          {/* Descripción */}
          <Textarea
            placeholder="Descripción detallada de la tarea"
            value={editedTask.description}
            onChange={(e) =>
              setEditedTask({ ...editedTask, description: e.target.value })
            }
            rows={3}
          />

          {/* Categoría */}
          <Select
            value={editedTask.category}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Fecha de inicio
              </label>
              <Input
                type="date"
                value={formatDateForInput(editedTask.start_date)}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Fecha de fin
              </label>
              <Input
                type="date"
                value={formatDateForInput(editedTask.end_date)}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, end_date: e.target.value })
                }
              />
            </div>
          </div>

          
          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!editedTask.title || !editedTask.category || isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditTaskModal
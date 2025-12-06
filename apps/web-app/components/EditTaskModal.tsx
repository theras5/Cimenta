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
  status: "pending" | "in_progress" | "completed" | "blocked" | "changes" | "rejected"
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
  onRejectChange?: (id: string, reason?: string) => Promise<void>
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
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [persistedRejectReason, setPersistedRejectReason] = useState<string | null>(null)

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
    // Load persisted rejection reason from localStorage
    const loadReason = () => {
      if (!task) return
      try {
        const val = localStorage.getItem(`rejectionReason:${task.id}`)
        if (val) setPersistedRejectReason(val)
      } catch (e) {
        console.error("Error loading rejection reason", e)
      }
    }
    loadReason()
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

  // Open reject modal to capture reason
  const handleReject = async () => {
    if (!task || !onRejectChange) return
    setRejectReason("")
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!task || !onRejectChange) return
    if (!rejectReason.trim()) {
      // simple client-side validation
      return
    }
    setShowRejectModal(false)
    setIsSaving(true)
    try {
      await onRejectChange(task.id, rejectReason.trim())
      try {
        localStorage.setItem(`rejectionReason:${task.id}`, rejectReason.trim())
        setPersistedRejectReason(rejectReason.trim())
      } catch (e) {
        console.error('Error saving rejection reason to localStorage', e)
      }
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

          {/* Mostrar razón del rechazo si existe y la tarea está rechazada */}
          {task.status === "rejected" && persistedRejectReason ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Razón del rechazo</div>
              <div className="text-sm text-gray-800">{persistedRejectReason}</div>
            </div>
          ) : null}

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

      {/* Modal para capturar la razón de rechazo */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Rechazar cambio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escribe la razón del rechazo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason("")
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmReject}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!rejectReason.trim() || isSaving}
              >
                {isSaving ? "Rechazando..." : "Rechazar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export default EditTaskModal

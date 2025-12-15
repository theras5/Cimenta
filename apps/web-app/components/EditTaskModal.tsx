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
import { useAssignedTo } from "@/hooks/useAssignedTo"
import { useWorkers } from "@/hooks/useWorkers"
import { Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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
  isAdmin?: boolean
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
  isAdmin = false,
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
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>([])
  const [selectedWorkersForEdit, setSelectedWorkersForEdit] = useState<string[]>([])
  
  const { getWorkersByTask, assignMultipleWorkersToTask } = useAssignedTo()
  const { workers } = useWorkers()

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

  // Cargar trabajadores asignados
  useEffect(() => {
    const loadAssignedWorkers = async () => {
      if (!task?.id || isChange) return
      
      try {
        const assigned = await getWorkersByTask(task.id)
        const workerIds = assigned.map(a => a.worker_id)
        setAssignedWorkerIds(workerIds)
        setSelectedWorkersForEdit(workerIds)
      } catch (error) {
        // Silenciar errores de red - no crítico para la funcionalidad principal
        setAssignedWorkerIds([])
        setSelectedWorkersForEdit([])
      }
    }
    
    loadAssignedWorkers()
  }, [task?.id, isChange, getWorkersByTask])

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
      
      // Si es admin y no es cambio, actualizar trabajadores asignados
      if (isAdmin && !isChange) {
        await assignMultipleWorkersToTask(task.id, selectedWorkersForEdit)
      }
      
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

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkersForEdit(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
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
            {task.title || (isChange ? "Solicitud de cambio" : "Tarea")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Título {!fieldsDisabled && <span className="text-red-500">*</span>}
            </label>
            <Input
              placeholder="Título de la tarea"
              value={editedTask.title}
              readOnly={fieldsDisabled}
              onChange={(e) =>
                setEditedTask({ ...editedTask, title: e.target.value })
              }
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Descripción
            </label>
            <Textarea
              placeholder="Descripción detallada de la tarea"
              value={editedTask.description}
              readOnly={fieldsDisabled}
              onChange={(e) =>
                setEditedTask({ ...editedTask, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Mostrar razón del rechazo si existe y la tarea está rechazada */}
          {task.status === "rejected" && persistedRejectReason ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Razón del rechazo</div>
              <div className="text-sm text-gray-800">{persistedRejectReason}</div>
            </div>
          ) : null}

          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Categoría {!fieldsDisabled && <span className="text-red-500">*</span>}
            </label>
            {fieldsDisabled ? (
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black">
                {categories.find(c => c.value === editedTask.category)?.label || editedTask.category}
              </div>
            ) : (
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
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Estado
            </label>
            {statusDisabled ? (
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black">
                {editedTask.status === "pending" && "Pendiente"}
                {editedTask.status === "in_progress" && "En progreso"}
                {editedTask.status === "completed" && "Completada"}
                {editedTask.status === "blocked" && "Bloqueada"}
                {editedTask.status === "changes" && "Cambios"}
                {editedTask.status === "rejected" && "Rechazado"}
              </div>
            ) : (
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
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                Fecha y hora de inicio
              </label>
              <Input
                type="datetime-local"
                value={formatDateTimeForInput(editedTask.start_date)}
                readOnly={fieldsDisabled}
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
                readOnly={fieldsDisabled}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, end_date: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>

          {/* Trabajadores asignados - solo para tareas */}
          {!isChange && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Trabajadores asignados ({isAdmin ? selectedWorkersForEdit.length : assignedWorkerIds.length})
              </label>
              {isAdmin ? (
                // Vista editable para admin
                workers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-2">
                    No tienes trabajadores registrados.{' '}
                    <a href="/profile/empleados" className="text-blue-600 hover:underline">
                      Agregar trabajadores
                    </a>
                  </p>
                ) : (
                  <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.worker_id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => toggleWorkerSelection(worker.worker_id)}
                      >
                        <Checkbox
                          checked={selectedWorkersForEdit.includes(worker.worker_id)}
                          onCheckedChange={() => toggleWorkerSelection(worker.worker_id)}
                        />
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full text-blue-600 font-bold text-sm">
                          {worker.worker_name.charAt(0)}{worker.worker_surname?.charAt(0) || ''}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {worker.worker_name} {worker.worker_surname || ''}
                          </p>
                          <p className="text-xs text-gray-500">{worker.profession}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Vista solo lectura para clientes
                assignedWorkerIds.length > 0 ? (
                  <div className="space-y-2">
                    {workers
                      .filter(w => assignedWorkerIds.includes(w.worker_id))
                      .map((worker) => (
                        <div
                          key={worker.worker_id}
                          className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full text-blue-600 font-bold text-sm mr-3">
                            {worker.worker_name.charAt(0)}{worker.worker_surname?.charAt(0) || ''}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {worker.worker_name} {worker.worker_surname || ''}
                            </p>
                            <p className="text-xs text-gray-500">{worker.profession}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Users className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No hay trabajadores asignados</p>
                  </div>
                )
              )}
            </div>
          )}

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

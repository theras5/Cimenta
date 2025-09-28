"use client"

import { useState } from "react"
import { Plus, Clipboard, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TaskSection from "./TaskSection"

// Mock data for tasks
const mockTasks = [
  {
    id: 1,
    title: "Instalación eléctrica",
    description: "Completar la instalación eléctrica del segundo piso",
    status: "pending" as const,
    category: "ELECTRICIDAD",
    categoryColor: "bg-blue-500",
    assignedMembers: ["Juan", "Pedro"],
  },
  {
    id: 2,
    title: "Pintura de paredes",
    description: "Aplicar pintura base en todas las paredes del comedor",
    status: "in_progress" as const,
    category: "PINTURA",
    categoryColor: "bg-pink-500",
    assignedMembers: ["María"],
  },
  {
    id: 3,
    title: "Revisión de plomería",
    description: "Verificar todas las conexiones de agua",
    status: "completed" as const,
    category: "PLOMERÍA",
    categoryColor: "bg-orange-500",
    assignedMembers: ["Carlos", "Ana"],
  },
  {
    id: 4,
    title: "Cambio de diseño cocina",
    description: "Modificar el diseño original de la cocina según nuevas especificaciones",
    status: "changes" as const,
    category: "CONSTRUCCIÓN",
    categoryColor: "bg-gray-500",
    assignedMembers: ["Luis"],
  },
]

const TasksScreen = () => {
  const [tasks] = useState(mockTasks)
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const handleCreateTask = () => {
    setShowModal(false)
    console.log("Create new task")
  }

  const handleCreateChange = () => {
    setShowModal(false)
    console.log("Create new change")
  }

  // Group tasks by status
  const changes = tasks.filter((task) => task.status === "changes")
  const pendingTasks = tasks.filter((task) => task.status === "pending")
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress")
  const completedTasks = tasks.filter((task) => task.status === "completed")
  // const blockedTasks = tasks.filter((task) => task.status === "blocked")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Tareas</h1>
        <Button
          onClick={() => setShowModal(true)}
          size="icon"
          className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg w-34 h-10"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">¿Qué quieres crear?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={handleCreateTask}
              className="w-full justify-start h-auto p-4 bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200"
              variant="outline"
            >
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-full mr-4">
                  <span className="text-white text-lg">✓</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">Tarea</div>
                  <div className="text-sm text-gray-600">Crear una nueva tarea para realizar</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleCreateChange}
              className="w-full justify-start h-auto p-4 bg-orange-50 hover:bg-orange-100 text-gray-800 border border-orange-200"
              variant="outline"
            >
              <div className="flex items-center">
                <div className="bg-orange-500 p-3 rounded-full mr-4">
                  <span className="text-white text-lg">⟷</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">Cambio</div>
                  <div className="text-sm text-gray-600">Solicitar un cambio en el proyecto</div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="pt-25 px-6 py-4 pb-20">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No hay tareas aún</h3>
            <p className="text-gray-400 text-center px-6">Crea tu primera tarea usando el botón +</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Changes */}
            {changes.length > 0 && <TaskSection title="Cambios" tasks={changes} changes={true} />}

            {/* Pending */}
            {pendingTasks.length > 0 && <TaskSection title="Pendientes" tasks={pendingTasks} />}

            {/* In Progress */}
            {inProgressTasks.length > 0 && <TaskSection title="En progreso" tasks={inProgressTasks} />}

            {/* Blocked */}
            {/* {blockedTasks.length > 0 && <TaskSection title="Bloqueado" tasks={blockedTasks} />} */}

            {/* Completed */}
            {completedTasks.length > 0 && <TaskSection title="Completadas" tasks={completedTasks} />}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={handleRefresh}
          size="icon"
          variant="outline"
          className="w-12 h-12 rounded-full bg-white shadow-lg"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  )
}

export default TasksScreen

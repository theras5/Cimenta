"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2 } from "lucide-react"
import Sidebar from "@/components/sidebar"

interface Task {
  id: number
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "changes"
  category: string
  categoryColor: string
  assignedMembers: string[]
}

const categoryColors = {
  ELECTRICIDAD: "bg-blue-500",
  PINTURA: "bg-pink-500",
  PLOMERÍA: "bg-orange-500",
  CONSTRUCCIÓN: "bg-gray-500",
  ALBAÑILERÍA: "bg-yellow-500",
  CARPINTERÍA: "bg-brown-500",
}

const teamMembers = [
  "Juan", "Pedro", "María", "Carlos", "Ana", "Luis", 
  "Sofia", "Miguel", "Carmen", "Roberto", "Elena"
]

export default function NewTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending" as Task["status"],
  })

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter(m => m !== member))
    } else {
      setSelectedMembers([...selectedMembers, member])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación
    if (!newTask.title || !newTask.description || !newTask.category || selectedMembers.length === 0) {
      setError("Por favor completa todos los campos y selecciona al menos un miembro del equipo")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      // Aquí integrarás con tu backend más adelante
      const task: Task = {
        id: Math.floor(Math.random() * 10000), // Temporal
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        category: newTask.category,
        categoryColor: categoryColors[newTask.category as keyof typeof categoryColors] || "bg-gray-500",
        assignedMembers: selectedMembers,
      }

      // Simular llamada al backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirigir a la página de tareas
      router.push("/tasks")
    } catch (error: any) {
      setError(error.message || "Error al crear la tarea")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Nueva Tarea</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Crear Nueva Tarea</CardTitle>
                <CardDescription>
                  Completa los detalles para crear una nueva tarea del proyecto
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Título */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Título de la tarea *
                    </label>
                    <Input
                      placeholder="Ej: Instalación eléctrica del segundo piso"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción detallada *
                    </label>
                    <Textarea
                      placeholder="Describe los detalles específicos de la tarea..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={4}
                      disabled={loading}
                    />
                  </div>

                  {/* Categoría y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Categoría *
                      </label>
                      <Select
                        value={newTask.category}
                        onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ELECTRICIDAD">ELECTRICIDAD</SelectItem>
                          <SelectItem value="PINTURA">PINTURA</SelectItem>
                          <SelectItem value="PLOMERÍA">PLOMERÍA</SelectItem>
                          <SelectItem value="CONSTRUCCIÓN">CONSTRUCCIÓN</SelectItem>
                          <SelectItem value="ALBAÑILERÍA">ALBAÑILERÍA</SelectItem>
                          <SelectItem value="CARPINTERÍA">CARPINTERÍA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Estado inicial
                      </label>
                      <Select
                        value={newTask.status}
                        onValueChange={(value) => setNewTask({ ...newTask, status: value as Task["status"] })}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Estado inicial" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">En progreso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Miembros del equipo */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Asignar miembros del equipo * ({selectedMembers.length} seleccionados)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member}
                          className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-all ${
                            selectedMembers.includes(member)
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-white hover:bg-gray-100 border border-gray-200'
                          } ${loading ? 'pointer-events-none opacity-50' : ''}`}
                          onClick={() => !loading && toggleMember(member)}
                        >
                          {member}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/tasks")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!newTask.title || !newTask.description || !newTask.category || selectedMembers.length === 0 || loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Tarea"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
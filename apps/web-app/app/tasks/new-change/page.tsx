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

export default function NewChangePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [newChange, setNewChange] = useState({
    title: "",
    description: "",
    category: "",
    reason: "",
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
    if (!newChange.title || !newChange.description || !newChange.category || !newChange.reason || selectedMembers.length === 0) {
      setError("Por favor completa todos los campos y selecciona al menos un responsable")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      // Aquí integrarás con tu backend más adelante
      const changeRequest: Task = {
        id: Math.floor(Math.random() * 10000), // Temporal
        title: newChange.title,
        description: `${newChange.description}\n\nRazón del cambio: ${newChange.reason}`,
        status: "changes",
        category: newChange.category,
        categoryColor: categoryColors[newChange.category as keyof typeof categoryColors] || "bg-gray-500",
        assignedMembers: selectedMembers,
      }

      // Simular llamada al backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirigir a la página de tareas
      router.push("/tasks")
    } catch (error: any) {
      setError(error.message || "Error al crear la solicitud de cambio")
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
            <h1 className="text-2xl font-bold text-gray-800">Solicitar Cambio</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-xl text-orange-800">Solicitud de Cambio</CardTitle>
                <CardDescription className="text-orange-700">
                  Completa los detalles para solicitar un cambio en el proyecto
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
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
                      Título del cambio *
                    </label>
                    <Input
                      placeholder="Ej: Modificación del diseño de la cocina"
                      value={newChange.title}
                      onChange={(e) => setNewChange({ ...newChange, title: e.target.value })}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción del cambio propuesto *
                    </label>
                    <Textarea
                      placeholder="Describe detalladamente el cambio que necesitas realizar..."
                      value={newChange.description}
                      onChange={(e) => setNewChange({ ...newChange, description: e.target.value })}
                      rows={4}
                      disabled={loading}
                    />
                  </div>

                  {/* Razón del cambio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Razón o justificación del cambio *
                    </label>
                    <Textarea
                      placeholder="Explica por qué es necesario este cambio..."
                      value={newChange.reason}
                      onChange={(e) => setNewChange({ ...newChange, reason: e.target.value })}
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  {/* Categoría */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Categoría afectada *
                    </label>
                    <Select
                      value={newChange.category}
                      onValueChange={(value) => setNewChange({ ...newChange, category: value })}
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

                  {/* Responsables del cambio */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Responsables del cambio * ({selectedMembers.length} seleccionados)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member}
                          className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-all ${
                            selectedMembers.includes(member)
                              ? 'bg-orange-500 text-white shadow-md'
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
                      disabled={!newChange.title || !newChange.description || !newChange.reason || !newChange.category || selectedMembers.length === 0 || loading}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Solicitud de Cambio"
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
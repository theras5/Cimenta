"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { User, Wrench, Users, Building, LogOut, ChevronRight } from "lucide-react"
import Sidebar from "@/components/sidebar"

const profileMenuItems = [
  {
    icon: User,
    title: "Mi cuenta",
    description: "Información personal y configuración",
    href: "/perfil/cuenta",
  },
  {
    icon: Wrench,
    title: "Mis obras",
    description: "Proyectos y construcciones activas",
    href: "/perfil/obras",
  },
  {
    icon: Users,
    title: "Mis empleados",
    description: "Gestión de equipo y colaboradores",
    href: "/perfil/empleados",
  },
  {
    icon: Building,
    title: "Mis clientes",
    description: "Cartera de clientes y contactos",
    href: "/perfil/clientes",
  },
]

export default function PerfilPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Perfil</h1>

            <div className="flex flex-col items-center">
              <Avatar className="w-32 h-32 mb-6">
                <AvatarImage src="/construction-worker-with-hard-hat-and-safety-vest.jpg" alt="Martín" />
                <AvatarFallback className="text-4xl font-bold bg-blue-100 text-blue-600">M</AvatarFallback>
              </Avatar>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">Martín</h2>
              <p className="text-gray-600">Ingeniero Civil</p>
            </div>
          </div>

          {/* Profile Menu */}
          <div className="space-y-4 mb-8">
            {profileMenuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-400" size={20} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Logout Button */}
          <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-red-600">Cerrar sesión</h3>
                  <p className="text-sm text-gray-600">Salir de tu cuenta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

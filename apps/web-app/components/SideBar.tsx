"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Home,
  CheckSquare,
  ShoppingCart,
  User,
  TrendingUp,
  Calendar,
  BookOpen,
  BarChart3,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useSites } from "@/hooks/useSites"
import { useAuth } from "@/hooks/useAuth"

const navigationItems = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/tasks", icon: CheckSquare, label: "Tareas" },
  { href: "/purchases", icon: ShoppingCart, label: "Compras" },
  { href: "/summary", icon: BarChart3, label: "Resumen" },
  { href: "/updates", icon: TrendingUp, label: "Avances" },
  { href: "/calendar", icon: Calendar, label: "Calendario" },
  { href: "/guide", icon: BookOpen, label: "Guía" },
  { href: "/profile", icon: User, label: "Perfil" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { sites, loadUserSites } = useSites()
  
  // Estado local para el sitio seleccionado
  const [selectedSiteId, setSelectedSiteId] = useState<string>("")
  
  // Cargar sitios y sitio seleccionado solo en el cliente
  useEffect(() => {
    // Cargar el sitio seleccionado de localStorage
    const storedSiteId = localStorage.getItem("selectedSiteId") || ""
    setSelectedSiteId(storedSiteId)
    
    // Cargar los sitios si tenemos un usuario
    if (user?.id) {
      loadUserSites(user.id)
    }
  }, [user?.id, loadUserSites])

  // Escuchar cambios en la ruta para recargar sitios Y actualizar el selector
  useEffect(() => {
    // Cuando la ruta cambia, recargar los sitios
    if (user?.id) {
      loadUserSites(user.id)
    }
    
    // Actualizar el sitio seleccionado desde localStorage cuando cambia la ruta
    const storedSiteId = localStorage.getItem("selectedSiteId") || ""
    setSelectedSiteId(storedSiteId)
  }, [pathname, user?.id, loadUserSites])

  // Manejar cambio de sitio
  const handleChangeSite = (siteId: string) => {
    if (siteId === "change") {
      // Redirigir a la pantalla de selección de obras
      router.push("/select-site")
      return
    }
    
    localStorage.setItem("selectedSiteId", siteId)
    setSelectedSiteId(siteId)
    
    // Usar router.refresh en lugar de window.location.reload
    // para una experiencia más fluida
    router.refresh()
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-20 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <Link href="/dashboard">
          <h1 className="text-3xl font-bold text-blue-600">Cimenta</h1>
        </Link>
        {/* Menú desplegable para cambiar de site */}
        <div className="mt-4">
          <Select value={selectedSiteId} onValueChange={handleChangeSite}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar obra" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>
                  {site.address}
                </SelectItem>
              ))}
              <SelectItem value="change">
                <span className="text-blue-600">Cambiar de obra</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  );
}
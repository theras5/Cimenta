"use client"
import { HomeIcon, CheckSquareIcon, TrendingUpIcon, CalendarIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: "inicio" | "tareas" | "avances" | "calendario" | "perfil"
  onTabChange: (tab: "inicio" | "tareas" | "avances" | "calendario" | "perfil") => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    {
      id: "inicio" as const,
      label: "Inicio",
      icon: HomeIcon,
    },
    {
      id: "tareas" as const,
      label: "Tareas",
      icon: CheckSquareIcon,
    },
    {
      id: "avances" as const,
      label: "Avances",
      icon: TrendingUpIcon,
    },
    {
      id: "calendario" as const,
      label: "Calendario",
      icon: CalendarIcon,
    },
    {
      id: "perfil" as const,
      label: "Perfil",
      icon: UserIcon,
    },
  ]

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-20 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-3xl font-bold text-blue-600">Cimenta</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

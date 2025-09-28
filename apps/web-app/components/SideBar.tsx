"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

const navigationItems = [
  { href: "/", icon: Home, label: "Inicio" },
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

  return (
    <div className="w-64 min-w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <Link href="/">
          <h1 className="text-2xl font-bold text-blue-600">Cimenta</h1>
        </Link>
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

      {/* User Avatar */}
      <div className="p-4">
        <Avatar className="w-10 h-10 bg-gray-800">
          <AvatarFallback className="text-white font-medium">N</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
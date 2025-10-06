"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Menu, 
  X, 
  Home, 
  CheckSquare, 
  Settings, 
  User, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  BookOpen,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const navigationItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/tasks", icon: CheckSquare, label: "Tareas" },
    { href: "/purchases", icon: ShoppingCart, label: "Compras" },
    { href: "/summary", icon: BarChart3, label: "Resumen" },
    { href: "/updates", icon: TrendingUp, label: "Avances" },
    { href: "/calendar", icon: Calendar, label: "Calendario" },
    { href: "/guide", icon: BookOpen, label: "Guía" },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Cimenta
                </h1>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <div className="ml-10 flex items-baseline space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="flex items-center space-x-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Desktop Right Menu */}
          <div className="hidden lg:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-2">
              <Button variant="ghost" size="icon" title="Configuración">
                <Settings className="w-4 h-4" />
              </Button>
              <Link href="/perfil">
                <Button 
                  variant={isActive("/perfil") ? "default" : "ghost"} 
                  size="icon"
                  title="Perfil"
                >
                  <User className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-expanded="false">
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full justify-start space-x-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            
            <div className="border-t border-gray-200 pt-2 mt-2">
              <Button variant="ghost" className="w-full justify-start space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </Button>
              <Link href="/perfil">
                <Button 
                  variant={isActive("/perfil") ? "default" : "ghost"} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full justify-start space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
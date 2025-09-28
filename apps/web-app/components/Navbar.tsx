"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Home, CheckSquare, Settings, User } from "lucide-react"

interface NavbarProps {
  activeTab: "avances" | "tasks"
  onTabChange: (tab: "avances" | "tasks") => void
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Cimenta</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Button
                variant={activeTab === "avances" ? "default" : "ghost"}
                onClick={() => onTabChange("avances")}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Avances</span>
              </Button>
              <Button
                variant={activeTab === "tasks" ? "default" : "ghost"}
                onClick={() => onTabChange("tasks")}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tareas</span>
              </Button>
            </div>
          </div>

          {/* Desktop Right Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-2">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-expanded="false">
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <Button
              variant={activeTab === "avances" ? "default" : "ghost"}
              onClick={() => {
                onTabChange("avances")
                setIsMobileMenuOpen(false)
              }}
              className="w-full justify-start space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Avances</span>
            </Button>
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              onClick={() => {
                onTabChange("tasks")
                setIsMobileMenuOpen(false)
              }}
              className="w-full justify-start space-x-2"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tareas</span>
            </Button>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <Button variant="ghost" className="w-full justify-start space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start space-x-2">
                <User className="w-4 h-4" />
                <span>Perfil</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

"use client"

import { useState } from "react"
import AvancesScreen from "../components/AvancesScreen"
import TasksScreen from "../components/TasksScreen"
import Sidebar from "../components/SideBar"
import WelcomeScreen from "../components/WelcomeScreen"

export default function Page() {
  const [activeTab, setActiveTab] = useState<"inicio" | "tareas" | "avances" | "calendario" | "perfil">("inicio")

  const renderContent = () => {
    switch (activeTab) {
      case "inicio":
        return <WelcomeScreen />
      case "tareas":
        return <TasksScreen />
      case "avances":
        return <AvancesScreen />
      case "calendario":
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Calendario</h1>
            <p className="text-gray-600">Próximamente...</p>
          </div>
        )
      case "perfil":
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Perfil</h1>
            <p className="text-gray-600">Configuración de perfil próximamente...</p>
          </div>
        )
      default:
        return <WelcomeScreen />
    }
  }

  return (
    <div className="ml-64 min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  )
}

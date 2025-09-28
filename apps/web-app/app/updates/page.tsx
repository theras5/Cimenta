"use client"

import { useState } from "react"
import { Plus, RefreshCw, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import VideoCard from "@/components/VideoCard"
import NotificationCard from "@/components/NotificationCard"
import NoMediaCard from "@/components/NoMediaCard"
import Sidebar from "@/components/sidebar"

const AvancesScreen = () => {
  const [refreshing, setRefreshing] = useState(false)
  const [updates, setUpdates] = useState([
    {
      id: 1,
      title: "Remodelacion en el comedor",
      description: "Avance en la remodelación del comedor principal",
      author: "Juan Doe",
      timeAgo: "Hace 1 día",
      hasVideo: true,
    },
    {
      id: 2,
      title: "Remodelacion en el comedor",
      description: "Continuación del proyecto de remodelación",
      author: "Juan Doe",
      timeAgo: "Hace 1 día",
      hasVideo: true,
    },
    {
      id: 3,
      title: "Remodelacion en el comedor",
      description: "Finalización de la primera fase",
      author: "Juan Doe",
      timeAgo: "Hace 1 día",
      hasVideo: false,
    },
  ])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const handleAddUpdate = () => {
    console.log("Add new update")
  }

  const handleNoMediaPress = (id: number) => {
    console.log(`Pressed update with id: ${id}`)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Avances</h1>
          <Button
            onClick={handleAddUpdate}
            className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6 h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Avance
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4 pb-20">
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No hay avances aún</h3>
              <p className="text-gray-400 text-center px-6">Crea tu primer avance usando el botón +</p>
            </div>
          ) : (
            <>
              {/* First video card */}
              <VideoCard
                title={updates[0].title}
                author={updates[0].author}
                timeAgo={updates[0].timeAgo}
                hasPlayButton={updates[0].hasVideo}
                onPress={() => handleNoMediaPress(updates[0].id)}
              />

              {/* Notification card */}
              <NotificationCard message="Se ha terminado" highlight="Instalación del aire" />

              {/* Remaining cards */}
              {updates
                .slice(1)
                .map((update) =>
                  update.hasVideo ? (
                    <VideoCard
                      key={update.id}
                      title={update.title}
                      author={update.author}
                      timeAgo={update.timeAgo}
                      hasPlayButton={update.hasVideo}
                      onPress={() => handleNoMediaPress(update.id)}
                    />
                  ) : (
                    <NoMediaCard
                      key={update.id}
                      title={update.title}
                      description={update.description}
                      author={update.author}
                      timeAgo={update.timeAgo}
                      onPress={() => handleNoMediaPress(update.id)}
                    />
                  ),
                )}
            </>
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
      </main>
    </div>
  )
}

export default AvancesScreen
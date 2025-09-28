"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react"
import Sidebar from "@/components/sidebar"

interface CalendarEvent {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  date: string
  type: "meeting" | "task" | "deadline" | "inspection"
  attendees: string[]
}

const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Carlos Gomez",
    description: "Reunión de seguimiento del proyecto",
    startTime: "09:00",
    endTime: "11:00",
    date: "2025-09-20",
    type: "meeting",
    attendees: ["Carlos Gomez"],
  },
  {
    id: "2",
    title: "Juan Doe",
    description: "Inspección de avances de construcción",
    startTime: "11:00",
    endTime: "13:00",
    date: "2025-09-20",
    type: "inspection",
    attendees: ["Juan Doe"],
  },
  {
    id: "3",
    title: "Carlos Gomez",
    description: "Revisión de materiales",
    startTime: "18:00",
    endTime: "20:00",
    date: "2025-09-20",
    type: "task",
    attendees: ["Carlos Gomez"],
  },
  {
    id: "4",
    title: "Juan Doe",
    description: "Entrega de documentación",
    startTime: "17:00",
    endTime: "19:00",
    date: "2025-09-20",
    type: "deadline",
    attendees: ["Juan Doe"],
  },
  // More events for busy view
  {
    id: "5",
    title: "Pepe Grillo",
    description: "Supervisión de obra",
    startTime: "10:00",
    endTime: "12:00",
    date: "2025-09-21",
    type: "inspection",
    attendees: ["Pepe Grillo"],
  },
  {
    id: "6",
    title: "Ariel Sarat",
    description: "Reunión con proveedores",
    startTime: "14:00",
    endTime: "16:00",
    date: "2025-09-21",
    type: "meeting",
    attendees: ["Ariel Sarat"],
  },
  {
    id: "7",
    title: "Luca Briosca",
    description: "Instalación eléctrica",
    startTime: "16:00",
    endTime: "18:00",
    date: "2025-09-21",
    type: "task",
    attendees: ["Luca Briosca"],
  },
]

const eventTypeColors = {
  meeting: "bg-orange-500",
  task: "bg-green-500",
  deadline: "bg-blue-500",
  inspection: "bg-purple-500",
}

const eventTypeBadgeColors = {
  meeting: "bg-orange-100 text-orange-800",
  task: "bg-green-100 text-green-800",
  deadline: "bg-blue-100 text-blue-800",
  inspection: "bg-purple-100 text-purple-800",
}

const attendeeColors = ["bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500"]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 20)) // September 20, 2025
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    date: "",
    type: "meeting" as CalendarEvent["type"],
    attendees: [""],
  })

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const dayNames = ["L", "M", "M", "J", "V", "S", "D"]

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const getEventsForDate = (date: string) => {
    return events.filter((event) => event.date === date)
  }

  const handleAddEvent = () => {
    if (newEvent.title && newEvent.startTime && newEvent.endTime && newEvent.date) {
      const event: CalendarEvent = {
        id: Date.now().toString(),
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        date: newEvent.date,
        type: newEvent.type,
        attendees: newEvent.attendees.filter((a) => a.trim() !== ""),
      }
      setEvents([...events, event])
      setNewEvent({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        date: "",
        type: "meeting",
        attendees: [""],
      })
      setIsDialogOpen(false)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = formatDate(date)
      const dayEvents = getEventsForDate(dateString)
      const isToday = dateString === formatDate(new Date())

      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 ${isToday ? "bg-blue-50" : "bg-white"}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-900"}`}>{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event, index) => {
              const attendeeIndex =
                event.attendees.length > 0 ? Math.abs(event.attendees[0].charCodeAt(0)) % attendeeColors.length : 0
              return (
                <div
                  key={event.id}
                  className={`text-xs px-1 py-0.5 rounded text-white truncate ${attendeeColors[attendeeIndex]}`}
                  title={`${event.title} (${event.startTime} - ${event.endTime})`}
                >
                  {event.title}
                </div>
              )
            })}
            {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2} más</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  const renderTimeSlots = () => {
    const slots = []
    const selectedDate = formatDate(currentDate)
    const dayEvents = getEventsForDate(selectedDate)

    for (let hour = 8; hour <= 19; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`
      const hourEvents = dayEvents.filter((event) => {
        const eventStart = Number.parseInt(event.startTime.split(":")[0])
        const eventEnd = Number.parseInt(event.endTime.split(":")[0])
        return hour >= eventStart && hour < eventEnd
      })

      slots.push(
        <div key={hour} className="flex border-b border-gray-100">
          <div className="w-16 py-4 text-sm text-gray-500 text-right pr-4">{timeString}</div>
          <div className="flex-1 py-2 px-4 relative">
            {hourEvents.map((event, index) => {
              const attendeeIndex =
                event.attendees.length > 0 ? Math.abs(event.attendees[0].charCodeAt(0)) % attendeeColors.length : 0
              return (
                <div
                  key={event.id}
                  className={`absolute left-4 right-4 p-2 rounded text-white text-sm ${attendeeColors[attendeeIndex]}`}
                  style={{
                    top: `${index * 4}px`,
                    zIndex: index + 1,
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-xs opacity-90">
                    {event.startTime} - {event.endTime}
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
      )
    }

    return slots
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft size={20} />
              </Button>
              <h2 className="text-xl font-semibold text-gray-700 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus size={20} className="mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título del evento"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
                <Textarea
                  placeholder="Descripción"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="time"
                    placeholder="Hora inicio"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  />
                  <Input
                    type="time"
                    placeholder="Hora fin"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  />
                </div>
                <Select
                  value={newEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="task">Tarea</SelectItem>
                    <SelectItem value="deadline">Fecha límite</SelectItem>
                    <SelectItem value="inspection">Inspección</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Asistentes (separados por coma)"
                  value={newEvent.attendees.join(", ")}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, attendees: e.target.value.split(",").map((a) => a.trim()) })
                  }
                />
                <Button onClick={handleAddEvent} className="w-full">
                  Crear Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {dayNames.map((day, index) => (
                    <div
                      key={index}
                      className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">{renderCalendarGrid()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Day View */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  {currentDate.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="max-h-96 overflow-y-auto">{renderTimeSlots()}</div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Leyenda</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-sm">Carlos Gomez</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm">Juan Doe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-sm">Pepe Grillo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-sm">Ariel Sarat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-500 rounded"></div>
                    <span className="text-sm">Luca Briosca</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

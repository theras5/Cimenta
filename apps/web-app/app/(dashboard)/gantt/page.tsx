"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import Sidebar from "@/components/SideBar";
import { useTasks } from "@/hooks/useTasks";

interface GanttTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
}

export default function GanttPage() {
  const router = useRouter();
  const { tasks, loading, fetchTasks } = useTasks();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setSelectedSiteId(siteId);
      fetchTasks(siteId);
    }
  }, [fetchTasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      // Convertir tareas a formato Gantt
      const converted = tasks
        .filter(task => task.created_at) // Solo tareas con fecha
        .map((task, index) => {
          const startDate = new Date(task.created_at);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7); // Duración estimada de 7 días

          // Calcular progreso basado en estado
          let progress = 0;
          switch (task.status) {
            case 'completed':
              progress = 100;
              break;
            case 'in_progress':
              progress = 50;
              break;
            case 'pending':
              progress = 0;
              break;
            default:
              progress = 0;
          }

          // Color basado en categoría
          const colors: Record<string, string> = {
            electricidad: '#f59e0b',
            plomeria: '#3b82f6',
            construccion: '#10b981',
            pintura: '#8b5cf6',
          };

          return {
            id: task.id,
            title: task.title,
            start: startDate,
            end: endDate,
            progress,
            color: colors[task.category] || '#6b7280',
          };
        });

      setGanttTasks(converted);
    }
  }, [tasks]);

  // Calcular el rango de fechas
  const getDateRange = () => {
    if (ganttTasks.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = ganttTasks.flatMap(t => [t.start, t.end]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { start: minDate, end: maxDate };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) || 30;

  // Generar array de fechas para el header
  const generateDates = () => {
    const dates = [];
    const current = new Date(rangeStart);
    for (let i = 0; i <= totalDays; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = generateDates();

  // Calcular posición de la barra
  const getBarPosition = (task: GanttTask) => {
    const taskStart = Math.max(0, Math.ceil((task.start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
    const taskDuration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (taskStart / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header fijo */}
        <div className="fixed top-0 left-64 right-0 z-40 px-6 py-4 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Diagrama de Gantt</h1>
              <p className="text-sm text-gray-600">
                Visualiza el cronograma de tareas del proyecto
              </p>
            </div>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto pt-32 px-6 pb-6">

          {/* Gantt Chart */}
          {ganttTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay tareas para mostrar
                </h3>
                <p className="text-gray-600">
                  Crea tareas en tu proyecto para visualizar el cronograma
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Cronograma de Tareas</span>
                  <span className="text-sm font-normal text-gray-600">
                    {ganttTasks.length} {ganttTasks.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Timeline Header */}
                    <div className="flex border-b border-gray-200 mb-4">
                      <div className="w-64 flex-shrink-0 font-semibold text-sm text-gray-700 p-3">
                        Tarea
                      </div>
                      <div className="flex-1 relative">
                        <div className="flex">
                          {dates.map((date, idx) => (
                            <div
                              key={idx}
                              className="flex-1 text-center text-xs text-gray-600 p-2 border-l border-gray-200"
                            >
                              <div>{date.getDate()}</div>
                              <div className="text-gray-400">
                                {date.toLocaleDateString('es', { month: 'short' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tasks */}
                    {ganttTasks.map((task) => {
                      const position = getBarPosition(task);
                      return (
                        <div key={task.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50">
                          {/* Task Name */}
                          <div className="w-64 flex-shrink-0 p-3">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {task.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {task.progress}% completado
                            </div>
                          </div>

                          {/* Gantt Bar */}
                          <div className="flex-1 relative h-12">
                            <div
                              className="absolute top-2 h-8 rounded-md transition-all hover:opacity-80"
                              style={{
                                left: position.left,
                                width: position.width,
                                backgroundColor: task.color,
                              }}
                            >
                              <div
                                className="h-full bg-white/30 rounded-md"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leyenda */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Categorías</h4>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-amber-500" />
                      <span className="text-sm text-gray-600">Electricidad</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500" />
                      <span className="text-sm text-gray-600">Plomería</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span className="text-sm text-gray-600">Construcción</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-500" />
                      <span className="text-sm text-gray-600">Pintura</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  RefreshCw,
  Package,
  ListTodo,
} from "lucide-react";
import Sidebar from "@/components/SideBar";

interface ISiteSummary {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  categoriesBreakdown: {
    [category: string]: {
      count: number;
      percentage: number;
    };
  };
  purchasedMaterials: number;
  totalPurchases: number;
  purchasedPercentage: number;
  totalSpent: number;
}

interface Task {
  id: string;
  status: string;
  category: string;
  [key: string]: any;
}

interface Purchase {
  id: string;
  status: 'pending' | 'purchased' | 'delivered';
  price?: number;
  [key: string]: any;
}

const categoryColors: { [key: string]: string } = {
  pintura: "#FF2D92",
  plomeria: "#FF9500",
  electricidad: "#007AFF",
  construccion: "#8A2BE2",
  default: "#10B981",
};

const getCategoryColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase().trim();
  return categoryColors[normalizedCategory] || categoryColors.default;
};

export default function SummaryPage() {
  const [summary, setSummary] = useState<ISiteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener siteId del localStorage
      const siteId = localStorage.getItem("selectedSiteId");
      const siteAddress = localStorage.getItem("selectedSiteAddress");

      if (!siteId) {
        setError("No se ha seleccionado una obra");
        setLoading(false);
        return;
      }

      setSiteName(siteAddress || "Obra");

      // Obtener todas las tareas de la obra
      const tasksResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/site/${siteId}`
      );
      if (!tasksResponse.ok) throw new Error("Error al obtener tareas");
      const tasks = await tasksResponse.json();

      // Calcular estadísticas de tareas
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t: Task) => t.status === "completed"
      ).length;
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calcular breakdown por categorías
      const categoriesBreakdown: {
        [key: string]: { count: number; percentage: number };
      } = {};
      tasks.forEach((task: Task) => {
        const category = task.category || "Sin categoría";
        if (!categoriesBreakdown[category]) {
          categoriesBreakdown[category] = { count: 0, percentage: 0 };
        }
        categoriesBreakdown[category].count++;
      });

      // Calcular porcentajes
      Object.keys(categoriesBreakdown).forEach((category) => {
        categoriesBreakdown[category].percentage =
          totalTasks > 0
            ? Math.round(
                (categoriesBreakdown[category].count / totalTasks) * 100
              )
            : 0;
      });

      // Obtener compras de la obra
      const purchasesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/purchases/site/${siteId}`
      );
      if (!purchasesResponse.ok) throw new Error("Error al obtener compras");
      const purchases = await purchasesResponse.json();

      const totalPurchases = purchases.length;
      const purchasedMaterials = purchases.filter(
        (p: Purchase) => p.status === "purchased" || p.status === "delivered"
      ).length;
      const purchasedPercentage =
        totalPurchases > 0
          ? Math.round((purchasedMaterials / totalPurchases) * 100)
          : 0;

      // Calcular dinero gastado (solo compras purchased o delivered)
      const totalSpent = purchases
        .filter((p: Purchase) => p.status === "purchased" || p.status === "delivered")
        .reduce((sum: number, p: Purchase) => sum + (p.price || 0), 0);

      setSummary({
        totalTasks,
        completedTasks,
        completionPercentage,
        categoriesBreakdown,
        purchasedMaterials,
        totalPurchases,
        purchasedPercentage,
        totalSpent,
      });
    } catch (error) {
      console.error("Error al cargar resumen:", error);
      setError("No se pudo cargar el resumen de la obra");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="text-gray-600">Cargando resumen...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-gray-600 mb-4">
                {error || "No se pudo cargar el resumen"}
              </p>
              <Button onClick={loadSummary}>Reintentar</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Resumen de Obra
              </h1>
              <p className="text-gray-600 mt-1">{siteName}</p>
            </div>
            <Button onClick={loadSummary} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Resumen General de Tareas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Tareas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Círculo de progreso */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-48 h-48 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Fondo del círculo */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    />
                    {/* Progreso del círculo */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={
                        summary.completionPercentage >= 75
                          ? "#10B981"
                          : summary.completionPercentage >= 50
                          ? "#F59E0B"
                          : summary.completionPercentage >= 25
                          ? "#EF4444"
                          : "#9CA3AF"
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${summary.completionPercentage * 2.51} 251`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {summary.completionPercentage}%
                    </span>
                    <span className="text-sm text-gray-500">Completado</span>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalTasks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.completedTasks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.totalTasks - summary.completedTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorías de Tareas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Categorías de Tareas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(summary.categoriesBreakdown).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(summary.categoriesBreakdown)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([category, data]) => (
                      <div key={category}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{
                                backgroundColor: getCategoryColor(category),
                              }}
                            />
                            <span className="font-medium text-gray-700 capitalize">
                              {category}
                            </span>
                          </div>
                          <span className="text-gray-600">
                            {data.count} ({data.percentage}%)
                          </span>
                        </div>
                        <Progress
                          value={data.percentage}
                          className="h-2"
                          style={
                            {
                              "--progress-background":
                                getCategoryColor(category),
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  No hay tareas registradas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Materiales Comprados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Materiales Comprados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barra de progreso */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Comprados</span>
                  <span className="text-gray-600">
                    {summary.purchasedMaterials} de {summary.totalPurchases}
                  </span>
                </div>
                <Progress value={summary.purchasedPercentage} className="h-4" />
                <p className="text-center text-2xl font-bold text-gray-900 mt-4">
                  {summary.purchasedPercentage}%
                </p>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Total Solicitudes
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {summary.totalPurchases}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Comprados</p>
                  <p className="text-xl font-bold text-blue-600">
                    {summary.purchasedMaterials}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pendientes</p>
                  <p className="text-xl font-bold text-orange-600">
                    {summary.totalPurchases - summary.purchasedMaterials}
                  </p>
                </div>
              </div>

              {/* Dinero gastado */}
              <div className="mt-6 pt-6 border-t">
                <div className="bg-green-50 rounded-lg p-6">
                  <p className="text-gray-600 text-sm mb-2 text-center">
                    Dinero Gastado
                  </p>
                  <p className="text-green-700 font-bold text-3xl text-center">
                    ${summary.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-gray-500 text-xs text-center mt-1">
                    ARS (Pesos Argentinos)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

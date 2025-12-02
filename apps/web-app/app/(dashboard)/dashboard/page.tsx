"use client";

import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  LayoutGridIcon,
  CheckSquareIcon,
  RefreshCcwIcon,
  ShoppingCartIcon,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/SideBar";
import { useState, useEffect } from "react";
import { useTasks } from "@/hooks/useTasks";
import { usePurchases } from "@/hooks/usePurchases";
import { useUserRole } from "@/hooks/useUserRole";

export default function CimentaDashboard() {
  const router = useRouter();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const { tasks, fetchTasks } = useTasks();
  const { purchases, fetchPurchases } = usePurchases();
  const { role, loading: roleLoading } = useUserRole();
  const normalizedRole = role?.toLowerCase();

  // Load selected site and fetch data
  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setSelectedSiteId(siteId);
      fetchTasks(siteId);
      fetchPurchases(siteId);
    }
  }, [fetchTasks, fetchPurchases]);

  // Listen for site changes and refresh data
  useEffect(() => {
    const handleSiteChange = () => {
      const newSiteId = localStorage.getItem("selectedSiteId");
      if (newSiteId && newSiteId !== selectedSiteId) {
        setSelectedSiteId(newSiteId);
        fetchTasks(newSiteId);
        fetchPurchases(newSiteId);
      }
    };

    // Listen for storage events (when localStorage changes)
    window.addEventListener("storage", handleSiteChange);
    
    // Also check periodically for changes within the same tab
    const intervalId = setInterval(handleSiteChange, 500);

    return () => {
      window.removeEventListener("storage", handleSiteChange);
      clearInterval(intervalId);
    };
  }, [selectedSiteId, fetchTasks, fetchPurchases]);

  // Calculate stats based on real data
  const activeTasks = tasks.filter(
    (task) => task.status !== "completed"
  ).length;
  
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "pending"
  ).length;

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          {/* Hero Section - Más compacto */}
          <div className="mb-6 mt-20">
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Bienvenido a <span className="text-blue-600">Cimenta</span>
                </h1>
                <p className="text-md text-gray-600 mb-4 leading-relaxed">
                  La plataforma de gestión de proyectos que impulsa la
                  productividad de tu equipo. Organiza tareas, colabora
                  eficientemente y alcanza tus objetivos.
                </p>
                {/* <div className="flex gap-4 justify-center lg:justify-start">
                  <Button
                    onClick={() => router.push("/tasks/new-task")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Crear Primera Tarea
                  </Button>
                  <Button
                    onClick={() => router.push("/tasks")}
                    variant="outline"
                  >
                    <LayoutGridIcon className="w-4 h-4 mr-2" />
                    Ver Tableros
                  </Button>
                </div> */}
              </div>
              <div className="relative flex justify-center">
                <div className="rounded-2xl p-4 relative overflow-hidden">
                  <Image
                    height={280}
                    width={280}
                    src="/7.1.png"
                    alt="TaskFlow Dashboard"
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tableros Section - Alineado a la izquierda */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Tableros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seguimiento de tareas */}
              <Link href="/tasks" className="group">
                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-200 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/50 rounded-full -translate-y-8 translate-x-8"></div>
                  <div className="relative p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-2.5 bg-green-500 rounded-lg shadow-md">
                        <CheckSquareIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Seguimiento de tareas
                    </h3>
                    <p className="text-md text-green-600 font-medium">
                      {activeTasks} {activeTasks === 1 ? "tarea activa" : "tareas activas"}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Seguimiento de compra */}
              <Link href="/purchases" className="group">
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 hover:border-orange-300 transition-all duration-200 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100/50 rounded-full -translate-y-8 translate-x-8"></div>
                  <div className="relative p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-2.5 bg-orange-500 rounded-lg shadow-md">
                        <ShoppingCartIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Seguimiento de compra
                    </h3>
                    <p className="text-md text-orange-600 font-medium">
                      {pendingPurchases} {pendingPurchases === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Atajos Section - Alineado a la izquierda */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Atajos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Crear tarea (solo admin) */}
              {!roleLoading && normalizedRole === "admin" && (
                <button
                  onClick={() => router.push("/tasks/new-task")}
                  className="group flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <CheckSquareIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-md font-semibold text-gray-900 text-center mb-1">
                    Crear tarea
                  </h3>
                  <p className="text-xs text-gray-500 text-center">
                    Agregar nueva tarea al proyecto
                  </p>
                </button>
              )}

              {/* Crear solicitud de cambio (solo client) */}
              {!roleLoading && normalizedRole === "client" && (
                <button
                  onClick={() => router.push("/tasks/new-change")}
                  className="group flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                    <RefreshCcwIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-md font-semibold text-gray-900 text-center mb-1">
                    Crear solicitud de cambio
                  </h3>
                  <p className="text-xs text-gray-500 text-center">
                    Proponer modificaciones al proyecto
                  </p>
                </button>
              )}

              {/* Crear solicitud de compra (siempre visible) */}
              <button
                onClick={() => router.push("/purchases/new-purchase")}
                className="group flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                  <ShoppingCartIcon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-md font-semibold text-gray-900 text-center mb-1">
                  Crear solicitud de compra
                </h3>
                <p className="text-xs text-gray-500 text-center">
                  Solicitar materiales o equipos
                </p>
              </button>

              {/* Ver resumen de obra (solo client) */}
              {!roleLoading && normalizedRole === "client" && selectedSiteId && (
                <button
                  onClick={() => router.push("/summary")}
                  className="group flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-md font-semibold text-gray-900 text-center mb-1">
                    Resumen de obra
                  </h3>
                  <p className="text-xs text-gray-500 text-center">
                    Ver estadísticas y progreso
                  </p>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

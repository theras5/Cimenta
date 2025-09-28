"use client";

import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  LayoutGridIcon,
  CheckSquareIcon,
  TrendingUpIcon,
} from "lucide-react";
import Image from "next/image";

export default function WelcomeScreen() {
  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Bienvenido a <span className="text-blue-600">Cimenta</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              La plataforma de gestión de proyectos que impulsa la productividad
              de tu equipo. Organiza tareas, colabora eficientemente y alcanza
              tus objetivos.
            </p>
            <div className="flex gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <PlusIcon className="w-4 h-4 mr-2" />
                Crear Primera Tarea
              </Button>
              <Button variant="outline">
                <LayoutGridIcon className="w-4 h-4 mr-2" />
                Ver Tableros
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gray-100 rounded-2xl p-8 shadow-lg relative w-full h-full overflow-hidden">
              <Image
                height={400}
                width={400}
                src="/7.1.png"
                alt="TaskFlow Dashboard"
                className="object-cover"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tableros Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Tableros</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckSquareIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Seguimiento de tareas
                </h3>
                <p className="text-sm text-gray-500">Abierto hace 2 días</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <LayoutGridIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Seguimiento de compras
                </h3>
                <p className="text-sm text-gray-500">Abierto hace 2 días</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Avances del proyecto
                </h3>
                <p className="text-sm text-gray-500">Actualizado hoy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

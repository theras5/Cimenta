"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, CheckCircle2, ShoppingCart, Camera, FileText } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function LandingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Simple and clean */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-bold text-2xl" style={{ color: "#0066FF" }}>
            Cimenta
          </span>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="text-gray-600 font-medium">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild className="rounded-lg font-medium" style={{ backgroundColor: "#0066FF", color: "white" }}>
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero - Clean and simple with mascot */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-black mb-6">
            Bienvenido a <span style={{ color: "#0066FF" }}>Cimenta</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl">
            La plataforma de gestión de proyectos que impulsa la productividad de tu equipo. Organiza tareas, colabora
            eficientemente y alcanza tus objetivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <Button asChild size="lg" className="rounded-lg font-medium" style={{ backgroundColor: "#0066FF", color: "white" }}>
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section - Replica the dashboard cards */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Todo lo que necesitas para controlar tu obra</h2>
            <p className="text-lg text-gray-600">
              Funcionalidades diseñadas específicamente para equipos de construcción.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tasks Card - Blue pastel */}
            <Card
              className="p-8 border-2 rounded-3xl"
              style={{
                backgroundColor: "#EFF6FF",
                borderColor: "#BFDBFE",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: "#0066FF", color: "white" }}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Tablero de tareas por obra</h3>
              <p className="text-gray-700">Asigna, prioriza y dale seguimiento a cada actividad con estados claros.</p>
            </Card>

            {/* Purchases Card - Green pastel */}
            <Card
              className="p-8 border-2 rounded-3xl"
              style={{
                backgroundColor: "#F0FDF4",
                borderColor: "#BBF7D0",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: "#16A34A", color: "white" }}
                >
                  <ShoppingCart className="w-7 h-7" />
                </div>
                
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Compras y proveedores</h3>
              <p className="text-gray-700">Registra pedidos, adjunta facturas y compara precios desde un solo lugar.</p>
            </Card>

            {/* Progress Card - Yellow pastel */}
            <Card
              className="p-8 border-2 rounded-3xl"
              style={{
                backgroundColor: "#FFFBEB",
                borderColor: "#FCD34D",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: "#F59E0B", color: "white" }}
                >
                  <Camera className="w-7 h-7" />
                </div>
                
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Avances con fotos y notas</h3>
              <p className="text-gray-700">Documenta el progreso con evidencia visual y comentarios contextuales.</p>
            </Card>

            {/* Reports Card - Purple pastel */}
            <Card
              className="p-8 border-2 rounded-3xl"
              style={{
                backgroundColor: "#F3E8FF",
                borderColor: "#E9D5FF",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: "#9333EA", color: "white" }}
                >
                  <FileText className="w-7 h-7" />
                </div>
                
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Resumen PDF automático</h3>
              <p className="text-gray-700">
                Genera reportes listos para cliente con un clic. Profesionales y completos.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing - One paid plan only */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-black text-center mb-12">Plan simple y transparente</h2>

        <div className="max-w-2xl mx-auto">
          <Card className="p-10 rounded-2xl border-2" style={{ borderColor: "#BFDBFE", backgroundColor: "#F0F7FF" }}>
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-black mb-2">Acceso completo</h3>
              <p className="text-gray-600">Todas las funcionalidades para gestionar tus obras - Plan de pago</p>
              <p className="text-3xl font-bold text-black mt-4">
                $99<span className="text-lg text-gray-600">/mes</span>
              </p>
            </div>

            <Button asChild
              size="lg"
              className="w-full mb-8 rounded-lg font-medium"
              style={{ backgroundColor: "#0066FF", color: "white" }}
            >
              <Link href="/register">Registrarse</Link>
            </Button>

            <ul className="space-y-4">
              {[
                "Proyectos ilimitados",
                "Gestión de tareas y obras",
                "Control de compras y proveedores",
                "Registro de avances con fotos",
                "Generación de reportes PDF",
                "Soporte por email",
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: "#0066FF" }} />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="py-20" style={{ backgroundColor: "#0066FF" }}>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
            ¿Listo para transformar tu gestión de proyectos?
          </h2>
          <p className="text-lg mb-8 text-blue-100 leading-relaxed">
            Únete a cientos de equipos que confían en Cimenta para gestionar sus obras.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-lg font-medium bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/register">Registrarse ahora</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Simplified footer matching the design */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <span className="font-bold text-xl" style={{ color: "#0066FF" }}>
              Cimenta
            </span>

            <nav className="flex gap-8 text-gray-600 text-sm">
              <a href="#" className="hover:text-black transition">
                Términos
              </a>
              <a href="#" className="hover:text-black transition">
                Privacidad
              </a>
              <a href="#" className="hover:text-black transition">
                Contacto
              </a>
            </nav>

            <p className="text-gray-500 text-sm">© 2025 Cimenta. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

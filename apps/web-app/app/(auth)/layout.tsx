// apps/web-app/app/(auth)/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Cimenta - Autenticación",
  description: "Inicia sesión o regístrate en Cimenta",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Cargando...</div>}>
        {children}
      </Suspense>
    </div>
  );
}
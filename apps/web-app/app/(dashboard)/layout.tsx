// apps/web-app/app/(dashboard)/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import Sidebar from "@/components/SideBar";
import PaywallGuard from "@/components/PaywallGuard";

export const metadata: Metadata = {
  title: "Dashboard - Cimenta",
  description: "Panel de control de Cimenta",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PaywallGuard>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        {/* Contenido con margen izquierdo para compensar el sidebar */}
        <main className="ml-64 min-h-screen overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </PaywallGuard>
  );
}
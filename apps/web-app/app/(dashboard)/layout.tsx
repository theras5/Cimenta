import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";

import "../globals.css";
import Sidebar from "@/components/SideBar";

export const metadata: Metadata = {
  title: "Cimenta - Gestión de Proyectos",
  description:
    "Plataforma de gestión de proyectos que impulsa la productividad",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Sidebar/>
        <main className="ml-64 min-h-screen">
          <Suspense fallback={<div className="p-6">Cargando…</div>}>
            {children}
          </Suspense>
        </main>
        <Analytics />
      </body>
    </html>
  );
}

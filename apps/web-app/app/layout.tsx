import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Sidebar from '@/components/SideBar'

export const metadata: Metadata = {
  title: 'Cimenta',
  description: 'La plataforma de gestión de proyectos que impulsa la productividad de tu equipo. Organiza tareas, colabora eficientemente y alcanza tus objetivos.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Sidebar/>
        <main className="ml-64 min-h-screen">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
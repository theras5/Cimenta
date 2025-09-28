"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, CheckSquareIcon, TrendingUpIcon, CalendarIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab?: "inicio" | "tareas" | "avances" | "calendario" | "perfil";
  onTabChange?: (tab: "inicio" | "tareas" | "avances" | "calendario" | "perfil") => void;
}

const TAB_HREFS: Record<NonNullable<SidebarProps["activeTab"]>, string> = {
  inicio: "/dashboard",
  tareas: "/tasks",
  avances: "/updates",
  calendario: "/calendar",
  perfil: "/profile",
};

export default function Sidebar({ activeTab: activeTabProp, onTabChange }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const menuItems = [
    { id: "inicio" as const, label: "Inicio", icon: HomeIcon },
    { id: "tareas" as const, label: "Tareas", icon: CheckSquareIcon },
    { id: "avances" as const, label: "Avances", icon: TrendingUpIcon },
    { id: "calendario" as const, label: "Calendario", icon: CalendarIcon },
    { id: "perfil" as const, label: "Perfil", icon: UserIcon },
  ];

  const hrefToTab = (path: string): SidebarProps["activeTab"] => {
    if (path.startsWith("/tasks")) return "tareas";
    if (path.startsWith("/updates")) return "avances";
    if (path.startsWith("/calendar")) return "calendario";
    if (path.startsWith("/profile")) return "perfil";
    return "inicio";
  };

  const activeTab = activeTabProp ?? hrefToTab(pathname);

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-20 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-blue-600">Cimenta</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const href = TAB_HREFS[item.id];

            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                    isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => onTabChange?.(item.id)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
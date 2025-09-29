"use client";

import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  LayoutGridIcon,
  CheckSquareIcon,
  RefreshCcwIcon,
  ShoppingCartIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/SideBar";
import { useEffect } from "react";

export default function CimentaDashboard() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // Opción A: token en localStorage (común en SPA)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        router.replace("/dashboard");
        return;
      }

      // Opción B: si tu auth usa cookies/sesión, descomenta y ajusta esta llamada
      // try {
      //   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/auth/me`, {
      //     credentials: "include",
      //     cache: "no-store",
      //   });
      //   if (res.ok) {
      //     router.replace("/dashboard");
      //     return;
      //   }
      // } catch (e) {
      //   // ignore and fallthrough to login
      // }

      router.replace("/login");
    };

    checkAuth();
  }, [router]);

  return <div className="min-h-screen flex items-center justify-center">Redirigiendo…</div>;
}

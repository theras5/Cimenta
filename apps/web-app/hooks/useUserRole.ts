import { useEffect, useState } from "react";

/**
 * Obtiene el rol del usuario para la obra seleccionada (client/admin).
 * Lee el usuario de localStorage ("user") y la obra ("selectedSiteId")
 * y llama al endpoint /user-role del backend.
 */
export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Escuchar cambios en localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSiteId = () => {
      const siteId = localStorage.getItem("selectedSiteId");
      setSelectedSiteId(siteId);
    };

    checkSiteId();

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedSiteId") {
        setSelectedSiteId(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Verificar cambios cada 500ms (para cambios en la misma pestaña)
    const interval = setInterval(checkSiteId, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);

        if (typeof window === "undefined") {
          setRole(null);
          return;
        }

        console.log("🔍 [useUserRole] Obteniendo rol del usuario...");

        const userString = localStorage.getItem("user");
        const siteId = selectedSiteId || localStorage.getItem("selectedSiteId");

        console.log("📋 [useUserRole] user:", userString ? "presente" : "ausente");
        console.log("🏗️ [useUserRole] selectedSiteId:", siteId);

        if (!userString || !siteId) {
          console.log("⚠️ [useUserRole] Falta user o siteId, rol = null");
          setRole(null);
          return;
        }

        const user = JSON.parse(userString);
        const userId = user?.id;

        if (!userId) {
          console.log("⚠️ [useUserRole] userId no encontrado en user");
          setRole(null);
          return;
        }

        console.log("👤 [useUserRole] userId:", userId);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const baseUrl = apiUrl && apiUrl.length > 0 ? apiUrl : null;
        
        // Normalizar la URL para evitar dobles barras
        let url: string;
        if (baseUrl) {
          const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          url = `${normalizedBase}/user-role?user_id=${userId}&site_id=${siteId}`;
        } else {
          url = `/api/user-role?user_id=${userId}&site_id=${siteId}`;
        }
        
        console.log("🌐 [useUserRole] Llamando a:", url);
        
        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("❌ [useUserRole] Error al obtener rol:", response.status, text);
          setRole(null);
          return;
        }

        const data = await response.json();
        console.log("✅ [useUserRole] Rol obtenido:", data.role);
        setRole(data.role ?? null);
      } catch (error) {
        console.error("💥 [useUserRole] Error:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [selectedSiteId]);

  return { role, loading };
}

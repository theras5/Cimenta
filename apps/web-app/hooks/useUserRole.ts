import { useEffect, useState } from "react";

/**
 * Obtiene el rol del usuario para la obra seleccionada (client/admin).
 * Lee el usuario de localStorage ("user") y la obra ("selectedSiteId")
 * y llama al endpoint /user-role del backend.
 */
export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);

        if (typeof window === "undefined") {
          setRole(null);
          return;
        }

        const userString = localStorage.getItem("user");
        const siteId = localStorage.getItem("selectedSiteId");

        if (!userString || !siteId) {
          setRole(null);
          return;
        }

        const user = JSON.parse(userString);
        const userId = user?.id;

        if (!userId) {
          setRole(null);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const baseUrl = apiUrl && apiUrl.length > 0 ? apiUrl : null;
        const url = baseUrl
          ? `${baseUrl}/user-role?user_id=${userId}&site_id=${siteId}`
          : `/api/user-role?user_id=${userId}&site_id=${siteId}`;
        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("Error al obtener rol del usuario", response.status, text);
          setRole(null);
          return;
        }

        const data = await response.json();
        setRole(data.role ?? null);
      } catch (error) {
        console.error("Error en useUserRole (web):", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { role, loading };
}

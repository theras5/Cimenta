"use client";

import { useState, useEffect, useCallback } from "react";

// Adaptar interfaz al modelo de backend
export interface Purchase {
  id: string;
  product: string;
  description: string;
  quantity: number;
  price: number;
  supplier: string;
  category: string;
  status: "pending" | "purchased" | "delivered";
  purchase_date?: string;
  delivery_date?: string;
  user_id?: string;
  site_id: string;
  created_at?: string;
  updated_at?: string;
  //   site?: {
  //     id: string;
  //     address: string;
  //   };
}

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Obtener el site seleccionado de localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const siteId = localStorage.getItem("selectedSiteId");
      setSelectedSiteId(siteId);
    }
  }, []);

  // Obtener todas las compras del sitio seleccionado
  const fetchPurchases = useCallback(
    async (siteId?: string | null) => {
      const useSiteId = siteId || selectedSiteId;

      if (!useSiteId) {
        setError("No hay sitio seleccionado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/purchases?site_id=${useSiteId}`);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setPurchases(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar las compras"
        );
        console.error("Error fetching purchases:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedSiteId]
  );

  // Crear una nueva compra
  const createPurchase = async (
    purchaseData: Omit<Purchase, "id" | "created_at" | "updated_at">
  ) => {
    // Asegurar que se incluya el siteId
    if (!purchaseData.site_id && selectedSiteId) {
      purchaseData.site_id = selectedSiteId;
    }

    if (!purchaseData.site_id) {
      throw new Error("No hay sitio seleccionado para crear la compra");
    }

    console.log(purchaseData);

    try {
      setError(null);
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const newPurchase = await response.json();
      setPurchases((prev) => [newPurchase, ...prev]);
      return newPurchase;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al crear la compra";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Actualizar una compra
  const updatePurchase = async (
    id: string,
    purchaseData: Partial<Purchase>
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const updatedPurchase = await response.json();
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? updatedPurchase : p))
      );
      return updatedPurchase;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar la compra";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Actualizar solo el estado de una compra
  const updatePurchaseStatus = async (
    id: string,
    status: Purchase["status"]
  ) => {
    try {
      setError(null);

      // Preparar datos a actualizar con fechas
      const updateData: Partial<Purchase> = { status };

      // Si cambia a purchased, añadir fecha de compra
      if (status === "purchased") {
        updateData.purchase_date = new Date().toISOString();
      }

      // Si cambia a delivered, añadir fecha de entrega
      if (status === "delivered") {
        updateData.delivery_date = new Date().toISOString();
      }

      const response = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const updatedPurchase = await response.json();

      // Actualizar el estado local
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? updatedPurchase : p))
      );

      return updatedPurchase;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar el estado";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Eliminar una compra
  const deletePurchase = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      setPurchases((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al eliminar la compra";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Cargar compras cuando cambie el siteId seleccionado
  useEffect(() => {
    if (selectedSiteId) {
      fetchPurchases(selectedSiteId);
    }
  }, [selectedSiteId, fetchPurchases]);

  const clearError = () => setError(null);

  return {
    purchases,
    loading,
    error,
    fetchPurchases,
    createPurchase,
    updatePurchase,
    updatePurchaseStatus,
    deletePurchase,
    clearError,
    selectedSiteId,
  };
}

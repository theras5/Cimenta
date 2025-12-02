"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Clipboard, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Sidebar from "@/components/SideBar";
import { usePurchases, Purchase } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";
import { PurchaseCard } from "@/components/PurchaseCard";

const categoryColors = {
  MATERIALES: "bg-gray-500",
  ELECTRICIDAD: "bg-blue-500",
  PINTURA: "bg-pink-500",
  PLOMERÍA: "bg-cyan-500",
  HERRAMIENTAS: "bg-purple-500",
};

// Adaptar modelo de backend al modelo de UI para mantener compatibilidad
const adaptPurchaseToUI = (purchase: Purchase) => {
  return {
    ...purchase,
    title: purchase.product,
    estimatedPrice: purchase.price,
    orderDate: purchase.purchase_date,
    deliveryDate: purchase.delivery_date,
    uiStatus: mapStatusToUI(purchase.status),
  };
};

// Mapear los estados del backend a estados de la UI
const mapStatusToUI = (
  status: Purchase["status"]
): "para-comprar" | "comprado" | "recibido" => {
  switch (status) {
    case "pending":
      return "para-comprar";
    case "purchased":
      return "comprado";
    case "delivered":
      return "recibido";
    default:
      return "para-comprar";
  }
};

// Mapear los estados de la UI a estados del backend
const mapStatusToBackend = (status: string): Purchase["status"] => {
  switch (status) {
    case "para-comprar":
      return "pending";
    case "comprado":
      return "purchased";
    case "recibido":
      return "delivered";
    default:
      return "pending";
  }
};

// Purchase Section Component with horizontal scroll
const PurchaseSection = ({
  title,
  purchases,
  onStatusChange,
  onEdit,
}: {
  title: string;
  purchases: Purchase[];
  onStatusChange: (
    purchaseId: string,
    newStatus: Purchase["status"]
  ) => Promise<void>;
  onEdit: (purchaseId: string, updatedPurchase: Partial<Purchase>) => Promise<void>;
}) => {
  if (purchases.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {title} ({purchases.length})
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {purchases.map((purchase) => (
          <PurchaseCard
            key={purchase.id}
            purchase={purchase}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
};

export default function ComprasPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const {
    purchases,
    loading,
    error,
    fetchPurchases,
    createPurchase,
    updatePurchase,
    updatePurchaseStatus,
  } = usePurchases();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    product: "",
    description: "",
    quantity: 1,
    price: 0,
    supplier: "",
    category: "",
    status: "pending" as Purchase["status"],
    site_id: "",
    user_id: "",
  });

  // Auto-refresh cuando cambia el parámetro refresh
  useEffect(() => {
    const refreshParam = searchParams.get("refresh");
    if (refreshParam && selectedSiteId) {
      fetchPurchases(selectedSiteId);
    }
  }, [searchParams, selectedSiteId, fetchPurchases]);

  // Cargar site_id y user_id al iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const siteId = localStorage.getItem("selectedSiteId");
      if (siteId) {
        setSelectedSiteId(siteId);
        setNewPurchase((prev) => ({ ...prev, site_id: siteId }));
      }
    }

    if (user?.id) {
      setNewPurchase((prev) => ({ ...prev, user_id: user.id }));
    }
  }, [user?.id]);

  useEffect(() => {
    const handleStorageChange = () => {
      const newSiteId = localStorage.getItem("selectedSiteId");
      if (newSiteId && newSiteId !== selectedSiteId) {
        console.log("Sitio cambiado a:", newSiteId);
        setSelectedSiteId(newSiteId);
        fetchPurchases(newSiteId); // Cargar compras del nuevo sitio
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // También verificar periódicamente por cambios (para cambios en la misma pestaña)
    const interval = setInterval(() => {
      const currentSiteId = localStorage.getItem("selectedSiteId");
      if (currentSiteId && currentSiteId !== selectedSiteId) {
        console.log("Sitio cambiado (interval check):", currentSiteId);
        setSelectedSiteId(currentSiteId);
        fetchPurchases(currentSiteId);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedSiteId, fetchPurchases]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPurchases(selectedSiteId);
    } catch (error) {
      console.error("Error refreshing purchases:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddPurchase = async () => {
    if (newPurchase.product && newPurchase.category) {
      try {
        await createPurchase({
          ...newPurchase,
          // Aseguramos que tenga site_id y user_id
          site_id:
            newPurchase.site_id || localStorage.getItem("selectedSiteId") || "",
          user_id: newPurchase.user_id || user?.id || "",
        });

        // Resetear el formulario
        setNewPurchase({
          product: "",
          description: "",
          quantity: 1,
          price: 0,
          supplier: "",
          category: "",
          status: "pending",
          site_id: localStorage.getItem("selectedSiteId") || "",
          user_id: user?.id || "",
        });

        setShowModal(false);
      } catch (error) {
        console.error("Error creating purchase:", error);
      }
    }
  };

  // Función para manejar el cambio de estado
const handleStatusChange = async (
  purchaseId: string, 
  newStatus: Purchase['status'], 
  updateData?: Partial<Purchase>
) => {
  try {
    await updatePurchaseStatus(purchaseId, newStatus, updateData);
  } catch (error) {
    console.error("Error al cambiar estado de compra:", error);
  }
};

  const handleEdit = async (purchaseId: string, updatedPurchase: Partial<Purchase>) => {
  try {
    await updatePurchase(purchaseId, updatedPurchase);
    // No necesitas hacer fetchPurchases porque el estado se actualiza en el hook
  } catch (error) {
    console.error("Error al editar compra:", error);
  }
};

  // Group purchases by status
  const paraComprar = purchases.filter((p) => p.status === "pending");
  const comprado = purchases.filter((p) => p.status === "purchased");
  const recibido = purchases.filter((p) => p.status === "delivered");

  if (loading && !refreshing) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar ya lo importamos pero aquí lo añadiríamos si no estuviera en un layout superior */}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Compritas</h1>
          <Button
            onClick={() => setShowModal(true)}
            className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6 h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Solicitud
          </Button>
        </div>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Crear Solicitud de Compra
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre del producto"
                value={newPurchase.product}
                onChange={(e) =>
                  setNewPurchase({ ...newPurchase, product: e.target.value })
                }
              />
              <Textarea
                placeholder="Descripción detallada"
                value={newPurchase.description}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    description: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={newPurchase.quantity}
                  onChange={(e) =>
                    setNewPurchase({
                      ...newPurchase,
                      quantity: Number.parseInt(e.target.value) || 1,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Precio estimado"
                  value={newPurchase.price}
                  onChange={(e) =>
                    setNewPurchase({
                      ...newPurchase,
                      price: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <Input
                placeholder="Proveedor"
                value={newPurchase.supplier}
                onChange={(e) =>
                  setNewPurchase({ ...newPurchase, supplier: e.target.value })
                }
              />
              <Select
                value={newPurchase.category}
                onValueChange={(value) =>
                  setNewPurchase({ ...newPurchase, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materiales">Materiales</SelectItem>
                  <SelectItem value="herramientas">Herramientas</SelectItem>
                  <SelectItem value="equipamiento">Equipamiento</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddPurchase} className="w-full">
                Crear Solicitud
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 mt-14">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
              Error: {error}
            </div>
          )}

          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No hay solicitudes aún
              </h3>
              <p className="text-gray-400 text-center px-6">
                Crea tu primera solicitud usando el botón +
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <PurchaseSection
                title="Para comprar"
                purchases={paraComprar}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
              />

              <PurchaseSection
                title="Comprado"
                purchases={comprado}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
              />

              <PurchaseSection
                title="Recibido"
                purchases={recibido}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
              />
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleRefresh}
            size="icon"
            variant="outline"
            className="w-12 h-12 rounded-full bg-white shadow-lg"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </main>
    </div>
  );
}

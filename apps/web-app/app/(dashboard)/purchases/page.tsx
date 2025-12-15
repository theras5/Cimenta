"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Clipboard, RefreshCw, Package, Upload, X } from "lucide-react";
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

// Categorías con colores
const categories = [
  { value: "materiales", label: "MATERIALES", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "herramientas", label: "HERRAMIENTAS", color: "bg-emerald-500 hover:bg-emerald-600" },
  { value: "equipamiento", label: "EQUIPAMIENTO", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "seguridad", label: "SEGURIDAD", color: "bg-red-500 hover:bg-red-600" },
  { value: "oficina", label: "OFICINA", color: "bg-purple-500 hover:bg-purple-600" },
  { value: "otros", label: "OTROS", color: "bg-gray-500 hover:bg-gray-600" },
];

const priorities = [
  { value: "baja", label: "baja", color: "bg-green-500 hover:bg-green-600" },
  { value: "normal", label: "normal", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "alta", label: "alta", color: "bg-orange-500 hover:bg-orange-600" },
  { value: "urgente", label: "urgente", color: "bg-red-500 hover:bg-red-600" },
];

const units = [
  { value: "u", label: "UNIDADES" },
  { value: "m", label: "METROS" },
  { value: "kg", label: "KG" },
  { value: "l", label: "LITROS" },
  { value: "m2", label: "M²" },
  { value: "m3", label: "M³" },
];

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
  onDelete,
}: {
  title: string;
  purchases: Purchase[];
  onStatusChange: (
    purchaseId: string,
    newStatus: Purchase["status"]
  ) => Promise<void>;
  onEdit: (purchaseId: string, updatedPurchase: Partial<Purchase>) => Promise<void>;
  onDelete: (purchaseId: string) => Promise<void>;
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
            onDelete={onDelete}
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
    deletePurchase,
  } = usePurchases();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [newPurchase, setNewPurchase] = useState({
    product: "",
    description: "",
    quantity: 1,
    unity: "u",
    price: 0,
    supplier: "",
    category: "",
    priority: "normal",
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length + selectedImages.length > 5) {
      alert("Máximo 5 imágenes permitidas");
      return;
    }

    // Validar cada archivo
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert("Solo se permiten imágenes");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert("Las imágenes no deben superar los 10MB");
        return;
      }
    }

    // Crear previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("No se pudo crear el canvas"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = url;
    });
  };

  const uploadPurchaseImages = async (purchaseId: string, images: File[]) => {
    try {
      for (let i = 0; i < images.length; i++) {
        const imageBase64 = await compressImage(images[i]);
        
        const response = await fetch(`/api/purchases/${purchaseId}/images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_data: imageBase64,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al subir imagen ${i + 1}`);
        }
      }
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      throw error;
    }
  };

  const handleAddPurchase = async () => {
    if (newPurchase.product && newPurchase.category) {
      try {
        const createdPurchase = await createPurchase({
          ...newPurchase,
          // Aseguramos que tenga site_id y user_id
          site_id:
            newPurchase.site_id || localStorage.getItem("selectedSiteId") || "",
          user_id: newPurchase.user_id || user?.id || "",
        });

        // Subir imágenes si hay alguna seleccionada
        if (selectedImages.length > 0 && createdPurchase.id) {
          try {
            await uploadPurchaseImages(createdPurchase.id, selectedImages);
          } catch (imageError) {
            console.error("Error al subir imágenes:", imageError);
            alert("La compra se creó correctamente pero hubo un problema al subir las imágenes.");
          }
        }

        // Resetear el formulario
        setNewPurchase({
          product: "",
          description: "",
          quantity: 1,
          unity: "u",
          price: 0,
          supplier: "",
          category: "",
          priority: "normal",
          status: "pending",
          site_id: localStorage.getItem("selectedSiteId") || "",
          user_id: user?.id || "",
        });
        setSelectedImages([]);
        setPreviewUrls([]);

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

  const handleDelete = async (purchaseId: string) => {
    try {
      await deletePurchase(purchaseId);
      // El estado se actualiza automáticamente en el hook
    } catch (error) {
      console.error("Error al eliminar compra:", error);
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
          <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Crear Solicitud de Compra
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Nombre del artículo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del artículo</label>
                <Input
                  placeholder="Ej: Cemento Portland"
                  value={newPurchase.product}
                  onChange={(e) =>
                    setNewPurchase({ ...newPurchase, product: e.target.value })
                  }
                />
              </div>

              {/* Cantidad y Unidad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cantidad</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej: 50"
                    value={newPurchase.quantity}
                    onChange={(e) =>
                      setNewPurchase({
                        ...newPurchase,
                        quantity: Number.parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unidad</label>
                  <Select
                    value={newPurchase.unity}
                    onValueChange={(value) =>
                      setNewPurchase({ ...newPurchase, unity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewPurchase({ ...newPurchase, category: cat.value })}
                      className={`px-3 py-1.5 text-xs font-medium ${
                        newPurchase.category === cat.value
                          ? cat.color + " text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Descripción/Especificaciones */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción/Especificaciones</label>
                <Textarea
                  placeholder="Especificaciones técnicas, marca preferida, etc."
                  value={newPurchase.description}
                  onChange={(e) =>
                    setNewPurchase({
                      ...newPurchase,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>

              {/* Proveedor sugerido */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor sugerido (opcional)</label>
                <Input
                  placeholder="Nombre del proveedor"
                  value={newPurchase.supplier}
                  onChange={(e) =>
                    setNewPurchase({ ...newPurchase, supplier: e.target.value })
                  }
                />
              </div>

              {/* Precio estimado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio estimado (opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="15000"
                    className="pl-7"
                    value={newPurchase.price || ""}
                    onChange={(e) =>
                      setNewPurchase({
                        ...newPurchase,
                        price: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">Monto en pesos argentinos</p>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <div className="flex flex-wrap gap-2">
                  {priorities.map((pri) => (
                    <Button
                      key={pri.value}
                      type="button"
                      onClick={() => setNewPurchase({ ...newPurchase, priority: pri.value })}
                      className={`px-3 py-1.5 text-xs font-medium capitalize ${
                        newPurchase.priority === pri.value
                          ? pri.color + " text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      {pri.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Imágenes adjuntas */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Imágenes adjuntas</label>
                <p className="text-xs text-gray-500 mb-3">
                  Máximo 5 imágenes. Tamaño máximo 10MB cada una.
                </p>
                
                {/* File Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={selectedImages.length >= 5}
                    className="hidden"
                    id="image-upload-modal"
                  />
                  <label htmlFor="image-upload-modal">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={selectedImages.length >= 5}
                      className="gap-2 cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4" />
                        Seleccionar imágenes
                      </span>
                    </Button>
                  </label>
                  {selectedImages.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedImages.length} / 5 imágenes seleccionadas
                    </span>
                  )}
                </div>

                {/* Image Previews */}
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {previewUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddPurchase}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
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
                onDelete={handleDelete}
              />

              <PurchaseSection
                title="Comprado"
                purchases={comprado}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />

              <PurchaseSection
                title="Recibido"
                purchases={recibido}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
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

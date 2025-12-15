"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, CheckCircle, Upload, X } from "lucide-react";
import Sidebar from "@/components/SideBar";
import { usePurchases } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";

// Categorías que coinciden con el enum purchase_category del backend
const categories = [
  { value: "materiales", label: "MATERIALES", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "herramientas", label: "HERRAMIENTAS", color: "bg-emerald-500 hover:bg-emerald-600" },
  { value: "equipamiento", label: "EQUIPAMIENTO", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "seguridad", label: "SEGURIDAD", color: "bg-red-500 hover:bg-red-600" },
  { value: "oficina", label: "OFICINA", color: "bg-purple-500 hover:bg-purple-600" },
  { value: "otros", label: "OTROS", color: "bg-gray-500 hover:bg-gray-600" },
];

const units = [
  { value: "u", label: "UNIDADES" },
  { value: "m", label: "METROS" },
  { value: "kg", label: "KG" },
  { value: "l", label: "LITROS" },
  { value: "m2", label: "M²" },
  { value: "m3", label: "M³" },
];

const priorities = [
  { value: "baja", label: "baja", color: "bg-green-500 hover:bg-green-600" },
  { value: "normal", label: "normal", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "alta", label: "alta", color: "bg-orange-500 hover:bg-orange-600" },
  { value: "urgente", label: "urgente", color: "bg-red-500 hover:bg-red-600" },
];

export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createPurchase } = usePurchases();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [siteId, setSiteId] = useState<string>("");
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
  });

  // Obtener siteId de localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSiteId = localStorage.getItem("selectedSiteId");
      if (storedSiteId) {
        setSiteId(storedSiteId);
      }
    }
  }, []);

  // const resetForm = () => {
  //   setNewPurchase({
  //     product: "",
  //     description: "",
  //     quantity: 1,
  //     unity: "u",
  //     price: 0,
  //     supplier: "",
  //     category: "",
  //     priority: "normal",
  //   });
  //   setSelectedImages([]);
  //   setPreviewUrls([]);
  //   setError("");
  //   setSuccess(false);
  // };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length + selectedImages.length > 5) {
      setError("Máximo 5 imágenes permitidas");
      return;
    }

    // Validar cada archivo
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten imágenes");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError("Las imágenes no deben superar los 10MB");
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
      console.error('Error en uploadPurchaseImages:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!newPurchase.product || !newPurchase.category) {
      setError("Por favor completa al menos el producto y la categoría");
      return;
    }

    if (!siteId) {
      setError("No hay sitio seleccionado");
      return;
    }

    if (!user?.id) {
      setError("Usuario no autenticado");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const purchaseData = {
        ...newPurchase,
        price: newPurchase.price || 0,
        priority: newPurchase.priority || "normal",
        site_id: siteId,
        user_id: user.id,
        status: "pending" as const,
      };

      const createdPurchase = await createPurchase(purchaseData);

      // Subir imágenes si hay alguna
      if (selectedImages.length > 0 && createdPurchase?.id) {
        try {
          await uploadPurchaseImages(createdPurchase.id, selectedImages);
        } catch (imageError) {
          console.error('Error al subir imágenes:', imageError);
          setError("La compra se creó correctamente pero hubo un problema al subir las imágenes");
        }
      }

      setSuccess(true);
      
      // Esperar un momento antes de redirigir
      setTimeout(() => {
        // Trigger auto-refresh en la página de purchases
        router.push(`/purchases?refresh=${Date.now()}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud de compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Nueva Solicitud de Compra</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Solicitud creada exitosamente. Redirigiendo...
                  </AlertDescription>
                </Alert>
              )}

              {/* Información de la Compra */}
              <Card>
                <CardHeader>
                  <CardTitle>Nueva Compra</CardTitle>
                  <CardDescription>
                    Completa los detalles de la solicitud de compra
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Nombre del artículo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre del artículo
                    </label>
                    <Input
                      placeholder="Ej: Cemento Portland"
                      value={newPurchase.product}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          product: e.target.value,
                        })
                      }
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>

                  {/* Cantidad y Unidad */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Cantidad
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ej: 50"
                        value={newPurchase.quantity}
                        onChange={(e) =>
                          setNewPurchase({
                            ...newPurchase,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        disabled={loading}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Unidad
                      </label>
                      <Select
                        value={newPurchase.unity}
                        onValueChange={(value) =>
                          setNewPurchase({ ...newPurchase, unity: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="bg-white">
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
                    <label className="text-sm font-medium text-gray-700">
                      Categoría
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <Button
                          key={cat.value}
                          type="button"
                          onClick={() => setNewPurchase({ ...newPurchase, category: cat.value })}
                          disabled={loading}
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
                    <label className="text-sm font-medium text-gray-700">
                      Descripción/Especificaciones
                    </label>
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
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>

                  {/* Proveedor sugerido */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Proveedor sugerido (opcional)
                    </label>
                    <Input
                      placeholder="Nombre del proveedor"
                      value={newPurchase.supplier}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          supplier: e.target.value,
                        })
                      }
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>

                  {/* Precio estimado */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Precio estimado (opcional)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 15000"
                      value={newPurchase.price || ""}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={loading}
                      className="bg-white"
                    />
                    <p className="text-xs text-gray-500">Monto en pesos argentinos</p>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Prioridad
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {priorities.map((pri) => (
                        <Button
                          key={pri.value}
                          type="button"
                          onClick={() => setNewPurchase({ ...newPurchase, priority: pri.value })}
                          disabled={loading}
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
                    <label className="text-sm font-medium text-gray-700">
                      Imágenes adjuntas
                    </label>
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
                        disabled={loading || selectedImages.length >= 5}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading || selectedImages.length >= 5}
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
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/purchases")}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Solicitud"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

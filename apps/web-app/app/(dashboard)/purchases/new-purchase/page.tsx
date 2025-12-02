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
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Sidebar from "@/components/SideBar";
import { usePurchases } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";

// Categorías que coinciden con el enum purchase_category del backend
const categories = [
  { value: "materiales", label: "Materiales" },
  { value: "herramientas", label: "Herramientas" },
  { value: "equipamiento", label: "Equipamiento" },
  { value: "seguridad", label: "Seguridad" },
  { value: "oficina", label: "Oficina" },
  { value: "otros", label: "Otros" },
];

const units = [
  { value: "u", label: "Unidades" },
  { value: "m", label: "Metros" },
  { value: "kg", label: "Kg" },
  { value: "l", label: "Litros" },
  { value: "m2", label: "M²" },
  { value: "m3", label: "M³" },
];

const priorities = [
  { value: "baja", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createPurchase, loading: purchasesLoading } = usePurchases();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [siteId, setSiteId] = useState<string>("");

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

  const resetForm = () => {
    setNewPurchase({
      product: "",
      description: "",
      quantity: 1,
      unity: "u",
      price: 0,
      supplier: "",
      category: "",
      priority: "normal",
    });
    setError("");
    setSuccess(false);
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

      await createPurchase({
        ...newPurchase,
        site_id: siteId,
        user_id: user.id,
        status: "pending",
      });

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
                  <CardTitle>Información de la Compra</CardTitle>
                  <CardDescription>
                    Completa los detalles de la solicitud de compra
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Producto */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Producto *
                    </label>
                    <Input
                      placeholder="Nombre del producto"
                      value={newPurchase.product}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          product: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <Textarea
                      placeholder="Describe el producto y su uso..."
                      value={newPurchase.description}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      disabled={loading}
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
                        value={newPurchase.quantity}
                        onChange={(e) =>
                          setNewPurchase({
                            ...newPurchase,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        disabled={loading}
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

                  {/* Precio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Precio estimado
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newPurchase.price}
                      onChange={(e) =>
                        setNewPurchase({
                          ...newPurchase,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  {/* Proveedor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Proveedor
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
                    />
                  </div>

                  {/* Categoría */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Categoría *
                    </label>
                    <Select
                      value={newPurchase.category}
                      onValueChange={(value) =>
                        setNewPurchase({ ...newPurchase, category: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Prioridad
                    </label>
                    <Select
                      value={newPurchase.priority}
                      onValueChange={(value) =>
                        setNewPurchase({ ...newPurchase, priority: value })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total estimado:
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        ${(newPurchase.quantity * newPurchase.price).toLocaleString()}
                      </span>
                    </div>
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

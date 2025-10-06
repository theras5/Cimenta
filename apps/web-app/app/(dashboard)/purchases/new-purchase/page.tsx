"use client";

import { useState } from "react";
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
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Sidebar from "@/components/SideBar";

interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  category: string;
}

interface Purchase {
  id: number;
  title: string;
  description: string;
  supplier: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "approved" | "ordered" | "delivered";
  items: PurchaseItem[];
  totalAmount: number;
  requestedBy: string;
  deliveryDate: string;
}

const categories = [
  "MATERIALES DE CONSTRUCCIÓN",
  "HERRAMIENTAS",
  "ELECTRICIDAD",
  "PLOMERÍA",
  "PINTURA",
  "ACABADOS",
  "SEGURIDAD",
  "OTROS",
];

const units = [
  "unidad",
  "metro",
  "metro²",
  "metro³",
  "kilogramo",
  "litro",
  "bolsa",
  "caja",
  "rollo",
  "galón",
  "saco",
];

const suppliers = [
  "Proveedor Principal",
  "Ferretería Central",
  "Distribuidora Eléctrica",
  "Materiales del Norte",
  "Suministros Técnicos",
  "Otro (especificar)",
];

export default function NewPurchasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [purchaseData, setPurchaseData] = useState({
    title: "",
    description: "",
    supplier: "",
    priority: "medium" as Purchase["priority"],
    deliveryDate: "",
    customSupplier: "",
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: "1",
      name: "",
      quantity: 1,
      unitPrice: 0,
      unit: "unidad",
      category: "",
    },
  ]);

  const addItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      unitPrice: 0,
      unit: "unidad",
      category: "",
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotal = () => {
    return items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );
  };

  const validateForm = () => {
    if (!purchaseData.title || !purchaseData.description) {
      return "Por favor completa el título y la descripción";
    }

    if (
      !purchaseData.supplier ||
      (purchaseData.supplier === "Otro (especificar)" &&
        !purchaseData.customSupplier)
    ) {
      return "Por favor selecciona o especifica un proveedor";
    }

    const invalidItems = items.some(
      (item) =>
        !item.name || !item.category || item.quantity <= 0 || item.unitPrice < 0
    );

    if (invalidItems) {
      return "Por favor completa todos los campos de los artículos";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const finalSupplier =
        purchaseData.supplier === "Otro (especificar)"
          ? purchaseData.customSupplier
          : purchaseData.supplier;

      const purchase: Purchase = {
        id: Math.floor(Math.random() * 10000),
        title: purchaseData.title,
        description: purchaseData.description,
        supplier: finalSupplier,
        priority: purchaseData.priority,
        status: "pending",
        items: items,
        totalAmount: calculateTotal(),
        requestedBy: "Usuario actual", // Aquí integrarás con auth
        deliveryDate: purchaseData.deliveryDate,
      };

      // Simular llamada al backend
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Nueva compra creada:", purchase);

      // Redirigir a la página de compras
      router.push("/purchases");
    } catch (error: unknown) {
      setError(error.message || "Error al crear la solicitud de compra");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "text-green-600 bg-green-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "urgent":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
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
            <h1 className="text-2xl font-bold text-gray-800">Nueva Compra</h1>
          </div>

          {/* Total Amount */}
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-blue-600 font-medium">
              Total: ${calculateTotal().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Información General */}
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                  <CardDescription>
                    Datos básicos de la solicitud de compra
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Título */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Título de la solicitud *
                    </label>
                    <Input
                      placeholder="Ej: Materiales para instalación eléctrica"
                      value={purchaseData.title}
                      onChange={(e) =>
                        setPurchaseData({
                          ...purchaseData,
                          title: e.target.value,
                        })
                      }
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Descripción detallada *
                    </label>
                    <Textarea
                      placeholder="Describe el propósito y detalles de la compra..."
                      value={purchaseData.description}
                      onChange={(e) =>
                        setPurchaseData({
                          ...purchaseData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  {/* Proveedor y Prioridad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Proveedor *
                      </label>
                      <Select
                        value={purchaseData.supplier}
                        onValueChange={(value) =>
                          setPurchaseData({ ...purchaseData, supplier: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Prioridad
                      </label>
                      <Select
                        value={purchaseData.priority}
                        onValueChange={(value) =>
                          setPurchaseData({
                            ...purchaseData,
                            priority: value as Purchase["priority"],
                          })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Baja
                            </span>
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              Media
                            </span>
                          </SelectItem>
                          <SelectItem value="high">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              Alta
                            </span>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              Urgente
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Proveedor personalizado */}
                  {purchaseData.supplier === "Otro (especificar)" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Especificar proveedor *
                      </label>
                      <Input
                        placeholder="Nombre del proveedor"
                        value={purchaseData.customSupplier}
                        onChange={(e) =>
                          setPurchaseData({
                            ...purchaseData,
                            customSupplier: e.target.value,
                          })
                        }
                        className="h-12"
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* Fecha de entrega */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Fecha de entrega deseada
                    </label>
                    <Input
                      type="date"
                      value={purchaseData.deliveryDate}
                      onChange={(e) =>
                        setPurchaseData({
                          ...purchaseData,
                          deliveryDate: e.target.value,
                        })
                      }
                      className="h-12"
                      disabled={loading}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Artículos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Artículos a Comprar</CardTitle>
                      <CardDescription>
                        Lista detallada de los artículos necesarios
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={addItem}
                      size="sm"
                      className="gap-2"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Artículo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-700">
                          Artículo {index + 1}
                        </h4>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Nombre */}
                        <div className="lg:col-span-2 space-y-2">
                          <label className="text-sm font-medium text-gray-600">
                            Nombre del artículo *
                          </label>
                          <Input
                            placeholder="Ej: Cable eléctrico 12 AWG"
                            value={item.name}
                            onChange={(e) =>
                              updateItem(item.id, "name", e.target.value)
                            }
                            disabled={loading}
                          />
                        </div>

                        {/* Cantidad */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">
                            Cantidad *
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            disabled={loading}
                          />
                        </div>

                        {/* Unidad */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">
                            Unidad
                          </label>
                          <Select
                            value={item.unit}
                            onValueChange={(value) =>
                              updateItem(item.id, "unit", value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Precio unitario */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">
                            Precio unitario
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Categoría */}
                      <div className="mt-4 space-y-2">
                        <label className="text-sm font-medium text-gray-600">
                          Categoría *
                        </label>
                        <Select
                          value={item.category}
                          onValueChange={(value) =>
                            updateItem(item.id, "category", value)
                          }
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subtotal */}
                      <div className="mt-4 text-right">
                        <span className="text-sm text-gray-600">
                          Subtotal:{" "}
                        </span>
                        <span className="font-medium text-gray-800">
                          ${(item.quantity * item.unitPrice).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4">
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
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando solicitud...
                    </>
                  ) : (
                    "Crear Solicitud de Compra"
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

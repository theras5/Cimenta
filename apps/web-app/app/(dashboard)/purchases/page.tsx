"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Clipboard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
} from "lucide-react";
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

interface Purchase {
  id: string;
  title: string;
  description: string;
  quantity: number;
  estimatedPrice: number;
  supplier: string;
  category: string;
  status: "para-comprar" | "comprado" | "recibido";
  orderDate?: string;
  deliveryDate?: string;
}
const initialPurchases: Purchase[] = [
  // Para comprar - Ejemplos existentes
  {
    id: "1",
    title: "Cemento Portland",
    description: "Cemento para fundación y estructura principal",
    quantity: 50,
    estimatedPrice: 2500,
    supplier: "Materiales González",
    category: "MATERIALES",
    status: "para-comprar",
  },
  {
    id: "4",
    title: "Tuberías PVC",
    description: "Tubería PVC para sistema de plomería",
    quantity: 30,
    estimatedPrice: 900,
    supplier: "Plomería Total",
    category: "PLOMERÍA",
    status: "para-comprar",
  },
  // Para comprar - Nuevos ejemplos
  {
    id: "7",
    title: "Arena gruesa",
    description: "Arena gruesa para mezcla de concreto y mortero",
    quantity: 15,
    estimatedPrice: 1800,
    supplier: "Materiales González",
    category: "MATERIALES",
    status: "para-comprar",
  },
  {
    id: "8",
    title: "Varillas de acero",
    description: "Varillas de acero corrugado 3/8 para refuerzo estructural",
    quantity: 200,
    estimatedPrice: 4200,
    supplier: "Aceros del Centro",
    category: "MATERIALES",
    status: "para-comprar",
  },
  {
    id: "9",
    title: "Interruptores eléctricos",
    description: "Interruptores simples y dobles para instalación eléctrica",
    quantity: 25,
    estimatedPrice: 750,
    supplier: "Eléctricos del Norte",
    category: "ELECTRICIDAD",
    status: "para-comprar",
  },
  {
    id: "10",
    title: "Grifería para baño",
    description: "Set completo de grifería cromada para baño principal",
    quantity: 3,
    estimatedPrice: 2100,
    supplier: "Sanitarios Premium",
    category: "PLOMERÍA",
    status: "para-comprar",
  },
  {
    id: "11",
    title: "Rodillos y pinceles",
    description: "Set de rodillos y pinceles para aplicación de pintura",
    quantity: 12,
    estimatedPrice: 680,
    supplier: "Pinturas Premium",
    category: "PINTURA",
    status: "para-comprar",
  },
  {
    id: "12",
    title: "Taladro percutor",
    description: "Taladro percutor profesional con brocas incluidas",
    quantity: 2,
    estimatedPrice: 3200,
    supplier: "Ferretería Central",
    category: "HERRAMIENTAS",
    status: "para-comprar",
  },
  // Comprado - Ejemplos existentes
  {
    id: "2",
    title: "Cables eléctricos",
    description: "Cable 12 AWG para instalación eléctrica",
    quantity: 100,
    estimatedPrice: 800,
    supplier: "Eléctricos del Norte",
    category: "ELECTRICIDAD",
    status: "comprado",
    orderDate: "2025-09-26",
  },
  {
    id: "5",
    title: "Ladrillos rojos",
    description: "Ladrillos para construcción de muros",
    quantity: 1000,
    estimatedPrice: 3500,
    supplier: "Materiales González",
    category: "MATERIALES",
    status: "comprado",
    orderDate: "2025-09-24",
  },
  // Recibido - Ejemplos existentes
  {
    id: "3",
    title: "Pintura exterior",
    description: "Pintura acrílica blanca para exteriores",
    quantity: 20,
    estimatedPrice: 1200,
    supplier: "Pinturas Premium",
    category: "PINTURA",
    status: "recibido",
    orderDate: "2025-09-20",
    deliveryDate: "2025-09-25",
  },
  {
    id: "6",
    title: "Herramientas varias",
    description: "Set de herramientas para construcción",
    quantity: 1,
    estimatedPrice: 1500,
    supplier: "Ferretería Central",
    category: "HERRAMIENTAS",
    status: "recibido",
    orderDate: "2025-09-18",
    deliveryDate: "2025-09-22",
  },
];

const categoryColors = {
  MATERIALES: "bg-gray-500",
  ELECTRICIDAD: "bg-blue-500",
  PINTURA: "bg-pink-500",
  PLOMERÍA: "bg-cyan-500",
  HERRAMIENTAS: "bg-purple-500",
};

// Purchase Section Component with horizontal scroll
const PurchaseSection = ({
  title,
  purchases,
}: {
  title: string;
  purchases: Purchase[];
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  if (purchases.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {title} ({purchases.length})
      </h2>
      <div className="flex gap-4">
        {purchases.map((purchase) => (
          <div
            key={purchase.id}
            className="flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {purchase.title}
              </h3>
            </div>

            <p className="text-xs text-gray-600 mb-4 line-clamp-2">
              {purchase.description}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Cantidad:</span>
                <span className="font-medium">{purchase.quantity}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Precio:</span>
                <span className="font-medium text-green-600">
                  {formatPrice(purchase.estimatedPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Proveedor:</span>
                <span className="font-medium">{purchase.supplier}</span>
              </div>
              {purchase.orderDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Pedido:</span>
                  <span className="font-medium">{purchase.orderDate}</span>
                </div>
              )}
              {purchase.deliveryDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Entregado:</span>
                  <span className="font-medium">{purchase.deliveryDate}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`${categoryColors[purchase.category as keyof typeof categoryColors]} text-white text-xs px-2 py-1 rounded-full font-medium`}
              >
                {purchase.category}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {purchase.supplier.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Wrapper component for PurchaseSection with horizontal scroll
const ScrollablePurchaseSection = ({
  title,
  purchases,
}: {
  title: string;
  purchases: Purchase[];
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [purchases]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (purchases.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <PurchaseSection title={title} purchases={purchases} />
      </div>
    </div>
  );
};

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    title: "",
    description: "",
    quantity: 1,
    estimatedPrice: 0,
    supplier: "",
    category: "",
    status: "para-comprar" as Purchase["status"],
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleAddPurchase = () => {
    if (
      newPurchase.title &&
      newPurchase.description &&
      newPurchase.category &&
      newPurchase.supplier
    ) {
      const purchase: Purchase = {
        id: Date.now().toString(),
        title: newPurchase.title,
        description: newPurchase.description,
        quantity: newPurchase.quantity,
        estimatedPrice: newPurchase.estimatedPrice,
        supplier: newPurchase.supplier,
        category: newPurchase.category,
        status: newPurchase.status,
      };
      setPurchases([...purchases, purchase]);
      setNewPurchase({
        title: "",
        description: "",
        quantity: 1,
        estimatedPrice: 0,
        supplier: "",
        category: "",
        status: "para-comprar",
      });
      setShowModal(false);
    }
  };

  // Group purchases by status
  const paraComprar = purchases.filter(
    (purchase) => purchase.status === "para-comprar"
  );
  const comprado = purchases.filter(
    (purchase) => purchase.status === "comprado"
  );
  const recibido = purchases.filter(
    (purchase) => purchase.status === "recibido"
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Crear Solicitud de Compra
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre del producto"
                value={newPurchase.title}
                onChange={(e) =>
                  setNewPurchase({ ...newPurchase, title: e.target.value })
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
                  value={newPurchase.estimatedPrice}
                  onChange={(e) =>
                    setNewPurchase({
                      ...newPurchase,
                      estimatedPrice: Number.parseFloat(e.target.value) || 0,
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
                  <SelectItem value="MATERIALES">MATERIALES</SelectItem>
                  <SelectItem value="ELECTRICIDAD">ELECTRICIDAD</SelectItem>
                  <SelectItem value="PINTURA">PINTURA</SelectItem>
                  <SelectItem value="PLOMERÍA">PLOMERÍA</SelectItem>
                  <SelectItem value="HERRAMIENTAS">HERRAMIENTAS</SelectItem>
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
              {/* Para Comprar */}
              <ScrollablePurchaseSection
                title="Para comprar"
                purchases={paraComprar}
              />

              {/* Comprado */}
              <ScrollablePurchaseSection
                title="Comprado"
                purchases={comprado}
              />

              {/* Recibido */}
              <ScrollablePurchaseSection
                title="Recibido"
                purchases={recibido}
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

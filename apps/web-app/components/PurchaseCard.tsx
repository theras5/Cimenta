import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Purchase } from "@/hooks/usePurchases";

// Definir colores por categoría
const categoryColors = {
  MATERIALES: "bg-gray-500",
  ELECTRICIDAD: "bg-blue-500",
  PINTURA: "bg-pink-500",
  PLOMERÍA: "bg-cyan-500",
  HERRAMIENTAS: "bg-purple-500",
  construccion: "bg-gray-500",
  electricidad: "bg-blue-500",
  pintura: "bg-pink-500",
  plomeria: "bg-cyan-500",
};

// Adaptar modelo de backend al modelo de UI
const adaptPurchaseToUI = (purchase: Purchase) => {
  return {
    ...purchase,
    title: purchase.product,
    estimatedPrice: purchase.price,
    orderDate: purchase.purchase_date,
    deliveryDate: purchase.delivery_date,
    uiStatus: mapStatusToUI(purchase.status)
  };
};

// Mapear los estados del backend a estados de la UI
const mapStatusToUI = (status: Purchase['status']): "para-comprar" | "comprado" | "recibido" => {
  switch (status) {
    case 'pending': return 'para-comprar';
    case 'purchased': return 'comprado';
    case 'delivered': return 'recibido';
    default: return 'para-comprar';
  }
};

// Formatear precio a moneda
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
};

interface PurchaseCardProps {
  purchase: Purchase;
  onStatusChange: (purchaseId: string, newStatus: Purchase['status']) => Promise<void>;
}

export const PurchaseCard = ({ purchase, onStatusChange }: PurchaseCardProps) => {
  const uiPurchase = adaptPurchaseToUI(purchase);
  const [isUpdating, setIsUpdating] = useState(false);

  // Determinar el siguiente estado según el actual
  const getNextStatus = (currentStatus: Purchase['status']): Purchase['status'] => {
    switch (currentStatus) {
      case 'pending': return 'purchased';
      case 'purchased': return 'delivered';
      case 'delivered': return 'delivered'; // Ya está en el estado final
      default: return 'pending';
    }
  };

  // Manejar el cambio de estado
  const handleStatusChange = async (newStatus: Purchase['status']) => {
    try {
      setIsUpdating(true);
      await onStatusChange(purchase.id, newStatus);
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Determinar el texto del botón según el estado
  const getStatusButtonText = (status: Purchase['status']): string => {
    switch (status) {
      case 'pending': return "Marcar como Comprado";
      case 'purchased': return "Marcar como Recibido";
      case 'delivered': return "✓ Completado";
      default: return "Cambiar estado";
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${isUpdating ? 'opacity-70' : ''}`}
    >
      <div className="mb-3 flex justify-between items-start">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {uiPurchase.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-gray-100">
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {purchase.status !== 'purchased' && purchase.status !== 'delivered' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange('purchased')}
                disabled={isUpdating}
              >
                Marcar como Comprado
              </DropdownMenuItem>
            )}
            {purchase.status !== 'delivered' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange('delivered')}
                disabled={isUpdating}
              >
                Marcar como Recibido
              </DropdownMenuItem>
            )}
            {purchase.status === 'purchased' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange('pending')}
                disabled={isUpdating}
              >
                Volver a Pendiente
              </DropdownMenuItem>
            )}
            {purchase.status === 'delivered' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange('purchased')}
                disabled={isUpdating}
              >
                Volver a Comprado
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-xs text-gray-600 mb-4 line-clamp-2">
        {uiPurchase.description}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Cantidad:</span>
          <span className="font-medium">{uiPurchase.quantity}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Precio:</span>
          <span className="font-medium text-green-600">
            {formatPrice(uiPurchase.estimatedPrice || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Proveedor:</span>
          <span className="font-medium">{uiPurchase.supplier || "No especificado"}</span>
        </div>
        {uiPurchase.orderDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Pedido:</span>
            <span className="font-medium">{new Date(uiPurchase.orderDate).toLocaleDateString()}</span>
          </div>
        )}
        {uiPurchase.deliveryDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Entregado:</span>
            <span className="font-medium">{new Date(uiPurchase.deliveryDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`${categoryColors[uiPurchase.category as keyof typeof categoryColors] || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded-full font-medium`}
        >
          {uiPurchase.category}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {uiPurchase.supplier?.charAt(0) || "U"}
          </div>
        </div>
      </div>
      
      {/* Botón para cambiar al siguiente estado */}
      {purchase.status !== 'delivered' && (
        <button
          onClick={() => handleStatusChange(getNextStatus(purchase.status))}
          className={`mt-3 w-full py-1 px-2 text-xs font-medium rounded-md ${
            isUpdating ? 'bg-gray-300' : 
            purchase.status === 'pending' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
            'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
          disabled={isUpdating}
        >
          {isUpdating ? "Actualizando..." : getStatusButtonText(purchase.status)}
        </button>
      )}
    </div>
  );
};
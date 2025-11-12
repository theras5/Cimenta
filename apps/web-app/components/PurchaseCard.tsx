import { useState } from "react";
import { Check, ChevronDown, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Purchase } from "@/hooks/usePurchases";

// Definir colores por categoría (coinciden con calendar/TaskCard)
const getCategoryColor = (category: string) => {
  if (!category) return "#999999";
  const c = category.toLowerCase();
  switch (c) {
    case "electricidad":
    case "electric":
      return "#007AFF"; // blue
    case "plomería":
    case "plomeria":
    case "plumbing":
      return "#FF9500"; // orange
    case "construcción":
    case "construccion":
    case "construction":
      return "#8A2BE2"; // purple
    case "pintura":
    case "paint":
      return "#FF2D92"; // pink
    default:
      return "#10B981"; // green-ish default to match calendar
  }
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
  onStatusChange: (
    purchaseId: string, 
    newStatus: Purchase['status'],
    updateData?: Partial<Purchase>
  ) => Promise<void>;
  onEdit?: (purchaseId: string, updatedPurchase: Partial<Purchase>) => Promise<void>;
}

export const PurchaseCard = ({ purchase, onStatusChange, onEdit }: PurchaseCardProps) => {
  const uiPurchase = adaptPurchaseToUI(purchase);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedPurchase, setEditedPurchase] = useState<Partial<Purchase>>({});

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
    
    // Crear objeto con datos a actualizar (estado y posiblemente fechas)
    const updateData: Partial<Purchase> = { 
      status: newStatus 
    };
    
    // Si cambia a "purchased", establecer fecha de compra actual
    if (newStatus === 'purchased' && !purchase.purchase_date) {
      updateData.purchase_date = new Date().toISOString();
    }
    
    // Si cambia a "delivered", establecer fecha de entrega actual
    if (newStatus === 'delivered' && !purchase.delivery_date) {
      updateData.delivery_date = new Date().toISOString();
    }
    
    // Si vuelve a "pending", borrar fecha de compra
    if (newStatus === 'pending' && purchase.status === 'purchased') {
      updateData.purchase_date = undefined;
    }
    
    // Si vuelve a "purchased", borrar fecha de entrega
    if (newStatus === 'purchased' && purchase.status === 'delivered') {
      updateData.delivery_date = undefined;
    }
    
    await onStatusChange(purchase.id, newStatus, updateData);
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

  const handleEdit = () => {
    // Inicializar el formulario con los valores actuales
    setEditedPurchase({
      product: purchase.product,
      description: purchase.description,
      quantity: purchase.quantity,
      price: purchase.price,
      supplier: purchase.supplier,
      category: purchase.category,
    });
    setIsEditModalOpen(true);
  };

  // Función para guardar los cambios
  const handleSaveEdit = async () => {
    if (!onEdit) return;
    
    try {
      setIsUpdating(true);
      await onEdit(purchase.id, editedPurchase);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error al guardar cambios:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (field: keyof Purchase, value: any) => {
    setEditedPurchase(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 ${isUpdating ? 'opacity-70' : ''}`}
    >
      {/* Header con título y dropdown */}
      <div className="mb-1 flex justify-between items-start gap-2">
        <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
          {uiPurchase.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
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
            <DropdownMenuItem 
                onClick={handleEdit}
                disabled={isUpdating || !onEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Información principal compacta */}
      <div className="space-y-0.5 mb-2 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Cantidad:</span>
          <span className="font-medium text-gray-900">{uiPurchase.quantity}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Precio:</span>
          <span className="font-semibold text-green-600">
            {formatPrice(uiPurchase.estimatedPrice || 0)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Proveedor:</span>
          <span className="font-medium text-gray-900 truncate ml-2">{uiPurchase.supplier || "No especificado"}</span>
        </div>
      </div>

      {/* Footer con categoría */}
      <div className="flex items-center justify-between">
        <div 
          style={{ backgroundColor: getCategoryColor(uiPurchase.category) }}
          className="px-1.5 py-0.5 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-[10px] font-medium uppercase leading-none">
            {uiPurchase.category}
          </span>
        </div>
        {uiPurchase.supplier && (
          <div 
            style={{ backgroundColor: getCategoryColor(uiPurchase.category) }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            {uiPurchase.supplier.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Botón para cambiar al siguiente estado */}
      {purchase.status !== 'delivered' && (
        <button
          onClick={() => handleStatusChange(getNextStatus(purchase.status))}
          className={`mt-2 w-full py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
            isUpdating ? 'bg-gray-300 cursor-not-allowed' : 
            purchase.status === 'pending' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
            'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
          disabled={isUpdating}
        >
          {isUpdating ? "Actualizando..." : getStatusButtonText(purchase.status)}
        </button>
      )}
    </div>

    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Editar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Producto</label>
              <Input 
                value={editedPurchase.product || ''} 
                onChange={(e) => handleChange('product', e.target.value)} 
                placeholder="Nombre del producto"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea 
                value={editedPurchase.description || ''} 
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descripción detallada" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <Input 
                  type="number" 
                  value={editedPurchase.quantity || ''} 
                  onChange={(e) => handleChange('quantity', Number(e.target.value))}
                  placeholder="Cantidad" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio</label>
                <Input 
                  type="number" 
                  value={editedPurchase.price || ''} 
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  placeholder="Precio" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Input 
                value={editedPurchase.supplier || ''} 
                onChange={(e) => handleChange('supplier', e.target.value)}
                placeholder="Nombre del proveedor" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select 
                value={editedPurchase.category} 
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricidad">ELECTRICIDAD</SelectItem>
                  <SelectItem value="pintura">PINTURA</SelectItem>
                  <SelectItem value="plomeria">PLOMERÍA</SelectItem>
                  <SelectItem value="construccion">CONSTRUCCION</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isUpdating}
            >
              {isUpdating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
  );
};
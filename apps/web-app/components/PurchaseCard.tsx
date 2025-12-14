import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Edit, Trash2, Upload, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  onDelete?: (purchaseId: string) => Promise<void>;
}

export const PurchaseCard = ({ purchase, onStatusChange, onEdit, onDelete }: PurchaseCardProps) => {
  const router = useRouter();
  const uiPurchase = adaptPurchaseToUI(purchase);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedPurchase, setEditedPurchase] = useState<Partial<Purchase>>({});
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

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

  const handleEdit = async () => {
    // Inicializar el formulario con los valores actuales
    setEditedPurchase({
      product: purchase.product,
      description: purchase.description,
      quantity: purchase.quantity,
      unity: purchase.unity,
      price: purchase.price,
      supplier: purchase.supplier,
      category: purchase.category,
      priority: purchase.priority,
    });
    
    // Cargar imágenes existentes
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/images`);
      if (response.ok) {
        const images = await response.json();
        setExistingImages(images);
      }
    } catch (error) {
      console.error("Error al cargar imágenes:", error);
    }
    
    // Resetear estados de imágenes nuevas
    setNewImages([]);
    setNewImagePreviews([]);
    setImagesToDelete([]);
    
    setIsEditModalOpen(true);
  };

  // Función para guardar los cambios
  const handleSaveEdit = async () => {
    if (!onEdit) return;
    
    try {
      setIsUpdating(true);
      
      // Guardar cambios del formulario
      await onEdit(purchase.id, editedPurchase);
      
      // Eliminar imágenes marcadas
      for (const imageId of imagesToDelete) {
        try {
          await fetch(`/api/purchases/${purchase.id}/images/${imageId}`, {
            method: "DELETE",
          });
        } catch (error) {
          console.error("Error al eliminar imagen:", error);
        }
      }
      
      // Subir nuevas imágenes
      for (const file of newImages) {
        try {
          const imageBase64 = await compressImage(file);
          await fetch(`/api/purchases/${purchase.id}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_data: imageBase64,
            }),
          });
        } catch (error) {
          console.error("Error al subir imagen:", error);
        }
      }
      
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error al guardar cambios:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para eliminar
  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsUpdating(true);
      await onDelete(purchase.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error al eliminar compra:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (field: keyof Purchase, value: any) => {
    setEditedPurchase(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + files.length;
    if (totalImages > 5) {
      alert("Máximo 5 imágenes permitidas");
      return;
    }

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

    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setNewImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setNewImages(prev => [...prev, ...files]);
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const markExistingImageForDeletion = (imageId: string) => {
    setImagesToDelete(prev => [...prev, imageId]);
  };

  const unmarkExistingImageForDeletion = (imageId: string) => {
    setImagesToDelete(prev => prev.filter(id => id !== imageId));
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

  return (
    <>
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${isUpdating ? 'opacity-70' : ''}`}
      onClick={() => router.push(`/purchases/${purchase.id}`)}
    >
      {/* Header con título y dropdown */}
      <div className="mb-1 flex justify-between items-start gap-2">
        <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
          {uiPurchase.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {purchase.status !== 'purchased' && purchase.status !== 'delivered' && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange('purchased');
                }}
                disabled={isUpdating}
              >
                Marcar como Comprado
              </DropdownMenuItem>
            )}
            {purchase.status !== 'delivered' && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange('delivered');
                }}
                disabled={isUpdating}
              >
                Marcar como Recibido
              </DropdownMenuItem>
            )}
            {purchase.status === 'purchased' && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange('pending');
                }}
                disabled={isUpdating}
              >
                Volver a Pendiente
              </DropdownMenuItem>
            )}
            {purchase.status === 'delivered' && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange('purchased');
                }}
                disabled={isUpdating}
              >
                Volver a Comprado
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                disabled={isUpdating || !onEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
                disabled={isUpdating || !onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                Eliminar
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
          <span className="text-xs font-medium text-white">
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Editar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Nombre del artículo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del artículo</label>
              <Input 
                value={editedPurchase.product || ''} 
                onChange={(e) => handleChange('product', e.target.value)} 
                placeholder="Ej: Cemento Portland"
              />
            </div>
            
            {/* Cantidad y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <Input 
                  type="number" 
                  min="1"
                  value={editedPurchase.quantity || ''} 
                  onChange={(e) => handleChange('quantity', Number(e.target.value))}
                  placeholder="Ej: 50" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unidad</label>
                <Select 
                  value={editedPurchase.unity || 'u'}
                  onValueChange={(value) => handleChange('unity', value)}
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
                    onClick={() => handleChange('category', cat.value)}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      editedPurchase.category === cat.value
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
                value={editedPurchase.description || ''} 
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Especificaciones técnicas, marca preferida, etc."
                rows={4}
              />
            </div>
            
            {/* Proveedor sugerido */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor sugerido (opcional)</label>
              <Input 
                value={editedPurchase.supplier || ''} 
                onChange={(e) => handleChange('supplier', e.target.value)}
                placeholder="Nombre del proveedor" 
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
                  value={editedPurchase.price || ''} 
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  placeholder="15000"
                  className="pl-7"
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
                    onClick={() => handleChange('priority', pri.value)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize ${
                      editedPurchase.priority === pri.value
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
              
              {/* Imágenes existentes */}
              {existingImages.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Imágenes actuales:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {existingImages.map((image, index) => {
                      const imageId = image.id || `existing-${index}`;
                      const isMarkedForDeletion = imagesToDelete.includes(imageId);
                      return (
                        <div
                          key={imageId}
                          className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden group ${
                            isMarkedForDeletion ? 'opacity-50 border-2 border-red-500' : ''
                          }`}
                        >
                          <img
                            src={image.image_url}
                            alt="Purchase image"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => 
                              isMarkedForDeletion 
                                ? unmarkExistingImageForDeletion(imageId)
                                : markExistingImageForDeletion(imageId)
                            }
                            className={`absolute top-2 right-2 ${
                              isMarkedForDeletion 
                                ? 'bg-gray-500 hover:bg-gray-600' 
                                : 'bg-red-500 hover:bg-red-600'
                            } text-white rounded-full p-1.5 shadow-lg`}
                          >
                            {isMarkedForDeletion ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nuevas imágenes a subir */}
              {newImagePreviews.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Nuevas imágenes:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {newImagePreviews.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={url}
                          alt={`Nueva ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Botón para agregar imágenes */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={existingImages.length - imagesToDelete.length + newImages.length >= 5}
                  className="hidden"
                  id="image-upload-edit"
                />
                <label htmlFor="image-upload-edit">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={existingImages.length - imagesToDelete.length + newImages.length >= 5}
                    className="gap-2 cursor-pointer"
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      Agregar imágenes
                    </span>
                  </Button>
                </label>
                <span className="text-sm text-gray-500">
                  {existingImages.length - imagesToDelete.length + newImages.length} / 5 imágenes
                </span>
              </div>
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar solicitud de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud &ldquo;{purchase.product}&rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
  );
};
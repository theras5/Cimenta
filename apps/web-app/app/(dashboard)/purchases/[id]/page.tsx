"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Package, Calendar, Building2, FileText, Trash2 } from "lucide-react";
import ClientDate from "@/components/ClientDate";
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
import Sidebar from "@/components/SideBar";
import { usePurchases } from "@/hooks/usePurchases";

interface Purchase {
  id: string;
  product: string;
  description?: string;
  quantity: number;
  unity?: string;
  price?: number;
  supplier?: string;
  category: string;
  priority?: string;
  status: 'pending' | 'purchased' | 'delivered';
  purchase_date?: string;
  delivery_date?: string;
  created_at?: string;
  site?: {
    address: string;
  };
  user_id?: string;
}

interface PurchaseImage {
  id: string;
  image_url: string;
  purchase_id: string;
}

const getStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    pending: 'Pendiente',
    purchased: 'Comprado',
    delivered: 'Entregado',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    pending: 'bg-yellow-500',
    purchased: 'bg-blue-500',
    delivered: 'bg-green-500',
  };
  return colors[status] || 'bg-gray-500';
};

const getCategoryLabel = (category: string) => {
  const labels: { [key: string]: string } = {
    materiales: 'Materiales',
    herramientas: 'Herramientas',
    equipamiento: 'Equipamiento',
    seguridad: 'Seguridad',
    oficina: 'Oficina',
    otros: 'Otros',
  };
  return labels[category?.toLowerCase()] || category;
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    materiales: 'bg-amber-500',
    herramientas: 'bg-emerald-500',
    equipamiento: 'bg-blue-500',
    seguridad: 'bg-red-500',
    oficina: 'bg-purple-500',
    otros: 'bg-gray-500',
  };
  return colors[category?.toLowerCase()] || 'bg-gray-500';
};

const getPriorityColor = (priority: string) => {
  const colors: { [key: string]: string } = {
    baja: 'bg-green-500',
    normal: 'bg-blue-500',
    alta: 'bg-orange-500',
    urgente: 'bg-red-500',
  };
  return colors[priority?.toLowerCase()] || 'bg-gray-500';
};

const getUnityLabel = (unity: string) => {
  const labels: { [key: string]: string } = {
    u: 'Unidades',
    m: 'Metros',
    kg: 'Kg',
    l: 'Litros',
    m2: 'M²',
    m3: 'M³',
  };
  return labels[unity?.toLowerCase()] || unity;
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { deletePurchase } = usePurchases();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [images, setImages] = useState<PurchaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const loadPurchaseDetails = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log('📥 Cargando detalles de compra:', params.id);
      
      // Usar la API route de Next.js en vez de llamar directamente al backend
      const response = await fetch(`/api/purchases/${params.id}`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar la compra');
      }
      
      const data = await response.json();
      console.log('✅ Compra cargada:', data);
      setPurchase(data);

      // Cargar imágenes
      try {
        console.log('📥 Cargando imágenes de compra:', params.id);
        
        const imagesResponse = await fetch(`/api/purchases/${params.id}/images`);
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          console.log('✅ Imágenes cargadas:', imagesData.length);
          setImages(imagesData);
        } else {
          console.log('⚠️ No se pudieron cargar las imágenes');
        }
      } catch (imgError) {
        console.log('⚠️ Error al cargar imágenes:', imgError);
      }
    } catch (err) {
      console.error('❌ Error cargando detalles:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deletePurchase(params.id as string);
      router.push('/purchases');
    } catch (err) {
      console.error('Error eliminando compra:', err);
      setError('Error al eliminar la solicitud');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando detalles...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>{error || 'No se encontró la compra'}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/purchases')} className="mt-4">
              Volver a Compras
            </Button>
          </div>
        </main>
      </div>
    );
  }

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
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{purchase.product}</h1>
              <p className="text-sm text-gray-500">Detalle de la solicitud</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(purchase.status)} text-white`}>
              {getStatusLabel(purchase.status)}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar solicitud de compra?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud de compra &ldquo;{purchase.product}&rdquo;.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Información Principal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Información del Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Producto</p>
                    <p className="font-semibold">{purchase.product}</p>
                  </div>

                  {purchase.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Descripción</p>
                      <p className="text-gray-700">{purchase.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Cantidad</p>
                    <p className="font-semibold">
                      {purchase.quantity} {purchase.unity ? getUnityLabel(purchase.unity) : ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Categoría</p>
                    <Badge className={`${getCategoryColor(purchase.category)} text-white`}>
                      {getCategoryLabel(purchase.category)}
                    </Badge>
                  </div>

                  {purchase.priority && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Prioridad</p>
                      <Badge className={`${getPriorityColor(purchase.priority)} text-white`}>
                        {purchase.priority.charAt(0).toUpperCase() + purchase.priority.slice(1)}
                      </Badge>
                    </div>
                  )}

                  {purchase.price !== undefined && purchase.price > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Precio Estimado</p>
                        <p className="font-semibold text-lg">${purchase.price.toLocaleString()}</p>
                      </div>

                      <div className="col-span-2 pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-1">Total Estimado</p>
                        <p className="font-bold text-2xl text-blue-600">
                          ${(purchase.price * purchase.quantity).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Proveedor */}
            {purchase.supplier && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{purchase.supplier}</p>
                </CardContent>
              </Card>
            )}

            {/* Fechas */}
            {(purchase.purchase_date || purchase.delivery_date || purchase.created_at) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Fechas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purchase.created_at && (
                    <div>
                      <p className="text-sm text-gray-500">Fecha de solicitud</p>
                      <p className="font-semibold">
                        <ClientDate iso={purchase.created_at} locale="es-AR" options={{ year: 'numeric', month: 'long', day: 'numeric' }} fallback="N/D" />
                      </p>
                    </div>
                  )}

                  {purchase.purchase_date && (
                    <div>
                      <p className="text-sm text-gray-500">Fecha de compra</p>
                      <p className="font-semibold">
                        <ClientDate iso={purchase.purchase_date} locale="es-AR" options={{ year: 'numeric', month: 'long', day: 'numeric' }} fallback="N/D" />
                      </p>
                    </div>
                  )}

                  {purchase.delivery_date && (
                    <div>
                      <p className="text-sm text-gray-500">Fecha de entrega</p>
                      <p className="font-semibold">
                        <ClientDate iso={purchase.delivery_date} locale="es-AR" options={{ year: 'numeric', month: 'long', day: 'numeric' }} fallback="N/D" />
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Imágenes */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Imágenes ({images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img, index) => (
                      <div key={img.id || index} className="aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={img.image_url}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(img.image_url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/components/ui/alert-dialog";

interface UpdateDetail {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  user_name?: string;
  user_id?: string;
  created_at?: string;
}

export default function UpdateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<UpdateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verificar si el usuario es el autor
  console.log("🔍 Web Auth Check:");
  console.log("- user object:", user);
  console.log("- data object:", data);
  console.log("- user exists:", !!user);
  console.log("- data exists:", !!data);
  console.log("- user.id:", user?.id);
  console.log("- data.user_id:", data?.user_id);
  console.log("- Types - user.id:", typeof user?.id, "data.user_id:", typeof data?.user_id);
  console.log("- Strict equality:", user?.id === data?.user_id);
  
  // Intentar múltiples formas de verificar la autoría
  const isAuthor = user && data && (
    user.id === data.user_id ||
    String(user.id) === String(data.user_id)
  );
  
  console.log("- Final isAuthor:", isAuthor);
  console.log("=".repeat(50));

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const url = `${apiUrl}/updates/${id}`;
      
      const res = await fetch(url, { 
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al eliminar");
      }
      
      setShowDeleteDialog(false);
      router.push("/updates");
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("No se pudo eliminar el avance");
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/updates/edit/${id}`);
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const url = `${apiUrl}/updates/${id}`;
        
        const res = await fetch(url, { 
          cache: "no-store",
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el avance");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando avance...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Error</p>
          <p className="text-gray-600 text-sm mb-4">
            {error || "No se pudo cargar el avance"}
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Detalle de avance</p>
          <h1 className="text-lg font-semibold text-gray-800 line-clamp-1">
            {data.title}
          </h1>
        </div>
        
        {/* Menú de opciones (solo para el autor) */}
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Opciones"
              >
                <MoreVertical className="w-5 h-5 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar avance
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar avance
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {data.image_url && (
          <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <Image
              src={data.image_url}
              alt={data.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">{data.title}</h2>
          <p className="text-gray-600 leading-6 whitespace-pre-wrap">
            {data.description || "Sin descripción"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase">Autor</p>
            <p className="text-gray-800 font-medium">{data.user_name || "Usuario"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Creado</p>
            <p className="text-gray-800 font-medium">
              {data.created_at ? new Date(data.created_at).toLocaleString() : "N/D"}
            </p>
          </div>
        </div>
      </main>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar avance?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El avance será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

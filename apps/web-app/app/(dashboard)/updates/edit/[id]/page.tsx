"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Loader2, X, AlertCircle } from "lucide-react";
import Sidebar from "@/components/SideBar";

interface UpdateData {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  user_id?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function EditUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpdate = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        const url = API_URL ? `${API_URL}/updates/${id}` : `/api/updates/${id}`;
        const res = await fetch(url, { cache: "no-store" });
        
        if (!res.ok) throw new Error("No se pudo cargar el avance");
        
        const data: UpdateData = await res.json();
        
        // Verificar que el usuario sea el autor
        if (user && data.user_id && user.id !== data.user_id && String(user.id) !== String(data.user_id)) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permiso para editar este avance",
            variant: "destructive",
          });
          router.push(`/updates/${id}`);
          return;
        }
        
        setTitle(data.title);
        setDescription(data.description || "");
        if (data.image_url) {
          setExistingImageUrl(data.image_url);
          setPreviewUrl(data.image_url);
        }
      } catch (err) {
        console.error("Error al cargar avance:", err);
        setError("No se pudo cargar el avance");
      } finally {
        setLoadingData(false);
      }
    };

    fetchUpdate();
  }, [id, user, router, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingImageUrl(null);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const MAX_WIDTH = 1000;
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
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = url;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      let imageUrl = existingImageUrl;
      
      // Si hay una nueva imagen, comprimirla
      if (selectedFile) {
        const compressedBase64 = await compressImage(selectedFile);
        imageUrl = compressedBase64;
      }

      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl || undefined,
      };

      const url = API_URL ? `${API_URL}/updates/${id}` : `/api/updates/${id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar el avance");
      }

      toast({
        title: "Avance actualizado",
        description: "Los cambios se han guardado correctamente",
      });

      router.push(`/updates/${id}`);
    } catch (error) {
      console.error("Error al actualizar avance:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el avance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando avance...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className="text-gray-800 font-semibold mb-2">Error</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.back()}>Volver</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-6 ml-64">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Editar Avance</h1>
            <p className="text-gray-600 mt-2">
              Actualiza la información del avance
            </p>
          </div>

          {/* Formulario */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Avance</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ej: Instalación de ventanas completada"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe el avance realizado..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Imagen */}
                <div className="space-y-2">
                  <Label>Imagen (opcional)</Label>
                  
                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Haz clic para seleccionar una imagen
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          PNG, JPG hasta 10MB
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full rounded-lg object-cover max-h-96"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Clipboard, Loader2, Upload, X, Camera, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/VideoCard";
import NotificationCard from "@/components/NotificationCard";
import NoMediaCard from "@/components/NoMediaCard";
import { useUpdates } from "@/hooks/useUpdates";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { Dialog as DetailDialog, DialogContent as DetailContent, DialogHeader as DetailHeader, DialogTitle as DetailTitle } from "@/components/ui/dialog";

// Interfaz para los updates de la API
interface ApiUpdate {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  created_at: string;
  image_url?: string;
  project_id?: string;
}

const AvancesScreen = () => {
  const { updates, loading, error, fetchUpdates, createUpdate, clearError, selectedSiteId } = useUpdates();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const normalizedRole = role?.toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const router = useRouter();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [localSiteId, setLocalSiteId] = useState<string>("");

  // Estado para el formulario
  const [newUpdate, setNewUpdate] = useState({
    title: "",
    description: "",
    media_type: null as "video" | "image" | null,
    image_url: "",
  });
  
  // Estado para manejar la carga de archivos
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ApiUpdate | null>(null);

  const normalizeText = (text?: string | null) => {
    if (!text) return text || "";
    try {
      // Si llega doblemente codificado (Instalación) lo corregimos
      return decodeURIComponent(escape(text));
    } catch {
      return text;
    }
  };

  const compressImageFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
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
        const dataUrl = canvas.toDataURL(file.type || "image/jpeg", 0.6);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo cargar la imagen"));
      };
      img.src = url;
    });

  // Cargar updates al montar el componente
  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (siteId) {
      setLocalSiteId(siteId);
      fetchUpdates(siteId);
    }
  }, [fetchUpdates]);

  // Listen for site changes and refresh data
  useEffect(() => {
    const handleSiteChange = () => {
      const newSiteId = localStorage.getItem("selectedSiteId");
      if (newSiteId && newSiteId !== localSiteId) {
        setLocalSiteId(newSiteId);
        fetchUpdates(newSiteId);
      }
    };

    // Listen for storage events (when localStorage changes)
    window.addEventListener("storage", handleSiteChange);
    
    // Also check periodically for changes within the same tab
    const intervalId = setInterval(handleSiteChange, 500);

    return () => {
      window.removeEventListener("storage", handleSiteChange);
      clearInterval(intervalId);
    };
  }, [localSiteId, fetchUpdates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUpdates();
    } catch (error) {
      console.error("Error refreshing updates:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setNewUpdate({
      title: "",
      description: "",
      media_type: null,
      image_url: "",
    });
    setFileSelected(false);
    setFileName("");
  };

  const handleAddUpdate = () => {
    if (!isAdmin || roleLoading) return;
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmitUpdate = async () => {
    if (!newUpdate.title) {
      toast({
        title: "Falta informaci├│n",
        description: "Por favor ingresa al menos un t├¡tulo para el avance.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await createUpdate({
        title: newUpdate.title,
        description: newUpdate.description || "",
        user_id: user?.id,
        site_id: selectedSiteId,
        image_url: newUpdate.image_url || "",
      });

      toast({
        title: "┬í├ëxito!",
        description: "Avance creado correctamente.",
      });

      handleCloseModal();
    } catch (error) {
      console.error("Error creating update:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el avance. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!(e.target.files && e.target.files[0])) return;

    const file = e.target.files[0];
    const fileType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : null;

    setFileName(file.name);
    setFileSelected(true);

    if (fileType === "image") {
      compressImageFile(file)
        .then((dataUrl) => {
          setNewUpdate((prev) => ({
            ...prev,
            media_type: "image",
            image_url: dataUrl,
          }));
        })
        .catch(() => {
          setNewUpdate((prev) => ({
            ...prev,
            media_type: "image",
          }));
          toast({
            title: "Error",
            description: "No se pudo procesar la imagen seleccionada.",
            variant: "destructive",
          });
        });
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        setNewUpdate((prev) => ({
          ...prev,
          media_type: fileType as "image" | "video" | null,
          image_url: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNoMediaPress = (id: string) => {
    const current = updates.find((u) => u.id === id);
    setDetailData(current || null);
    setDetailOpen(true);
  };

  // Loading state
  if (loading && updates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando avances...</p>
        </div>
      </div>
    );
  }

  // Formatear tiempo relativo
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `Hace ${diffInDays} d├¡a${diffInDays > 1 ? "s" : ""}`;
    } else if (diffInHours > 0) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? "s" : ""}`;
    } else {
      return "Hace un momento";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <div className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Avances</h1>
          {!roleLoading && isAdmin && (
            <Button
              onClick={handleAddUpdate}
              className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6 h-10"
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Avance
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearError}
                className="ml-2"
              >
                Cerrar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <div className="pt-25 px-40 py-6 space-y-4 pb-20">
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Clipboard className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No hay avances a├║n
              </h3>
              <p className="text-gray-400 text-center px-6">
                Crea tu primer avance usando el bot├│n +
              </p>
            </div>
          ) : (
            <>
              {/* Notification card */}
              <NotificationCard
                message={normalizeText("Se ha terminado")}
                highlight={normalizeText("Instalación del aire")}
              />

              {/* Remaining cards */}
              {updates.map((update) => {
                // Mostrar el nombre del usuario si es su propio update, o usar el user_name guardado, o "Usuario"
                const authorName = update.user_id === user?.id 
                  ? (user?.name || "Usuario")
                  : (update.user_name || "Usuario");
                
                const safeTitle = normalizeText(update.title);
                const safeDescription = normalizeText(update.description);
                const safeAuthor = normalizeText(authorName);
                return update.image_url ? (
                  <VideoCard
                    key={update.id}
                    title={safeTitle}
                    author={safeAuthor}
                    timeAgo={formatTimeAgo(update.created_at)}
                    imageUrl={update.image_url}
                    onPress={() => handleNoMediaPress(update.id)}
                  />
                ) : (
                  <NoMediaCard
                    key={update.id}
                    title={safeTitle}
                    description={safeDescription}
                    author={safeAuthor}
                    timeAgo={formatTimeAgo(update.created_at)}
                    onPress={() => handleNoMediaPress(update.id)}
                  />
                );
              })}

              {/* Loading indicator cuando se est├ín cargando m├ís updates */}
              {loading && updates.length > 0 && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Refresh Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleRefresh}
            size="icon"
            variant="outline"
            className="w-12 h-12 rounded-full bg-white shadow-lg"
            disabled={refreshing || loading}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Modal para crear un nuevo avance */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">Crear Nuevo Avance</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* T├¡tulo */}
            <div className="space-y-2">
              <Label htmlFor="title">Título <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Título del avance"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                className="w-full"
              />
            </div>
            
            {/* Descripci├│n */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el avance con más detalles..."
                value={newUpdate.description}
                onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                rows={4}
                className="w-full"
              />
            </div>
            
            {/* Tipo de contenido */}
            <div className="space-y-2">
              <Label>Tipo de contenido</Label>
              <RadioGroup 
                value={newUpdate.media_type || "none"} 
                onValueChange={(value) => setNewUpdate({ 
                  ...newUpdate, 
                  media_type: value === "none" ? null : value as "image" | "video" 
                })}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="r1" />
                  <Label htmlFor="r1">Sin contenido</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="r2" />
                  <Label htmlFor="r2">Imagen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="r3" />
                  <Label htmlFor="r3">Video</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Subida de archivo */}
            {newUpdate.media_type && (
              <div className="space-y-2">
                <Label htmlFor="media">{newUpdate.media_type === "image" ? "Imagen" : "Video"}</Label>
                <div className="flex items-center justify-center w-full">
                  <label 
                    htmlFor="dropzone-file" 
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
                      fileSelected 
                        ? "bg-blue-50 border-blue-300" 
                        : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {fileSelected ? (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="flex items-center mb-2">
                          {newUpdate.media_type === "image" ? (
                            <Camera className="w-6 h-6 text-blue-500 mr-2" />
                          ) : (
                            <Video className="w-6 h-6 text-blue-500 mr-2" />
                          )}
                          <span className="text-sm text-blue-500 truncate max-w-[200px]">{fileName}</span>
                        </div>
                        <p className="text-xs text-gray-500">Haz clic para cambiar el archivo</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {newUpdate.media_type === "image" 
                            ? "PNG, JPG o GIF (m├íx. 10MB)" 
                            : "MP4, MOV o WebM (m├íx. 50MB)"}
                        </p>
                      </div>
                    )}
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      accept={newUpdate.media_type === "image" 
                        ? "image/png, image/jpeg, image/gif" 
                        : "video/mp4, video/quicktime, video/webm"}
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitUpdate} 
              className="w-full sm:w-auto"
              disabled={isSubmitting || !newUpdate.title}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Avance"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle de avance en modal */}
      <DetailDialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DetailContent className="sm:max-w-lg">
          <DetailHeader>
            <DetailTitle className="text-xl font-semibold">
              {detailData ? normalizeText(detailData.title) : "Detalle de avance"}
            </DetailTitle>
          </DetailHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              {detailData?.created_at
                ? new Date(detailData.created_at).toLocaleString()
                : ""}
            </div>
            <p className="text-gray-700 leading-6">
              {detailData ? normalizeText(detailData.description) : "Sin Descripci\u00f3n"}
            </p>
            {detailData?.image_url && (
              <div className="relative w-full overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={detailData.image_url}
                  alt={detailData.title}
                  className="w-full object-cover max-h-80"
                />
              </div>
            )}
          </div>
        </DetailContent>
      </DetailDialog>
      </main>
    </div>
  );
};

export default AvancesScreen;

























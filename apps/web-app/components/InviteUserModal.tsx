"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteUserModalProps {
  siteId: string;
  siteName: string;
  trigger?: React.ReactNode;
}

export function InviteUserModal({ siteId, siteName, trigger }: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "client">("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("El email es obligatorio");
      return;
    }

    if (!validateEmail(email)) {
      setError("El email no es válido");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          site_id: siteId,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar la invitación");
      }

      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${email}`,
        variant: "success",
      });

      setEmail("");
      setRole("client");
      setIsOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al enviar la invitación";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Invitar Usuario a la Obra
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Invita a un usuario a colaborar en <span className="font-semibold">{siteName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="email">
              Email del usuario <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={`mt-2 ${error ? "border-red-500" : ""}`}
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <Label htmlFor="role">
              Rol en la obra <span className="text-red-500">*</span>
            </Label>
            <Select
              value={role}
              onValueChange={(value: "admin" | "client") => setRole(value)}
              disabled={loading}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {role === "admin"
                ? "Podrá crear y gestionar tareas"
                : "Podrá ver el progreso y crear solicitudes de cambio"}
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setEmail("");
                setError("");
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

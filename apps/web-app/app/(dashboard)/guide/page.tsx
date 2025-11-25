"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  ArrowRight,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Sidebar from "@/components/SideBar";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier } from "@/lib/types/supplier";

export default function GuiaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Usar el hook en lugar de data hardcodeada
  const { suppliers, loading, error } = useSuppliers();

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSupplierClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Guía de Proveedores
          </h1>
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              placeholder="Buscar por material, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando proveedores...</span>
          </div>
        )}

        {/* Estado de error */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Error al cargar proveedores</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de proveedores */}
        {!loading && !error && (
          <>
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No se encontraron proveedores</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={supplier.image || "/placeholder.svg"}
                            alt={supplier.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {supplier.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {supplier.category}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSupplierClick(supplier)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ArrowRight size={20} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Supplier Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedSupplier && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {selectedSupplier.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Header with image and basic info */}
                  <div className="flex gap-6">
                    <img
                      src={selectedSupplier.image || "/placeholder.svg"}
                      alt={selectedSupplier.name}
                      className="w-48 h-32 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <Badge className="mb-2">
                        {selectedSupplier.category}
                      </Badge>
                      <p className="text-gray-600">
                        {selectedSupplier.description}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">
                        Información de Contacto
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={16} className="text-gray-400" />
                          <span>{selectedSupplier.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={16} className="text-gray-400" />
                          <span>{selectedSupplier.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={16} className="text-gray-400" />
                          <span>{selectedSupplier.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Globe size={16} className="text-gray-400" />
                          <span className="text-blue-600">
                            {selectedSupplier.website}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
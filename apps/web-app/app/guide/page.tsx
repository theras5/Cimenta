"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Phone, Mail, Globe, ArrowRight, Search } from "lucide-react"
import Sidebar from "@/components/sidebar"

interface Supplier {
  id: string
  name: string
  category: string
  rating: number
  address: string
  phone: string
  email: string
  website: string
  materials: string[]
  description: string
  image: string
  reviews: Review[]
}

interface Review {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

const suppliers: Supplier[] = [
  {
    id: "1",
    name: "Materiales González",
    category: "Canalones y cemento",
    rating: 4.8,
    address: "Av. Construcción 1234, Buenos Aires",
    phone: "+54 11 4567-8901",
    email: "info@materialesgonzalez.com",
    website: "www.materialesgonzalez.com",
    materials: ["Cemento Portland", "Canalones de aluminio", "Ladrillos", "Arena", "Piedra"],
    description:
      "Empresa familiar con más de 30 años de experiencia en materiales de construcción. Especialistas en cemento de alta calidad y sistemas de canalones.",
    image: "/construction-materials-warehouse.jpg",
    reviews: [
      {
        id: "1",
        author: "Carlos Mendez",
        rating: 5,
        comment: "Excelente calidad y servicio. Muy recomendable.",
        date: "2025-09-20",
      },
      { id: "2", author: "Ana Rodriguez", rating: 4, comment: "Buenos precios y entrega puntual.", date: "2025-09-15" },
    ],
  },
  {
    id: "2",
    name: "Eléctricos del Norte",
    category: "Materiales eléctricos",
    rating: 4.5,
    address: "Calle Voltaje 567, Córdoba",
    phone: "+54 351 123-4567",
    email: "ventas@electricosdelnorte.com",
    website: "www.electricosdelnorte.com",
    materials: ["Cables eléctricos", "Interruptores", "Tomas corriente", "Tableros eléctricos", "Iluminación LED"],
    description:
      "Distribuidores autorizados de las mejores marcas en materiales eléctricos. Asesoramiento técnico especializado.",
    image: "/electrical-supplies-store.jpg",
    reviews: [
      {
        id: "3",
        author: "Miguel Torres",
        rating: 4,
        comment: "Buen stock y asesoramiento técnico.",
        date: "2025-09-18",
      },
      {
        id: "4",
        author: "Laura Vega",
        rating: 5,
        comment: "Precios competitivos y excelente atención.",
        date: "2025-09-12",
      },
    ],
  },
  {
    id: "3",
    name: "Pinturas Premium",
    category: "Pinturas y acabados",
    rating: 4.7,
    address: "Av. Color 890, Rosario",
    phone: "+54 341 987-6543",
    email: "contacto@pinturaspremium.com",
    website: "www.pinturaspremium.com",
    materials: ["Pintura exterior", "Pintura interior", "Esmaltes", "Barnices", "Impermeabilizantes"],
    description:
      "Especialistas en pinturas de alta gama para interiores y exteriores. Amplia gama de colores y acabados especiales.",
    image: "/paint-store-colorful.jpg",
    reviews: [
      {
        id: "5",
        author: "Roberto Silva",
        rating: 5,
        comment: "Excelente calidad de pinturas, muy duraderas.",
        date: "2025-09-22",
      },
      {
        id: "6",
        author: "Patricia López",
        rating: 4,
        comment: "Gran variedad de colores y buen precio.",
        date: "2025-09-10",
      },
    ],
  },
  {
    id: "4",
    name: "Sanitarios Modernos",
    category: "Plomería y sanitarios",
    rating: 4.3,
    address: "Calle Agua 456, Mendoza",
    phone: "+54 261 555-0123",
    email: "info@sanitariosmodernos.com",
    website: "www.sanitariosmodernos.com",
    materials: ["Inodoros", "Lavatorios", "Grifería", "Tuberías PVC", "Accesorios de baño"],
    description: "Todo en sanitarios y plomería. Marcas reconocidas con garantía extendida y servicio de instalación.",
    image: "/bathroom-fixtures-showroom.jpg",
    reviews: [
      {
        id: "7",
        author: "Fernando Ruiz",
        rating: 4,
        comment: "Buenos productos, instalación profesional.",
        date: "2025-09-16",
      },
      {
        id: "8",
        author: "Claudia Morales",
        rating: 4,
        comment: "Variedad de estilos y precios accesibles.",
        date: "2025-09-08",
      },
    ],
  },
  {
    id: "5",
    name: "Herramientas Pro",
    category: "Herramientas y equipos",
    rating: 4.6,
    address: "Industrial Park 123, La Plata",
    phone: "+54 221 444-7890",
    email: "ventas@herramientaspro.com",
    website: "www.herramientaspro.com",
    materials: ["Taladros", "Sierras", "Martillos", "Niveles", "Equipos de seguridad"],
    description:
      "Herramientas profesionales para construcción. Venta y alquiler de equipos con servicio técnico especializado.",
    image: "/construction-tools-workshop.jpg",
    reviews: [
      {
        id: "9",
        author: "Diego Fernández",
        rating: 5,
        comment: "Herramientas de primera calidad, muy duraderas.",
        date: "2025-09-25",
      },
      {
        id: "10",
        author: "Mónica Castro",
        rating: 4,
        comment: "Buen servicio de alquiler y mantenimiento.",
        date: "2025-09-14",
      },
    ],
  },
  {
    id: "6",
    name: "Maderas del Sur",
    category: "Maderas y carpintería",
    rating: 4.4,
    address: "Ruta Nacional 40 Km 15, Bariloche",
    phone: "+54 294 333-2211",
    email: "info@maderasdelsur.com",
    website: "www.maderasdelsur.com",
    materials: ["Madera de pino", "Tablones de roble", "MDF", "Placas OSB", "Molduras"],
    description: "Maderas seleccionadas de la Patagonia. Cortes a medida y asesoramiento en proyectos de carpintería.",
    image: "/lumber-yard-wood-planks.jpg",
    reviews: [
      {
        id: "11",
        author: "Alejandro Paz",
        rating: 4,
        comment: "Madera de excelente calidad, bien estacionada.",
        date: "2025-09-19",
      },
      {
        id: "12",
        author: "Valeria Soto",
        rating: 5,
        comment: "Servicio personalizado y entregas puntuales.",
        date: "2025-09-11",
      },
    ],
  },
]

export default function GuiaPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.materials.some((material) => material.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ))
  }

  const handleSupplierClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDetailOpen(true)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Guía de Proveedores</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Buscar por material, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={supplier.image || "/placeholder.svg"}
                      alt={supplier.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                      <p className="text-sm text-gray-600">{supplier.category}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(supplier.rating)}
                        <span className="text-sm text-gray-500 ml-1">({supplier.rating})</span>
                      </div>
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

        {/* Supplier Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedSupplier && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedSupplier.name}</DialogTitle>
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
                      <Badge className="mb-2">{selectedSupplier.category}</Badge>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(selectedSupplier.rating)}
                        <span className="text-sm text-gray-500 ml-1">({selectedSupplier.rating})</span>
                      </div>
                      <p className="text-gray-600">{selectedSupplier.description}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Información de Contacto</h3>
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
                          <span className="text-blue-600">{selectedSupplier.website}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Materiales que Provee</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.materials.map((material, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reviews */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Comentarios y Reseñas</h3>
                    <div className="space-y-4">
                      {selectedSupplier.reviews.map((review) => (
                        <div key={review.id} className="border-l-4 border-blue-200 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{review.author}</span>
                              <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                            </div>
                            <span className="text-xs text-gray-500">{review.date}</span>
                          </div>
                          <p className="text-sm text-gray-600">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

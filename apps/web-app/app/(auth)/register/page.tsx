// apps/web-app/app/(auth)/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const { register, loading, error, clearError } = useAuth()
  const router = useRouter()

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) clearError() // Clear error when user starts typing
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      // No podemos usar setError aquí porque usamos el hook useAuth
      // En su lugar, podríamos mostrar una alerta o manejar esto de otra manera
      return
    }

    if (!validatePassword(formData.password)) {
      // Similar aquí, necesitarías manejar esto a través del hook o estado local
      return
    }

    if (formData.password !== formData.confirmPassword) {
      // Similar aquí
      return
    }

    try {
      // Usar el hook de autenticación para registrar
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.fullName
      })
      
      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/select-site") 
      }, 2000)
    } catch (error) {
      // El error ya se maneja en el hook useAuth
      console.error('Registration failed:', error)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#cde8fe' }}>
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Cuenta creada!</h2>
            <p className="text-gray-600 text-center mb-4">
              Tu cuenta ha sido creada exitosamente
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo al dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image 
          src="/loginWolf.png" 
          alt="Cimenta Mascot" 
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center p-4 lg:p-12" style={{ backgroundColor: '#cee8ff' }}>
        <div className="w-full max-w-md" style={{ marginLeft: '20px' }}>
          {/* Mobile Logo - Only visible on small screens */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Cimenta</h1>
            <p className="text-gray-600">Crea tu cuenta y comienza a gestionar</p>
          </div>

          {/* Register Form */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
              <CardDescription className="text-center">
                Completa los datos para registrarte
              </CardDescription>
            </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Full Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre completo
                </label>
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-12"
                  disabled={loading}
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-12"
                  disabled={loading}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="h-12 pr-12"
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 w-12 px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Mínimo 6 caracteres
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className={`h-12 pr-12 ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? 'border-red-300 focus:border-red-500' 
                        : ''
                    }`}
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 w-12 px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={
                  loading || 
                  !formData.fullName || 
                  !formData.email || 
                  !formData.password || 
                  !formData.confirmPassword ||
                  formData.password !== formData.confirmPassword ||
                  !validatePassword(formData.password)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear Cuenta"
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes cuenta?{" "}
                  <Link 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
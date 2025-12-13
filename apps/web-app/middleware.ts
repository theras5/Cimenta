import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/select-site'];

// Rutas solo para invitados (no logueados)
const guestRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Obtener token de las cookies (si usás cookies) o headers
  // Nota: localStorage no está disponible en middleware
  // Si usás localStorage en el cliente, esta lógica debe estar en los componentes
  
  // Por ahora, dejamos que los guards del cliente manejen la autenticación
  // Este middleware puede usarse para otras validaciones server-side
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};

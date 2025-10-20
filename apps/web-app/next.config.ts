import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Permitir builds exitosos incluso con errores de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Deshabilitar ESLint durante el build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

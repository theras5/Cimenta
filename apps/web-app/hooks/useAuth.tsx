// apps/web-app/hooks/useAuth.tsx
"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { authService, User, LoginData, RegisterData } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Cambiado a false ya que no verificamos automáticamente
  const [error, setError] = useState<string | null>(null);

  // Al montar, intentar cargar el usuario guardado en localStorage
  useEffect(() => {
    try {
      const saved = authService.getUser();
      if (saved) setUser(saved);
    } catch (e) {
      console.error('Error cargando usuario desde localStorage', e);
    }
  }, []);

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.login(data);
      
      authService.saveToken(result.token);
      authService.saveUser(result.user);
      setUser(result.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.register(data);
      
      authService.saveToken(result.token);
      authService.saveUser(result.user);
      setUser(result.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al registrarse';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
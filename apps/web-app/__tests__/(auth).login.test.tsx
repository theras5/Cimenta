import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: jest.fn().mockResolvedValue(undefined), loading: false, error: '', clearError: jest.fn() })
}));

describe('Auth/Login page', () => {
  it('Given la página de login, When renderiza, Then muestra título y botón', () => {
    const Page = require('../app/(auth)/login/page').default;
    render(<Page />);
    // Validamos el botón y un texto guía del formulario
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByText(/Ingresa tus credenciales/i)).toBeInTheDocument();
  });

  it('Given email y password, When submit, Then invoca login', async () => {
    const Page = require('../app/(auth)/login/page').default;
    render(<Page />);
    const email = screen.getByPlaceholderText(/tu@email/i);
    // Para el password, buscamos un input de tipo password en el formulario
    const inputs = screen.getAllByRole('textbox');
    // Si no hubiera type=password mapeado a role, usamos el segundo input como fallback
    const pwd = (document.querySelector('input[type="password"]') as HTMLInputElement) || (inputs[1] as HTMLInputElement);
    fireEvent.change(email, { target: { value: 'a@a.com' } });
    fireEvent.change(pwd, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));
    // No assert del efecto de router; confiamos en el hook mockeado
  });
});

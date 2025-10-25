import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } })
}));

const createSiteMock = jest.fn().mockResolvedValue({ id: 's2', address: 'Calle 123' });
jest.mock('@/hooks/useSites', () => ({
  useSites: () => ({
    sites: [{ id: 's1', address: 'Obra 1' }],
    loading: false,
    error: '',
    loadUserSites: jest.fn(),
    createSite: createSiteMock,
  })
}));

describe('Auth/SelectSite page', () => {
  beforeEach(() => { pushMock.mockClear(); createSiteMock.mockClear(); });

  it('Given sitios cargados, When renderiza, Then muestra “Mis Obras” y una obra', () => {
    const Page = require('../app/(auth)/select-site/page').default;
    render(<Page />);
    expect(screen.getByText(/Mis Obras/i)).toBeInTheDocument();
    expect(screen.getByText(/Obra 1/i)).toBeInTheDocument();
  });

  it('Given una obra, When click en la card, Then navega al dashboard', () => {
    const Page = require('../app/(auth)/select-site/page').default;
    render(<Page />);
    fireEvent.click(screen.getByText(/Obra 1/i));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('Given “Añadir obra”, When abrir modal y crear, Then llama createSite', async () => {
    const Page = require('../app/(auth)/select-site/page').default;
    const { container } = render(<Page />);
    fireEvent.click(screen.getByText(/Añadir obra/i));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const address = (dialog.querySelector('input#address') as HTMLInputElement) || (container.querySelector('input#address') as HTMLInputElement);
    fireEvent.change(address, { target: { value: 'Calle 123' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear$/i }));
    // Esperar a que se resuelvan los updates asíncronos (setState en try/finally)
    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => expect(createSiteMock).toHaveBeenCalledWith({ address: 'Calle 123', role: 'client', user_id: 'u1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

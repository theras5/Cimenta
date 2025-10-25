import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

const registerMock = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ register: registerMock, loading: false, error: '', clearError: jest.fn() })
}));

describe('Auth/Register page', () => {
  beforeEach(() => registerMock.mockClear());

  it('Given el formulario de registro, When renderiza, Then muestra “Crear Cuenta”', () => {
    const Page = require('../app/(auth)/register/page').default;
    render(<Page />);
    expect(screen.getByRole('button', { name: /Crear Cuenta/i })).toBeInTheDocument();
  });

  it('Given datos válidos, When submit, Then invoca register y muestra éxito', async () => {
    const Page = require('../app/(auth)/register/page').default;
    const { container } = render(<Page />);

    const inputs = screen.getAllByRole('textbox');
    const fullName = inputs[0];
    const email = inputs[1];
    const [pwd, confirm] = Array.from(container.querySelectorAll('input[type="password"]')) as HTMLInputElement[];

    fireEvent.change(fullName, { target: { value: 'Alice Doe' } });
    fireEvent.change(email, { target: { value: 'a@a.com' } });
    fireEvent.change(pwd, { target: { value: 'secret1' } });
    fireEvent.change(confirm, { target: { value: 'secret1' } });

    const submit = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submit);

    expect(registerMock).toHaveBeenCalledWith({ email: 'a@a.com', password: 'secret1', name: 'Alice Doe' });
    expect(await screen.findByText(/Cuenta creada/i)).toBeInTheDocument();
  });
});


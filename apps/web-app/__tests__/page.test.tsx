import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() })
}));

describe('CimentaDashboard (app/page.tsx)', () => {
  it("Given la página de inicio, When renderizo, Then muestra 'Redirigiendo'", () => {
    // Given: componente de la página principal
    const Page = require('../app/page').default;
    
    // When: se renderiza el componente
    render(<Page />);

    // Then: aparece el texto de redirección
    expect(screen.getByText(/Redirigiendo/i)).toBeInTheDocument();
  });
});

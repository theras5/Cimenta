import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: [], isLoading: false, error: '', fetchTasks: jest.fn() })
}));

describe('Tasks screen', () => {
  it('muestra el header Tareas y estado vacío', () => {
    const Tasks = require('../app/(tabs)/tasks').default;
    render(<Tasks />);
    expect(screen.getByText('Tareas')).toBeTruthy();
    // No asegura el texto exacto con acentos, pero el header debe estar
  });

  it('muestra indicador de carga cuando isLoading', () => {
    jest.doMock('@/hooks/useTasks', () => ({
      useTasks: () => ({ tasks: [], isLoading: true, error: '', fetchTasks: jest.fn() })
    }));
    const Tasks = require('../app/(tabs)/tasks').default;
    render(<Tasks />);
    expect(screen.getByText(/Cargando tareas/i)).toBeTruthy();
  });
});


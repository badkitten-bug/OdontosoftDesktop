import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DynamicForm from '../../components/DynamicForm';

// Mock de electronAPI
global.window.electronAPI = {
  getCamposDinamicos: jest.fn(() => Promise.resolve([])),
};

describe('DynamicForm Component', () => {
  const mockCampos = [
    { id: 1, nombre_campo: 'Edad', tipo: 'number', required: false, name: 'edad', orden: 1, ancho: 100 },
    { id: 2, nombre_campo: 'Email', tipo: 'email', required: true, name: 'email', orden: 2, ancho: 100 },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza campos dinámicos correctamente', async () => {
    render(
      <DynamicForm
        entidad="pacientes"
        formData={{}}
        onChange={mockOnChange}
        camposDinamicosProp={mockCampos}
        skipLoad={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/edad/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test('actualiza el formData cuando se cambia un campo', async () => {
    render(
      <DynamicForm
        entidad="pacientes"
        formData={{}}
        onChange={mockOnChange}
        camposDinamicosProp={mockCampos}
        skipLoad={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/edad/i)).toBeInTheDocument();
    });
    
    const edadInput = screen.getByLabelText(/edad/i);
    fireEvent.change(edadInput, { target: { value: '25' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ edad: '25' })
    );
  });

  test('muestra campos requeridos con validación', async () => {
    render(
      <DynamicForm
        entidad="pacientes"
        formData={{}}
        onChange={mockOnChange}
        camposDinamicosProp={mockCampos}
        skipLoad={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('required');
  });
});


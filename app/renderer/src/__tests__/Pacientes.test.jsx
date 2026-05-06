import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Pacientes from '../pages/Pacientes';
import { UserProvider } from '../context/UserContext';
import * as dbService from '../services/dbService';

// Mock de los servicios
jest.mock('../services/dbService', () => ({
  getPacientes: jest.fn(),
  addPaciente: jest.fn(),
  updatePaciente: jest.fn(),
  deletePaciente: jest.fn(),
  getCamposDinamicos: jest.fn(),
  initCamposBase: jest.fn(),
}));

const mockPacientes = [
  { id: 1, nombre: 'Juan Pérez', dni: '12345678', telefono: '987654321', datos_extra: {} },
  { id: 2, nombre: 'María García', dni: '87654321', telefono: '123456789', datos_extra: {} },
];

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        {ui}
      </UserProvider>
    </BrowserRouter>
  );
};

describe('Pacientes Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbService.getPacientes.mockResolvedValue(mockPacientes);
    dbService.getCamposDinamicos.mockResolvedValue([]);
    dbService.initCamposBase.mockResolvedValue({});
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'admin', rol: 'admin' }));
  });

  test('carga y muestra la lista de pacientes', async () => {
    renderWithProviders(<Pacientes />);
    
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });
  });

  test('permite buscar pacientes', async () => {
    renderWithProviders(<Pacientes />);
    
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByText('María García')).not.toBeInTheDocument();
  });

  test('abre el modal para crear nuevo paciente', async () => {
    renderWithProviders(<Pacientes />);
    
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
    
    const newButton = screen.getByRole('button', { name: /nuevo paciente/i });
    fireEvent.click(newButton);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nuevo paciente/i })).toBeInTheDocument();
    });
  });

  test('muestra mensaje cuando no hay pacientes', async () => {
    dbService.getPacientes.mockResolvedValue([]);
    
    renderWithProviders(<Pacientes />);
    
    await waitFor(() => {
      expect(screen.getByText(/no hay pacientes registrados/i)).toBeInTheDocument();
    });
  });
});


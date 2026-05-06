import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { UserProvider } from '../context/UserContext';
import * as dbService from '../services/dbService';

jest.mock('../services/dbService', () => ({
  getCitasPorFecha: jest.fn(),
  getFacturas: jest.fn(),
  getPacientes: jest.fn(),
  getProductosStockBajo: jest.fn(),
}));

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        {ui}
      </UserProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbService.getCitasPorFecha.mockResolvedValue([]);
    dbService.getFacturas.mockResolvedValue([]);
    dbService.getPacientes.mockResolvedValue([]);
    dbService.getProductosStockBajo.mockResolvedValue([]);
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'admin', rol: 'admin' }));
  });

  test('muestra el título del dashboard', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  test('muestra las métricas principales', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /citas de hoy/i })).toBeInTheDocument();
      expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument();
      expect(screen.getByText('Pacientes')).toBeInTheDocument();
      expect(screen.getByText('Stock Bajo')).toBeInTheDocument();
    });
  });

  test('muestra citas de hoy cuando existen', async () => {
    const mockCitas = [
      { id: 1, paciente_nombre: 'Juan Pérez', hora_inicio: '09:00', odontologo_nombre: 'Dr. García', estado: 'programada' },
    ];
    dbService.getCitasPorFecha.mockResolvedValue(mockCitas);
    
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  test('muestra productos con stock bajo', async () => {
    const mockProductos = [
      { id: 1, nombre: 'Anestesia', stock: 5, stock_minimo: 10 },
    ];
    dbService.getProductosStockBajo.mockResolvedValue(mockProductos);
    
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Anestesia')).toBeInTheDocument();
    });
  });
});


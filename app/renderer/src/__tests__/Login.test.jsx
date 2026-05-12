import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { UserProvider } from '../context/UserContext';

jest.mock('../services/dbService', () => ({
  login: jest.fn(),
  existenUsuarios: jest.fn(),
  getUsuariosPublicos: jest.fn(),
}));

import { login, existenUsuarios, getUsuariosPublicos } from '../services/dbService';

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        {ui}
      </UserProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    existenUsuarios.mockResolvedValue({ existen: true });
    getUsuariosPublicos.mockResolvedValue([]);
  });

  test('renderiza el formulario de login', async () => {
    renderWithProviders(<Login />);

    expect(await screen.findByPlaceholderText(/ingresa tu usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ingresa tu contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  test('muestra error cuando las credenciales son incorrectas', async () => {
    login.mockResolvedValue({ success: false, error: 'Usuario o contraseña incorrectos' });

    renderWithProviders(<Login />);

    const usernameInput = await screen.findByPlaceholderText(/ingresa tu usuario/i);
    const passwordInput = screen.getByPlaceholderText(/ingresa tu contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/usuario o contraseña incorrectos/i)).toBeInTheDocument();
    });
  });

  test('inicia sesión exitosamente con credenciales correctas', async () => {
    const mockUser = { id: 1, username: 'admin', nombre: 'Admin', rol: 'admin' };
    login.mockResolvedValue({ success: true, usuario: mockUser });

    renderWithProviders(<Login />);

    const usernameInput = await screen.findByPlaceholderText(/ingresa tu usuario/i);
    const passwordInput = screen.getByPlaceholderText(/ingresa tu contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin', 'admin');
    });
  });

  test('valida que los campos sean requeridos', async () => {
    renderWithProviders(<Login />);

    const submitButton = await screen.findByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitButton);

    expect(login).not.toHaveBeenCalled();
  });
});

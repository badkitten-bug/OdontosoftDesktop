import '@testing-library/jest-dom';

// Mock de electronAPI para los tests
global.window = global.window || {};
global.window.electronAPI = {
  getPacientes: jest.fn(() => Promise.resolve([])),
  addPaciente: jest.fn(() => Promise.resolve({ id: 1, success: true })),
  updatePaciente: jest.fn(() => Promise.resolve({ success: true })),
  deletePaciente: jest.fn(() => Promise.resolve({ success: true })),
  getProductos: jest.fn(() => Promise.resolve([])),
  getCitas: jest.fn(() => Promise.resolve([])),
  getFacturas: jest.fn(() => Promise.resolve([])),
  login: jest.fn(() => Promise.resolve({ success: true, usuario: { id: 1, username: 'admin', nombre: 'Admin', rol: 'admin' } })),
  // Agregar más mocks según sea necesario
};

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}));


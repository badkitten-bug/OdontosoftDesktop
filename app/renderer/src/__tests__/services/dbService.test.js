import * as dbService from '../../services/dbService';

describe('dbService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPacientes retorna array vacío si electronAPI no está disponible', async () => {
    delete window.electronAPI;
    const pacientes = await dbService.getPacientes();
    expect(pacientes).toEqual([]);
  });

  test('getPacientes usa electronAPI cuando está disponible', async () => {
    const mockPacientes = [{ id: 1, nombre: 'Test' }];
    window.electronAPI = {
      getPacientes: jest.fn(() => Promise.resolve(mockPacientes)),
    };

    const pacientes = await dbService.getPacientes();
    expect(pacientes).toEqual(mockPacientes);
    expect(window.electronAPI.getPacientes).toHaveBeenCalled();
  });

  test('login maneja errores correctamente', async () => {
    window.electronAPI = {
      login: jest.fn(() => Promise.reject(new Error('Network error'))),
    };

    await expect(dbService.login('admin', 'admin')).rejects.toThrow('Network error');
  });
});


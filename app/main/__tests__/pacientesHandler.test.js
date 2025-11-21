const Database = require('better-sqlite3');

// Mock del módulo database ANTES de cargar los handlers
jest.mock('../db/database', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  
  // Crear tabla de pacientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      datos_extra TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  return {
    getDatabase: jest.fn(() => db),
    initDatabase: jest.fn(() => db),
    getDatabasePath: jest.fn(() => ':memory:'),
  };
});

const pacientesHandler = require('../ipcHandlers/pacientesHandler');
const dbModule = require('../db/database');

// Mock de ipcMain
const mockIpcMain = {
  handle: jest.fn(),
};

describe('Pacientes Handler', () => {
  let db;

  beforeAll(() => {
    // Obtener la base de datos del mock
    db = dbModule.getDatabase();
    
    // Limpiar tabla antes de comenzar
    db.exec('DELETE FROM pacientes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // Limpiar tablas antes de cada test
    db.exec('DELETE FROM pacientes');
    jest.clearAllMocks();
  });

  test('registra los handlers IPC correctamente', () => {
    pacientesHandler.register(mockIpcMain);
    
    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-pacientes', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('add-paciente', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('update-paciente', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('delete-paciente', expect.any(Function));
  });

  test('agrega un nuevo paciente correctamente', async () => {
    pacientesHandler.register(mockIpcMain);
    
    const addHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'add-paciente')[1];
    
    const result = await addHandler(null, {
      nombre: 'Test Paciente',
      dni: '12345678',
      telefono: '987654321',
      datos_extra: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    // Verificar que se guardó en la BD
    const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(result.id);
    expect(paciente.nombre).toBe('Test Paciente');
    expect(paciente.dni).toBe('12345678');
  });

  test('valida DNI único al agregar paciente', async () => {
    // Agregar primer paciente
    db.prepare('INSERT INTO pacientes (nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?)')
      .run('Paciente 1', '12345678', '111111111', '{}');
    
    pacientesHandler.register(mockIpcMain);
    const addHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'add-paciente')[1];
    
    // Intentar agregar paciente con mismo DNI
    await expect(
      addHandler(null, {
        nombre: 'Paciente 2',
        dni: '12345678',
        telefono: '222222222',
        datos_extra: {},
      })
    ).rejects.toThrow('Ya existe un paciente con este DNI');
  });

  test('obtiene lista de pacientes', async () => {
    // Agregar pacientes de prueba
    db.prepare('INSERT INTO pacientes (nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?)')
      .run('Paciente 1', '11111111', '111111111', '{}');
    db.prepare('INSERT INTO pacientes (nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?)')
      .run('Paciente 2', '22222222', '222222222', '{}');
    
    pacientesHandler.register(mockIpcMain);
    const getHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'get-pacientes')[1];
    
    const pacientes = await getHandler();
    
    expect(pacientes).toHaveLength(2);
    expect(pacientes[0].nombre).toBe('Paciente 1');
    expect(pacientes[1].nombre).toBe('Paciente 2');
  });

  test('elimina un paciente correctamente', async () => {
    // Agregar paciente
    const result = db.prepare('INSERT INTO pacientes (nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?)')
      .run('Paciente a eliminar', '99999999', '999999999', '{}');
    const pacienteId = result.lastInsertRowid;
    
    pacientesHandler.register(mockIpcMain);
    const deleteHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'delete-paciente')[1];
    
    const deleteResult = await deleteHandler(null, pacienteId);
    
    expect(deleteResult.success).toBe(true);
    
    // Verificar que fue eliminado
    const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId);
    expect(paciente).toBeUndefined();
  });
});


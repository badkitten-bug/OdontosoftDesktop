const Database = require('better-sqlite3');

// Mock del módulo database ANTES de cargar los handlers
jest.mock('../db/database', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  
  // Crear tablas necesarias
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      datos_extra TEXT DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS odontologos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      especialidad TEXT,
      activo INTEGER DEFAULT 1
    );
      CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_paciente INTEGER,
        id_odontologo INTEGER,
        fecha TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        estado TEXT DEFAULT 'programada',
        motivo TEXT,
        observaciones TEXT,
        asistio INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_paciente) REFERENCES pacientes(id),
        FOREIGN KEY (id_odontologo) REFERENCES odontologos(id)
      );
  `);
  
  return {
    getDatabase: jest.fn(() => db),
    initDatabase: jest.fn(() => db),
    getDatabasePath: jest.fn(() => ':memory:'),
  };
});

const citasHandler = require('../ipcHandlers/citasHandler');
const dbModule = require('../db/database');

const mockIpcMain = {
  handle: jest.fn(),
};

describe('Citas Handler', () => {
  let db;

  beforeAll(() => {
    // Obtener la base de datos del mock
    db = dbModule.getDatabase();
    
    // Limpiar tablas antes de comenzar
    db.exec('DELETE FROM citas');
    db.exec('DELETE FROM pacientes');
    db.exec('DELETE FROM odontologos');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // Limpiar tablas
    db.exec('DELETE FROM citas');
    db.exec('DELETE FROM pacientes');
    db.exec('DELETE FROM odontologos');
    jest.clearAllMocks();
    
    // Crear datos de prueba (con IDs específicos para las foreign keys)
    db.prepare('INSERT INTO pacientes (id, nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?, ?)')
      .run(1, 'Paciente Test', '12345678', '987654321', '{}');
    db.prepare('INSERT INTO odontologos (id, nombre, especialidad, activo) VALUES (?, ?, ?, ?)')
      .run(1, 'Dr. Test', 'General', 1);
  });

  test('valida que hora_fin sea mayor que hora_inicio', async () => {
    citasHandler.register(mockIpcMain);
    const addHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'add-cita')[1];
    
    await expect(
      addHandler(null, {
        id_paciente: 1,
        id_odontologo: 1,
        fecha: '2024-12-01',
        hora_inicio: '10:00',
        hora_fin: '09:00', // Hora fin menor que inicio
        estado: 'programada',
      })
    ).rejects.toThrow('La hora de fin debe ser mayor que la hora de inicio');
  });

  test('valida solapamiento de horarios', async () => {
    // Crear cita existente usando el handler
    citasHandler.register(mockIpcMain);
    const addHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'add-cita')[1];
    
    // Crear primera cita
    await addHandler(null, {
      id_paciente: 1,
      id_odontologo: 1,
      fecha: '2024-12-01',
      hora_inicio: '09:00',
      hora_fin: '10:00',
      estado: 'programada',
    });
    
    // Intentar crear cita que se solapa
    await expect(
      addHandler(null, {
        id_paciente: 1,
        id_odontologo: 1,
        fecha: '2024-12-01',
        hora_inicio: '09:30', // Se solapa con la cita existente
        hora_fin: '10:30',
        estado: 'programada',
      })
    ).rejects.toThrow('El horario se solapa');
  });

  test('permite crear citas no solapadas', async () => {
    citasHandler.register(mockIpcMain);
    const addHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'add-cita')[1];
    
    const result = await addHandler(null, {
      id_paciente: 1,
      id_odontologo: 1,
      fecha: '2024-12-01',
      hora_inicio: '09:00',
      hora_fin: '10:00',
      estado: 'programada',
    });
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});


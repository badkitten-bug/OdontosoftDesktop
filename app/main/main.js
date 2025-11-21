const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDatabase, getDatabase } = require('./db/database');
const pacientesHandler = require('./ipcHandlers/pacientesHandler');
const productosHandler = require('./ipcHandlers/productosHandler');
const configHandler = require('./ipcHandlers/configHandler');
const historialHandler = require('./ipcHandlers/historialHandler');
const odontologosHandler = require('./ipcHandlers/odontologosHandler');
const horariosHandler = require('./ipcHandlers/horariosHandler');
const citasHandler = require('./ipcHandlers/citasHandler');
const tratamientosHandler = require('./ipcHandlers/tratamientosHandler');
const facturasHandler = require('./ipcHandlers/facturasHandler');
const relacionesHandler = require('./ipcHandlers/relacionesHandler');
const recordatoriosHandler = require('./ipcHandlers/recordatoriosHandler');
const movimientosInventarioHandler = require('./ipcHandlers/movimientosInventarioHandler');
const planesTratamientoHandler = require('./ipcHandlers/planesTratamientoHandler');
const prescripcionesHandler = require('./ipcHandlers/prescripcionesHandler');
const archivosHandler = require('./ipcHandlers/archivosHandler');
const usuariosHandler = require('./ipcHandlers/usuariosHandler');
const promocionesHandler = require('./ipcHandlers/promocionesHandler');
const backupsHandler = require('./ipcHandlers/backupsHandler');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // icon: path.join(__dirname, '../assets/icon.png'), // Descomentar cuando tengas un icono
    titleBarStyle: 'default',
  });

  // En desarrollo, carga desde Vite
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // En producción, carga desde el build
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Función para registrar todos los handlers IPC
function registerAllHandlers() {
  pacientesHandler.register(ipcMain);
  productosHandler.register(ipcMain);
  configHandler.register(ipcMain);
  historialHandler.register(ipcMain);
  odontologosHandler.register(ipcMain);
  horariosHandler.register(ipcMain);
  citasHandler.register(ipcMain);
  tratamientosHandler.register(ipcMain);
  facturasHandler.register(ipcMain);
  relacionesHandler.register(ipcMain);
  recordatoriosHandler.register(ipcMain);
  movimientosInventarioHandler.register(ipcMain);
  planesTratamientoHandler.register(ipcMain);
  prescripcionesHandler.register(ipcMain);
  archivosHandler.register(ipcMain);
  usuariosHandler.register(ipcMain);
  promocionesHandler.register(ipcMain);
  backupsHandler.register(ipcMain);
  console.log('Handlers IPC registrados correctamente');
}

// Inicializar base de datos al iniciar la app
app.whenReady().then(async () => {
  let dbInitialized = false;
  try {
    initDatabase();
    // Verificar que la base de datos se inicializó correctamente
    const db = getDatabase();
    if (!db) {
      throw new Error('Base de datos no se inicializó correctamente');
    }
    dbInitialized = true;
    console.log('Base de datos inicializada correctamente');
    
    // Registrar handlers IPC DESPUÉS de inicializar la base de datos
    registerAllHandlers();
    
    // Generar recordatorios automáticos
    try {
      // Generar recordatorios de citas y pagos
      setTimeout(async () => {
        try {
          const { getDatabase } = require('./db/database');
          const db = getDatabase();
          
          // Generar recordatorios de citas (24h antes)
          const hoy = new Date();
          const manana = new Date(hoy);
          manana.setDate(manana.getDate() + 1);
          const fechaManana = manana.toISOString().split('T')[0];
          
          const citas = db
            .prepare(
              `SELECT c.*, p.nombre as paciente_nombre, p.telefono, o.nombre as odontologo_nombre 
               FROM citas c
               LEFT JOIN pacientes p ON c.id_paciente = p.id
               LEFT JOIN odontologos o ON c.id_odontologo = o.id
               WHERE c.fecha = ? AND c.estado IN ('programada', 'confirmada')
               AND NOT EXISTS (
                 SELECT 1 FROM recordatorios r 
                 WHERE r.tipo = 'cita' AND r.id_entidad = c.id AND r.fecha_recordatorio = ?
               )`
            )
            .all(fechaManana, hoy.toISOString().split('T')[0]);

          const stmtCitas = db.prepare(
            'INSERT INTO recordatorios (tipo, id_entidad, entidad_tipo, titulo, mensaje, fecha_recordatorio) VALUES (?, ?, ?, ?, ?, ?)'
          );

          citas.forEach((cita) => {
            const titulo = `Recordatorio de Cita - ${cita.paciente_nombre}`;
            const mensaje = `El paciente ${cita.paciente_nombre} tiene una cita mañana (${fechaManana}) a las ${cita.hora_inicio} con ${cita.odontologo_nombre}.${cita.motivo ? ` Motivo: ${cita.motivo}` : ''}`;
            stmtCitas.run('cita', cita.id, 'cita', titulo, mensaje, hoy.toISOString().split('T')[0]);
          });

          // Generar recordatorios de pagos pendientes
          const facturas = db
            .prepare(
              `SELECT f.*, p.nombre as paciente_nombre, p.telefono,
               (SELECT SUM(monto) FROM pagos WHERE id_factura = f.id) as total_pagado
               FROM facturas f
               LEFT JOIN pacientes p ON f.id_paciente = p.id
               WHERE f.estado = 'pendiente'
               AND (SELECT SUM(monto) FROM pagos WHERE id_factura = f.id) < f.total
               AND NOT EXISTS (
                 SELECT 1 FROM recordatorios r 
                 WHERE r.tipo = 'pago' AND r.id_entidad = f.id AND r.fecha_recordatorio = ?
               )`
            )
            .all(hoy.toISOString().split('T')[0]);

          const stmtPagos = db.prepare(
            'INSERT INTO recordatorios (tipo, id_entidad, entidad_tipo, titulo, mensaje, fecha_recordatorio) VALUES (?, ?, ?, ?, ?, ?)'
          );

          facturas.forEach((factura) => {
            const pendiente = factura.total - (factura.total_pagado || 0);
            const titulo = `Pago Pendiente - ${factura.paciente_nombre}`;
            const mensaje = `El paciente ${factura.paciente_nombre} tiene un saldo pendiente de S/ ${pendiente.toFixed(2)} en la factura ${factura.numero}.`;
            stmtPagos.run('pago', factura.id, 'factura', titulo, mensaje, hoy.toISOString().split('T')[0]);
          });

          console.log(`Recordatorios generados: ${citas.length} citas, ${facturas.length} pagos`);
        } catch (error) {
          console.error('Error al generar recordatorios automáticos:', error);
        }
      }, 3000);
    } catch (error) {
      console.error('Error al configurar recordatorios:', error);
    }
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    // Intentar reinicializar después de un delay
    setTimeout(() => {
      try {
        initDatabase();
        // Verificar que la base de datos se inicializó correctamente
        const db = getDatabase();
        if (!db) {
          throw new Error('Base de datos no se inicializó correctamente');
        }
        dbInitialized = true;
        console.log('Base de datos inicializada en segundo intento');
        
        // Registrar handlers IPC después de reinicializar
        registerAllHandlers();
      } catch (retryError) {
        console.error('Error al reinicializar la base de datos:', retryError);
      }
    }, 2000);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log/main');
const { initDatabase, getDatabase, closeDatabase } = require('./db/database');

// Configurar electron-log
//  - Archivo: <userData>/logs/main.log con rotación a 5 MB.
//  - Reemplaza console.* en el main process para que también escriba al archivo.
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = 'debug';
log.initialize();
Object.assign(console, log.functions);
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
const configuracionClinicaHandler = require('./ipcHandlers/configuracionClinicaHandler');
const licenciaHandler = require('./ipcHandlers/licenciaHandler');
const diagnosticoHandler = require('./ipcHandlers/diagnosticoHandler');
const autoUpdate = require('./auto-update');

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

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // Desarrollo: carga desde Vite y abre DevTools
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Producción: carga desde el build empaquetado, sin DevTools
    const indexPath = path.join(__dirname, '../renderer/dist/index.html');
    console.log('Cargando index.html desde', indexPath);
    mainWindow.loadFile(indexPath);

    // Atajo oculto para abrir DevTools en producción si hace falta soporte:
    // Ctrl+Shift+Alt+D
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.type === 'keyDown' &&
        input.control &&
        input.shift &&
        input.alt &&
        input.key &&
        input.key.toLowerCase() === 'd'
      ) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }

  // Loguear errores de carga de la ventana (útil en producción)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Error al cargar contenido:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Activar verificación automática de actualizaciones (solo en builds empaquetados).
  autoUpdate.inicializar(mainWindow);
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
  configuracionClinicaHandler.register(ipcMain);
  licenciaHandler.register(ipcMain);
  diagnosticoHandler.register(ipcMain);
  autoUpdate.register(ipcMain);
  console.log('Handlers IPC registrados correctamente');
}

// Inicializar base de datos al iniciar la app
app.whenReady().then(async () => {
  let dbInitialized = false;
  try {
    // Marcar entorno (desarrollo vs producción) para la base de datos
    // Esto se usa en database.js para decidir si usar una BD separada para desarrollo
    process.env.ODONTOSOFT_ENV = app.isPackaged ? 'production' : 'development';

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

// Antes de cerrar: backup automático del día + rotación + cerrar BD limpiamente.
let cerrandoLimpio = false;
app.on('before-quit', async (event) => {
  if (cerrandoLimpio) return; // ya estamos en el flujo de cierre
  event.preventDefault();
  cerrandoLimpio = true;

  try {
    const res = await backupsHandler.ejecutarBackupAutomatico();
    if (res.ok) {
      console.log(`[backup] backup automático listo: ${res.ruta}`);
    } else {
      console.warn(`[backup] backup automático omitido: ${res.motivo}`);
    }
  } catch (e) {
    console.error('[backup] error en backup automático:', e);
  }

  try {
    closeDatabase();
  } catch (e) {
    console.error('[db] error cerrando BD al salir:', e);
  }

  app.exit(0);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


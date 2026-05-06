const { getDatabase, getDatabasePath } = require('../db/database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { requireRol } = require('../auth/sesiones');

const TABLAS_EXPORTABLES = new Set([
  'pacientes',
  'odontologos',
  'horarios_disponibilidad',
  'citas',
  'tratamientos',
  'citas_tratamientos',
  'facturas',
  'pagos',
  'productos',
  'historial',
  'movimientos_inventario',
  'planes_tratamiento',
  'citas_plan',
  'prescripciones',
  'archivos_historial',
  'promociones',
  'cupones',
  'recordatorios',
]);

/**
 * Obtiene la carpeta de backups
 */
function getBackupsDir() {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  return backupsDir;
}

/**
 * Registra los handlers IPC para backups
 */
function register(ipcMain) {
  // Crear backup
  ipcMain.handle('crear-backup', async (event, sessionId, nombre, descripcion) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const dbPath = getDatabasePath();
      const backupsDir = getBackupsDir();

      if (!fs.existsSync(dbPath)) {
        throw new Error('Base de datos no encontrada');
      }

      const fecha = new Date().toISOString().replace(/[:.]/g, '-');
      const nombreArchivo = nombre || `backup_${fecha}.db`;
      const rutaBackup = path.join(backupsDir, nombreArchivo);

      // Copiar archivo de base de datos
      fs.copyFileSync(dbPath, rutaBackup);

      const tamano = fs.statSync(rutaBackup).size;

      // Registrar en la base de datos
      const result = db
        .prepare(
          'INSERT INTO backups (nombre_archivo, ruta_archivo, tamano, tipo, descripcion) VALUES (?, ?, ?, ?, ?)'
        )
        .run(nombreArchivo, rutaBackup, tamano, nombre ? 'manual' : 'automatico', descripcion || null);

      return {
        id: result.lastInsertRowid,
        success: true,
        ruta_archivo: rutaBackup,
      };
    } catch (error) {
      console.error('Error al crear backup:', error);
      throw error;
    }
  });

  // Obtener lista de backups
  ipcMain.handle('get-backups', async (event, sessionId) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      return db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    } catch (error) {
      console.error('Error al obtener backups:', error);
      throw error;
    }
  });

  // Restaurar backup
  ipcMain.handle('restaurar-backup', async (event, sessionId, id) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);

      if (!backup || !fs.existsSync(backup.ruta_archivo)) {
        throw new Error('Backup no encontrado');
      }

      const dbPath = getDatabasePath();
      const dbDir = path.dirname(dbPath);

      // Crear backup de seguridad antes de restaurar
      const fecha = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSeguridad = path.join(dbDir, `backup_seguridad_${fecha}.db`);
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupSeguridad);
      }

      // Cerrar conexión actual
      // Nota: En producción, necesitarías cerrar la conexión de better-sqlite3
      // Por ahora, simplemente copiamos el archivo

      // Copiar backup sobre la base de datos actual
      fs.copyFileSync(backup.ruta_archivo, dbPath);

      return {
        success: true,
        mensaje: 'Backup restaurado correctamente. La aplicación se reiniciará.',
      };
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      throw error;
    }
  });

  // Eliminar backup
  ipcMain.handle('delete-backup', async (event, sessionId, id) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const backup = db.prepare('SELECT ruta_archivo FROM backups WHERE id = ?').get(id);

      if (backup && fs.existsSync(backup.ruta_archivo)) {
        fs.unlinkSync(backup.ruta_archivo);
      }

      const result = db.prepare('DELETE FROM backups WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar backup:', error);
      throw error;
    }
  });

  // Exportar datos a CSV
  ipcMain.handle('exportar-csv', async (event, sessionId, tabla, rutaDestino) => {
    try {
      requireRol(sessionId, 'admin');
      if (!TABLAS_EXPORTABLES.has(tabla)) {
        throw new Error('Tabla no permitida para exportación');
      }
      const db = getDatabase();
      const datos = db.prepare(`SELECT * FROM ${tabla}`).all();

      if (datos.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      // Obtener nombres de columnas
      const columnas = Object.keys(datos[0]);
      const header = columnas.join(',');

      // Convertir datos a CSV
      const filas = datos.map((fila) => {
        return columnas
          .map((col) => {
            const valor = fila[col];
            // Escapar comillas y envolver en comillas si contiene comas
            if (valor === null || valor === undefined) return '';
            const str = String(valor).replace(/"/g, '""');
            return str.includes(',') ? `"${str}"` : str;
          })
          .join(',');
      });

      const csv = [header, ...filas].join('\n');

      // Guardar archivo
      fs.writeFileSync(rutaDestino, csv, 'utf8');

      return {
        success: true,
        ruta: rutaDestino,
        registros: datos.length,
      };
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      throw error;
    }
  });
}

module.exports = { register };


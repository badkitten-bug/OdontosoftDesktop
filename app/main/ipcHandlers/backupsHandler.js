const { getDatabase, getDatabasePath, closeDatabase, reopenDatabase } = require('../db/database');
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

const RETENCION_DIAS_BACKUP_AUTO = 30;

/**
 * Hace un backup automático del día (1 por día, sobreescribe si ya existe).
 * Diseñado para llamarse desde main.js al cerrar la app.
 *
 * Nota: usa la API de backup nativa de better-sqlite3 si está disponible
 * (consistente sin necesidad de cerrar la BD), y cae a copyFileSync si no.
 *
 * Devuelve { ok, ruta, motivo? }
 */
async function ejecutarBackupAutomatico() {
  try {
    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      return { ok: false, motivo: 'BD no encontrada en disco' };
    }

    const backupsDir = getBackupsDir();
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const nombreArchivo = `auto_${hoy}.db`;
    const rutaBackup = path.join(backupsDir, nombreArchivo);

    let db;
    try {
      db = getDatabase();
    } catch (_) {
      db = null;
    }

    if (db && typeof db.backup === 'function') {
      // backup en caliente (consistente, sin cerrar la conexión)
      await db.backup(rutaBackup);
    } else {
      // fallback: copia directa del archivo
      fs.copyFileSync(dbPath, rutaBackup);
    }

    const tamano = fs.statSync(rutaBackup).size;

    // Registrar en BD si está disponible (best-effort)
    if (db) {
      try {
        db.prepare(
          `INSERT INTO backups (nombre_archivo, ruta_archivo, tamano, tipo, descripcion)
           VALUES (?, ?, ?, 'automatico', ?)
           ON CONFLICT DO NOTHING`
        ).run(nombreArchivo, rutaBackup, tamano, `Backup automático del ${hoy}`);
      } catch (_) {
        // Si la versión de SQLite no soporta ON CONFLICT, intentar sin él.
        try {
          // Borrar registros previos del mismo archivo para evitar duplicados.
          db.prepare('DELETE FROM backups WHERE ruta_archivo = ?').run(rutaBackup);
          db.prepare(
            `INSERT INTO backups (nombre_archivo, ruta_archivo, tamano, tipo, descripcion)
             VALUES (?, ?, ?, 'automatico', ?)`
          ).run(nombreArchivo, rutaBackup, tamano, `Backup automático del ${hoy}`);
        } catch (e2) {
          console.error('No se pudo registrar el backup automático en BD:', e2.message);
        }
      }
    }

    rotarBackupsAutomaticos(backupsDir);

    return { ok: true, ruta: rutaBackup };
  } catch (e) {
    console.error('Error en backup automático:', e);
    return { ok: false, motivo: e.message };
  }
}

/**
 * Borra backups automáticos con más de RETENCION_DIAS_BACKUP_AUTO días.
 * No toca los manuales.
 */
function rotarBackupsAutomaticos(backupsDir) {
  try {
    const archivos = fs.readdirSync(backupsDir);
    const limite = Date.now() - RETENCION_DIAS_BACKUP_AUTO * 24 * 60 * 60 * 1000;
    for (const nombre of archivos) {
      if (!nombre.startsWith('auto_') || !nombre.endsWith('.db')) continue;
      const ruta = path.join(backupsDir, nombre);
      try {
        const stat = fs.statSync(ruta);
        if (stat.mtimeMs < limite) {
          fs.unlinkSync(ruta);
          // Best-effort: limpiar el registro en BD
          try {
            const db = getDatabase();
            db.prepare('DELETE FROM backups WHERE ruta_archivo = ?').run(ruta);
          } catch (_) { /* ignore */ }
        }
      } catch (_) { /* ignore archivos huérfanos */ }
    }
  } catch (e) {
    console.error('Error rotando backups:', e);
  }
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

  // Restaurar backup (cierra BD, copia archivo, reabre BD).
  ipcMain.handle('restaurar-backup', async (event, sessionId, id) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);

    if (!backup || !fs.existsSync(backup.ruta_archivo)) {
      throw new Error('Backup no encontrado');
    }

    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);

    // 1. Snapshot de seguridad de la BD actual antes de pisarla.
    const fecha = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSeguridad = path.join(dbDir, `pre_restore_${fecha}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupSeguridad);
    }

    // 2. Cerrar la conexión antes de copiar.
    closeDatabase();

    // 3. Copiar el backup sobre el archivo de BD.
    try {
      fs.copyFileSync(backup.ruta_archivo, dbPath);
    } catch (err) {
      // Si falla, intenta reabrir la BD original para no dejar la app rota.
      try { reopenDatabase(); } catch (_) { /* ignore */ }
      throw new Error(`No se pudo restaurar el backup: ${err.message}`);
    }

    // 4. Reabrir la BD con los datos restaurados.
    reopenDatabase();

    return {
      success: true,
      mensaje:
        'Backup restaurado correctamente. Se recomienda cerrar y volver a abrir la aplicación.',
      backup_seguridad: backupSeguridad,
    };
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

module.exports = { register, ejecutarBackupAutomatico };


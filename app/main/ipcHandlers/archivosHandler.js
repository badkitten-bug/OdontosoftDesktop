const { getDatabase } = require('../db/database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Obtiene la carpeta de archivos adjuntos
 */
function getArchivosDir() {
  const userDataPath = app.getPath('userData');
  const archivosDir = path.join(userDataPath, 'archivos_historial');
  
  if (!fs.existsSync(archivosDir)) {
    fs.mkdirSync(archivosDir, { recursive: true });
  }
  
  return archivosDir;
}

/**
 * Registra los handlers IPC para archivos adjuntos
 */
function register(ipcMain) {
  // Obtener archivos de un historial
  ipcMain.handle('get-archivos-historial', async (event, idHistorial) => {
    try {
      const db = getDatabase();
      return db
        .prepare('SELECT * FROM archivos_historial WHERE id_historial = ? ORDER BY created_at DESC')
        .all(idHistorial);
    } catch (error) {
      console.error('Error al obtener archivos:', error);
      throw error;
    }
  });

  // Obtener un archivo
  ipcMain.handle('get-archivo', async (event, id) => {
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM archivos_historial WHERE id = ?').get(id);
    } catch (error) {
      console.error('Error al obtener archivo:', error);
      throw error;
    }
  });

  // Agregar archivo (el archivo debe ser enviado como base64 o ruta)
  ipcMain.handle('add-archivo-historial', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_historial, nombre_archivo, contenido_base64, tipo, descripcion } = data;

      const archivosDir = getArchivosDir();
      const extension = path.extname(nombre_archivo);
      const nombreSinExt = path.basename(nombre_archivo, extension);
      const nombreUnico = `${nombreSinExt}_${Date.now()}${extension}`;
      const rutaArchivo = path.join(archivosDir, nombreUnico);

      // Guardar archivo
      if (contenido_base64) {
        const buffer = Buffer.from(contenido_base64, 'base64');
        fs.writeFileSync(rutaArchivo, buffer);
      } else {
        throw new Error('No se proporcionó contenido del archivo');
      }

      const tamano = fs.statSync(rutaArchivo).size;

      const result = db
        .prepare(
          'INSERT INTO archivos_historial (id_historial, nombre_archivo, ruta_archivo, tipo, descripcion, tamano) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id_historial, nombre_archivo, rutaArchivo, tipo || 'otro', descripcion || null, tamano);

      return {
        id: result.lastInsertRowid,
        success: true,
        ruta_archivo: rutaArchivo,
      };
    } catch (error) {
      console.error('Error al agregar archivo:', error);
      throw error;
    }
  });

  // Eliminar archivo
  ipcMain.handle('delete-archivo-historial', async (event, id) => {
    try {
      const db = getDatabase();
      const archivo = db.prepare('SELECT ruta_archivo FROM archivos_historial WHERE id = ?').get(id);

      if (archivo && fs.existsSync(archivo.ruta_archivo)) {
        fs.unlinkSync(archivo.ruta_archivo);
      }

      const result = db.prepare('DELETE FROM archivos_historial WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw error;
    }
  });

  // Obtener ruta del archivo para lectura
  ipcMain.handle('get-ruta-archivo', async (event, id) => {
    try {
      const db = getDatabase();
      const archivo = db.prepare('SELECT ruta_archivo, nombre_archivo FROM archivos_historial WHERE id = ?').get(id);
      
      if (!archivo || !fs.existsSync(archivo.ruta_archivo)) {
        throw new Error('Archivo no encontrado');
      }

      return archivo;
    } catch (error) {
      console.error('Error al obtener ruta del archivo:', error);
      throw error;
    }
  });
}

module.exports = { register };


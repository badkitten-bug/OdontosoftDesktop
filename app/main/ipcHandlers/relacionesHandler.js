const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para relaciones entre entidades
 */
function register(ipcMain) {
  // Obtener todas las relaciones
  ipcMain.handle('get-relaciones', async () => {
    try {
      const db = getDatabase();
      return db
        .prepare('SELECT * FROM relaciones_entidades WHERE activo = 1 ORDER BY entidad_origen ASC')
        .all();
    } catch (error) {
      console.error('Error al obtener relaciones:', error);
      throw error;
    }
  });

  // Obtener relaciones de una entidad
  ipcMain.handle('get-relaciones-entidad', async (event, entidad) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT * FROM relaciones_entidades WHERE (entidad_origen = ? OR entidad_destino = ?) AND activo = 1'
        )
        .all(entidad, entidad);
    } catch (error) {
      console.error('Error al obtener relaciones de entidad:', error);
      throw error;
    }
  });

  // Agregar relación
  ipcMain.handle('add-relacion', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        entidad_origen,
        entidad_destino,
        tipo_relacion,
        nombre_relacion,
        descripcion,
        activo = true,
      } = data;

      const result = db
        .prepare(
          'INSERT INTO relaciones_entidades (entidad_origen, entidad_destino, tipo_relacion, nombre_relacion, descripcion, activo) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          entidad_origen,
          entidad_destino,
          tipo_relacion,
          nombre_relacion,
          descripcion || null,
          activo ? 1 : 0
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar relación:', error);
      throw error;
    }
  });

  // Actualizar relación
  ipcMain.handle('update-relacion', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { tipo_relacion, nombre_relacion, descripcion, activo } = data;

      const result = db
        .prepare(
          'UPDATE relaciones_entidades SET tipo_relacion = ?, nombre_relacion = ?, descripcion = ?, activo = ? WHERE id = ?'
        )
        .run(tipo_relacion, nombre_relacion, descripcion || null, activo ? 1 : 0, id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar relación:', error);
      throw error;
    }
  });

  // Eliminar relación
  ipcMain.handle('delete-relacion', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM relaciones_entidades WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar relación:', error);
      throw error;
    }
  });
}

module.exports = { register };


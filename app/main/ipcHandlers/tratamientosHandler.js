const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para tratamientos
 */
function register(ipcMain) {
  // Obtener todos los tratamientos
  ipcMain.handle('get-tratamientos', async () => {
    try {
      const db = getDatabase();
      const tratamientos = db
        .prepare('SELECT * FROM tratamientos ORDER BY nombre ASC')
        .all();

      return tratamientos.map((t) => ({
        ...t,
        datos_extra: JSON.parse(t.datos_extra || '{}'),
        activo: t.activo === 1,
      }));
    } catch (error) {
      console.error('Error al obtener tratamientos:', error);
      throw error;
    }
  });

  // Obtener tratamientos activos
  ipcMain.handle('get-tratamientos-activos', async () => {
    try {
      const db = getDatabase();
      const tratamientos = db
        .prepare('SELECT * FROM tratamientos WHERE activo = 1 ORDER BY nombre ASC')
        .all();

      return tratamientos.map((t) => ({
        ...t,
        datos_extra: JSON.parse(t.datos_extra || '{}'),
        activo: t.activo === 1,
      }));
    } catch (error) {
      console.error('Error al obtener tratamientos activos:', error);
      throw error;
    }
  });

  // Obtener un tratamiento por ID
  ipcMain.handle('get-tratamiento', async (event, id) => {
    try {
      const db = getDatabase();
      const tratamiento = db
        .prepare('SELECT * FROM tratamientos WHERE id = ?')
        .get(id);

      if (!tratamiento) return null;

      return {
        ...tratamiento,
        datos_extra: JSON.parse(tratamiento.datos_extra || '{}'),
        activo: tratamiento.activo === 1,
      };
    } catch (error) {
      console.error('Error al obtener tratamiento:', error);
      throw error;
    }
  });

  // Agregar nuevo tratamiento
  ipcMain.handle('add-tratamiento', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        codigo,
        nombre,
        descripcion,
        precio,
        duracion_minutos = 30,
        activo = true,
        datos_extra = {},
      } = data;

      const result = db
        .prepare(
          'INSERT INTO tratamientos (codigo, nombre, descripcion, precio, duracion_minutos, activo, datos_extra) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          codigo || null,
          nombre,
          descripcion || null,
          precio,
          duracion_minutos,
          activo ? 1 : 0,
          JSON.stringify(datos_extra)
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar tratamiento:', error);
      throw error;
    }
  });

  // Actualizar tratamiento
  ipcMain.handle('update-tratamiento', async (event, id, data) => {
    try {
      const db = getDatabase();
      const {
        codigo,
        nombre,
        descripcion,
        precio,
        duracion_minutos,
        activo,
        datos_extra = {},
      } = data;

      const result = db
        .prepare(
          'UPDATE tratamientos SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, duracion_minutos = ?, activo = ?, datos_extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(
          codigo || null,
          nombre,
          descripcion || null,
          precio,
          duracion_minutos,
          activo ? 1 : 0,
          JSON.stringify(datos_extra),
          id
        );

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar tratamiento:', error);
      throw error;
    }
  });

  // Eliminar tratamiento
  ipcMain.handle('delete-tratamiento', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('DELETE FROM tratamientos WHERE id = ?')
        .run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar tratamiento:', error);
      throw error;
    }
  });

  // Obtener tratamientos de una cita
  ipcMain.handle('get-tratamientos-cita', async (event, idCita) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT ct.*, t.nombre as tratamiento_nombre, t.codigo as tratamiento_codigo FROM citas_tratamientos ct LEFT JOIN tratamientos t ON ct.id_tratamiento = t.id WHERE ct.id_cita = ?'
        )
        .all(idCita);
    } catch (error) {
      console.error('Error al obtener tratamientos de cita:', error);
      throw error;
    }
  });

  // Agregar tratamiento a una cita
  ipcMain.handle('add-tratamiento-cita', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        id_cita,
        id_tratamiento,
        cantidad = 1,
        precio_unitario,
        descuento = 0,
        observaciones,
      } = data;

      const result = db
        .prepare(
          'INSERT INTO citas_tratamientos (id_cita, id_tratamiento, cantidad, precio_unitario, descuento, observaciones) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          id_cita,
          id_tratamiento,
          cantidad,
          precio_unitario,
          descuento,
          observaciones || null
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar tratamiento a cita:', error);
      throw error;
    }
  });

  // Eliminar tratamiento de una cita
  ipcMain.handle('delete-tratamiento-cita', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('DELETE FROM citas_tratamientos WHERE id = ?')
        .run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar tratamiento de cita:', error);
      throw error;
    }
  });
}

module.exports = { register };


const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para odontólogos
 */
function register(ipcMain) {
  // Obtener todos los odontólogos
  ipcMain.handle('get-odontologos', async () => {
    try {
      const db = getDatabase();
      const odontologos = db
        .prepare('SELECT * FROM odontologos ORDER BY nombre ASC')
        .all();

      return odontologos.map((o) => ({
        ...o,
        datos_extra: JSON.parse(o.datos_extra || '{}'),
        activo: o.activo === 1,
      }));
    } catch (error) {
      console.error('Error al obtener odontólogos:', error);
      throw error;
    }
  });

  // Obtener odontólogos activos
  ipcMain.handle('get-odontologos-activos', async () => {
    try {
      const db = getDatabase();
      const odontologos = db
        .prepare('SELECT * FROM odontologos WHERE activo = 1 ORDER BY nombre ASC')
        .all();

      return odontologos.map((o) => ({
        ...o,
        datos_extra: JSON.parse(o.datos_extra || '{}'),
        activo: o.activo === 1,
      }));
    } catch (error) {
      console.error('Error al obtener odontólogos activos:', error);
      throw error;
    }
  });

  // Obtener un odontólogo por ID
  ipcMain.handle('get-odontologo', async (event, id) => {
    try {
      const db = getDatabase();
      const odontologo = db.prepare('SELECT * FROM odontologos WHERE id = ?').get(id);

      if (!odontologo) return null;

      return {
        ...odontologo,
        datos_extra: JSON.parse(odontologo.datos_extra || '{}'),
        activo: odontologo.activo === 1,
      };
    } catch (error) {
      console.error('Error al obtener odontólogo:', error);
      throw error;
    }
  });

  // Agregar nuevo odontólogo
  ipcMain.handle('add-odontologo', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        nombre,
        dni,
        telefono,
        email,
        especialidad,
        matricula,
        activo = true,
        datos_extra = {},
      } = data;

      const result = db
        .prepare(
          'INSERT INTO odontologos (nombre, dni, telefono, email, especialidad, matricula, activo, datos_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          nombre,
          dni || null,
          telefono || null,
          email || null,
          especialidad || null,
          matricula || null,
          activo ? 1 : 0,
          JSON.stringify(datos_extra)
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar odontólogo:', error);
      throw error;
    }
  });

  // Actualizar odontólogo
  ipcMain.handle('update-odontologo', async (event, id, data) => {
    try {
      const db = getDatabase();
      const {
        nombre,
        dni,
        telefono,
        email,
        especialidad,
        matricula,
        activo,
        datos_extra = {},
      } = data;

      const result = db
        .prepare(
          'UPDATE odontologos SET nombre = ?, dni = ?, telefono = ?, email = ?, especialidad = ?, matricula = ?, activo = ?, datos_extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(
          nombre,
          dni || null,
          telefono || null,
          email || null,
          especialidad || null,
          matricula || null,
          activo ? 1 : 0,
          JSON.stringify(datos_extra),
          id
        );

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar odontólogo:', error);
      throw error;
    }
  });

  // Eliminar odontólogo
  ipcMain.handle('delete-odontologo', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM odontologos WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar odontólogo:', error);
      throw error;
    }
  });
}

module.exports = { register };


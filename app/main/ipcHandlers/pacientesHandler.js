const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para pacientes
 */
function register(ipcMain) {
  // Obtener todos los pacientes
  ipcMain.handle('get-pacientes', async () => {
    try {
      const db = getDatabase();
      const pacientes = db.prepare('SELECT * FROM pacientes ORDER BY nombre ASC').all();
      
      // Parsear datos_extra JSON
      return pacientes.map(p => ({
        ...p,
        datos_extra: JSON.parse(p.datos_extra || '{}'),
      }));
    } catch (error) {
      console.error('Error al obtener pacientes:', error);
      // Si la base de datos no está inicializada, retornar array vacío en lugar de lanzar error
      if (error.message && error.message.includes('no inicializada')) {
        console.warn('Base de datos no inicializada, retornando array vacío');
        return [];
      }
      throw error;
    }
  });

  // Obtener un paciente por ID
  ipcMain.handle('get-paciente', async (event, id) => {
    try {
      const db = getDatabase();
      const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
      
      if (!paciente) {
        return null;
      }

      return {
        ...paciente,
        datos_extra: JSON.parse(paciente.datos_extra || '{}'),
      };
    } catch (error) {
      console.error('Error al obtener paciente:', error);
      throw error;
    }
  });

  // Agregar nuevo paciente
  ipcMain.handle('add-paciente', async (event, data) => {
    try {
      const db = getDatabase();
      const { nombre, dni, telefono, datos_extra = {} } = data;

      // Validar DNI único si se proporciona
      if (dni && dni.trim()) {
        const pacienteExistente = db.prepare('SELECT id FROM pacientes WHERE dni = ?').get(dni.trim());
        if (pacienteExistente) {
          throw new Error('Ya existe un paciente con este DNI');
        }
      }

      const result = db
        .prepare(
          'INSERT INTO pacientes (nombre, dni, telefono, datos_extra) VALUES (?, ?, ?, ?)'
        )
        .run(nombre, dni || null, telefono || null, JSON.stringify(datos_extra));

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar paciente:', error);
      throw error;
    }
  });

  // Actualizar paciente
  ipcMain.handle('update-paciente', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { nombre, dni, telefono, datos_extra = {} } = data;

      // Validar DNI único si se proporciona (excluyendo el paciente actual)
      if (dni && dni.trim()) {
        const pacienteExistente = db.prepare('SELECT id FROM pacientes WHERE dni = ? AND id != ?').get(dni.trim(), id);
        if (pacienteExistente) {
          throw new Error('Ya existe otro paciente con este DNI');
        }
      }

      const result = db
        .prepare(
          'UPDATE pacientes SET nombre = ?, dni = ?, telefono = ?, datos_extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(nombre, dni || null, telefono || null, JSON.stringify(datos_extra), id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      throw error;
    }
  });

  // Eliminar paciente
  ipcMain.handle('delete-paciente', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM pacientes WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar paciente:', error);
      throw error;
    }
  });
}

module.exports = { register };


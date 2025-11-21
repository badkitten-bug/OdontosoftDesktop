const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para historial clínico
 */
function register(ipcMain) {
  // Obtener historial de un paciente
  ipcMain.handle('get-historial', async (event, idPaciente) => {
    try {
      const db = getDatabase();
      const registros = db
        .prepare('SELECT * FROM historial WHERE id_paciente = ? ORDER BY fecha DESC, created_at DESC')
        .all(idPaciente);
      
      // Parsear odontograma_data y datos_extra si existen
      return registros.map(registro => {
        let odontogramaData = null;
        let datosExtra = {};
        
        try {
          if (registro.odontograma_data) {
            odontogramaData = JSON.parse(registro.odontograma_data);
            // Asegurar que es un objeto válido
            if (typeof odontogramaData !== 'object' || odontogramaData === null) {
              odontogramaData = null;
            }
          }
        } catch (e) {
          console.error('Error al parsear odontograma_data:', e);
          odontogramaData = null;
        }
        
        try {
          if (registro.datos_extra) {
            datosExtra = JSON.parse(registro.datos_extra);
            if (typeof datosExtra !== 'object' || datosExtra === null) {
              datosExtra = {};
            }
          }
        } catch (e) {
          console.error('Error al parsear datos_extra:', e);
          datosExtra = {};
        }
        
        return {
          ...registro,
          odontograma_data: odontogramaData,
          datos_extra: datosExtra,
        };
      });
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  });

  // Agregar entrada al historial
  ipcMain.handle('add-historial', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_paciente, descripcion, fecha, odontograma_data, datos_extra } = data;

      const odontogramaJson = odontograma_data ? JSON.stringify(odontograma_data) : null;
      const datosExtraJson = datos_extra ? JSON.stringify(datos_extra) : '{}';

      const result = db
        .prepare(
          'INSERT INTO historial (id_paciente, descripcion, fecha, odontograma_data, datos_extra) VALUES (?, ?, ?, ?, ?)'
        )
        .run(id_paciente, descripcion, fecha, odontogramaJson, datosExtraJson);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar historial:', error);
      throw error;
    }
  });

  // Eliminar entrada del historial
  ipcMain.handle('delete-historial', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM historial WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar historial:', error);
      throw error;
    }
  });
}

module.exports = { register };


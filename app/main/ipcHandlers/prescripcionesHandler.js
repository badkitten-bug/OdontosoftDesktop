const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para prescripciones
 */
function register(ipcMain) {
  // Obtener prescripciones de un paciente
  ipcMain.handle('get-prescripciones-paciente', async (event, idPaciente, soloActivas = false) => {
    try {
      const db = getDatabase();
      let query = `
        SELECT pr.*, o.nombre as odontologo_nombre, c.fecha as cita_fecha
        FROM prescripciones pr
        LEFT JOIN odontologos o ON pr.id_odontologo = o.id
        LEFT JOIN citas c ON pr.id_cita = c.id
        WHERE pr.id_paciente = ?
      `;

      if (soloActivas) {
        query += ' AND pr.activa = 1';
        const hoy = new Date().toISOString().split('T')[0];
        query += ` AND (pr.fecha_vencimiento IS NULL OR pr.fecha_vencimiento >= '${hoy}')`;
      }

      query += ' ORDER BY pr.fecha DESC';

      return db.prepare(query).all(idPaciente);
    } catch (error) {
      console.error('Error al obtener prescripciones:', error);
      throw error;
    }
  });

  // Obtener una prescripción
  ipcMain.handle('get-prescripcion', async (event, id) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          `SELECT pr.*, p.nombre as paciente_nombre, o.nombre as odontologo_nombre
           FROM prescripciones pr
           LEFT JOIN pacientes p ON pr.id_paciente = p.id
           LEFT JOIN odontologos o ON pr.id_odontologo = o.id
           WHERE pr.id = ?`
        )
        .get(id);
    } catch (error) {
      console.error('Error al obtener prescripción:', error);
      throw error;
    }
  });

  // Crear prescripción
  ipcMain.handle('add-prescripcion', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_paciente, id_cita, id_odontologo, medicamentos, instrucciones, fecha, fecha_vencimiento } = data;

      const medicamentosJson = typeof medicamentos === 'string' ? medicamentos : JSON.stringify(medicamentos);

      const result = db
        .prepare(
          'INSERT INTO prescripciones (id_paciente, id_cita, id_odontologo, medicamentos, instrucciones, fecha, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          id_paciente,
          id_cita || null,
          id_odontologo,
          medicamentosJson,
          instrucciones || null,
          fecha,
          fecha_vencimiento || null
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear prescripción:', error);
      throw error;
    }
  });

  // Actualizar prescripción
  ipcMain.handle('update-prescripcion', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { medicamentos, instrucciones, fecha_vencimiento, activa } = data;

      let query = 'UPDATE prescripciones SET ';
      const params = [];

      if (medicamentos !== undefined) {
        const medicamentosJson = typeof medicamentos === 'string' ? medicamentos : JSON.stringify(medicamentos);
        query += 'medicamentos = ?, ';
        params.push(medicamentosJson);
      }

      if (instrucciones !== undefined) {
        query += 'instrucciones = ?, ';
        params.push(instrucciones);
      }

      if (fecha_vencimiento !== undefined) {
        query += 'fecha_vencimiento = ?, ';
        params.push(fecha_vencimiento);
      }

      if (activa !== undefined) {
        query += 'activa = ?, ';
        params.push(activa ? 1 : 0);
      }

      query = query.slice(0, -2); // Eliminar última coma y espacio
      query += ' WHERE id = ?';
      params.push(id);

      const result = db.prepare(query).run(...params);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar prescripción:', error);
      throw error;
    }
  });

  // Eliminar prescripción
  ipcMain.handle('delete-prescripcion', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM prescripciones WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar prescripción:', error);
      throw error;
    }
  });
}

module.exports = { register };


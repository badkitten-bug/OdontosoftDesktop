const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para citas
 */
function register(ipcMain) {
  // Obtener todas las citas
  ipcMain.handle('get-citas', async (event, filtros = {}) => {
    try {
      const db = getDatabase();
      let query = 'SELECT c.*, p.nombre as paciente_nombre, o.nombre as odontologo_nombre FROM citas c LEFT JOIN pacientes p ON c.id_paciente = p.id LEFT JOIN odontologos o ON c.id_odontologo = o.id WHERE 1=1';
      const params = [];

      if (filtros.fecha) {
        query += ' AND c.fecha = ?';
        params.push(filtros.fecha);
      }
      if (filtros.id_paciente) {
        query += ' AND c.id_paciente = ?';
        params.push(filtros.id_paciente);
      }
      if (filtros.id_odontologo) {
        query += ' AND c.id_odontologo = ?';
        params.push(filtros.id_odontologo);
      }
      if (filtros.estado) {
        query += ' AND c.estado = ?';
        params.push(filtros.estado);
      }

      query += ' ORDER BY c.fecha ASC, c.hora_inicio ASC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error al obtener citas:', error);
      throw error;
    }
  });

  // Obtener una cita por ID
  ipcMain.handle('get-cita', async (event, id) => {
    try {
      const db = getDatabase();
      const cita = db
        .prepare(
          'SELECT c.*, p.nombre as paciente_nombre, o.nombre as odontologo_nombre FROM citas c LEFT JOIN pacientes p ON c.id_paciente = p.id LEFT JOIN odontologos o ON c.id_odontologo = o.id WHERE c.id = ?'
        )
        .get(id);

      return cita;
    } catch (error) {
      console.error('Error al obtener cita:', error);
      throw error;
    }
  });

  // Función auxiliar para verificar solapamiento de horarios
  function haySolapamiento(horaInicio1, horaFin1, horaInicio2, horaFin2) {
    // Convertir horas a minutos para comparación
    const [h1, m1] = horaInicio1.split(':').map(Number);
    const [h2, m2] = horaFin1.split(':').map(Number);
    const [h3, m3] = horaInicio2.split(':').map(Number);
    const [h4, m4] = horaFin2.split(':').map(Number);
    
    const inicio1 = h1 * 60 + m1;
    const fin1 = h2 * 60 + m2;
    const inicio2 = h3 * 60 + m3;
    const fin2 = h4 * 60 + m4;
    
    // Verificar solapamiento: (inicio1 < fin2) && (inicio2 < fin1)
    return (inicio1 < fin2) && (inicio2 < fin1);
  }

  // Agregar nueva cita
  ipcMain.handle('add-cita', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        id_paciente,
        id_odontologo,
        fecha,
        hora_inicio,
        hora_fin,
        estado = 'programada',
        motivo,
        observaciones,
      } = data;

      // Validar que hora_fin sea mayor que hora_inicio
      const [h1, m1] = hora_inicio.split(':').map(Number);
      const [h2, m2] = hora_fin.split(':').map(Number);
      const inicio = h1 * 60 + m1;
      const fin = h2 * 60 + m2;
      if (fin <= inicio) {
        throw new Error('La hora de fin debe ser mayor que la hora de inicio');
      }

      // Verificar solapamiento con otras citas del mismo odontólogo en la misma fecha
      const citasExistentes = db
        .prepare(
          'SELECT hora_inicio, hora_fin FROM citas WHERE id_odontologo = ? AND fecha = ? AND estado != ?'
        )
        .all(id_odontologo, fecha, 'cancelada');

      for (const cita of citasExistentes) {
        if (haySolapamiento(hora_inicio, hora_fin, cita.hora_inicio, cita.hora_fin)) {
          throw new Error(`El horario se solapa con otra cita existente (${cita.hora_inicio} - ${cita.hora_fin})`);
        }
      }

      const result = db
        .prepare(
          'INSERT INTO citas (id_paciente, id_odontologo, fecha, hora_inicio, hora_fin, estado, motivo, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          id_paciente,
          id_odontologo,
          fecha,
          hora_inicio,
          hora_fin,
          estado,
          motivo || null,
          observaciones || null
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar cita:', error);
      throw error;
    }
  });

  // Actualizar cita
  ipcMain.handle('update-cita', async (event, id, data) => {
    try {
      const db = getDatabase();
      const {
        id_paciente,
        id_odontologo,
        fecha,
        hora_inicio,
        hora_fin,
        estado,
        asistio,
        motivo,
        observaciones,
      } = data;

      // Validar que hora_fin sea mayor que hora_inicio
      const [h1, m1] = hora_inicio.split(':').map(Number);
      const [h2, m2] = hora_fin.split(':').map(Number);
      const inicio = h1 * 60 + m1;
      const fin = h2 * 60 + m2;
      if (fin <= inicio) {
        throw new Error('La hora de fin debe ser mayor que la hora de inicio');
      }

      // Verificar solapamiento con otras citas del mismo odontólogo en la misma fecha (excluyendo la cita actual)
      const citasExistentes = db
        .prepare(
          'SELECT hora_inicio, hora_fin FROM citas WHERE id_odontologo = ? AND fecha = ? AND estado != ? AND id != ?'
        )
        .all(id_odontologo, fecha, 'cancelada', id);

      for (const cita of citasExistentes) {
        if (haySolapamiento(hora_inicio, hora_fin, cita.hora_inicio, cita.hora_fin)) {
          throw new Error(`El horario se solapa con otra cita existente (${cita.hora_inicio} - ${cita.hora_fin})`);
        }
      }

      const result = db
        .prepare(
          'UPDATE citas SET id_paciente = ?, id_odontologo = ?, fecha = ?, hora_inicio = ?, hora_fin = ?, estado = ?, asistio = ?, motivo = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(
          id_paciente,
          id_odontologo,
          fecha,
          hora_inicio,
          hora_fin,
          estado,
          asistio !== undefined ? (asistio ? 1 : 0) : null,
          motivo || null,
          observaciones || null,
          id
        );

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar cita:', error);
      throw error;
    }
  });

  // Eliminar cita
  ipcMain.handle('delete-cita', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM citas WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar cita:', error);
      throw error;
    }
  });

  // Obtener citas de un día específico
  ipcMain.handle('get-citas-por-fecha', async (event, fecha) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT c.*, p.nombre as paciente_nombre, o.nombre as odontologo_nombre FROM citas c LEFT JOIN pacientes p ON c.id_paciente = p.id LEFT JOIN odontologos o ON c.id_odontologo = o.id WHERE c.fecha = ? ORDER BY c.hora_inicio ASC'
        )
        .all(fecha);
    } catch (error) {
      console.error('Error al obtener citas por fecha:', error);
      throw error;
    }
  });
}

module.exports = { register };


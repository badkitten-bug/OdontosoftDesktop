const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para horarios de disponibilidad
 */
function register(ipcMain) {
  // Obtener horarios de un odontólogo
  ipcMain.handle('get-horarios', async (event, idOdontologo) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT * FROM horarios_disponibilidad WHERE id_odontologo = ? ORDER BY dia_semana ASC, hora_inicio ASC'
        )
        .all(idOdontologo);
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      throw error;
    }
  });

  // Obtener horarios activos de un odontólogo
  ipcMain.handle('get-horarios-activos', async (event, idOdontologo) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT * FROM horarios_disponibilidad WHERE id_odontologo = ? AND activo = 1 ORDER BY dia_semana ASC, hora_inicio ASC'
        )
        .all(idOdontologo);
    } catch (error) {
      console.error('Error al obtener horarios activos:', error);
      throw error;
    }
  });

  // Agregar horario
  ipcMain.handle('add-horario', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_odontologo, dia_semana, hora_inicio, hora_fin, activo = true } = data;

      const result = db
        .prepare(
          'INSERT INTO horarios_disponibilidad (id_odontologo, dia_semana, hora_inicio, hora_fin, activo) VALUES (?, ?, ?, ?, ?)'
        )
        .run(id_odontologo, dia_semana, hora_inicio, hora_fin, activo ? 1 : 0);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar horario:', error);
      throw error;
    }
  });

  // Actualizar horario
  ipcMain.handle('update-horario', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { dia_semana, hora_inicio, hora_fin, activo } = data;

      const result = db
        .prepare(
          'UPDATE horarios_disponibilidad SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, activo = ? WHERE id = ?'
        )
        .run(dia_semana, hora_inicio, hora_fin, activo ? 1 : 0, id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      throw error;
    }
  });

  // Eliminar horario
  ipcMain.handle('delete-horario', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('DELETE FROM horarios_disponibilidad WHERE id = ?')
        .run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      throw error;
    }
  });

  // Verificar disponibilidad de un odontólogo en una fecha y hora
  ipcMain.handle('verificar-disponibilidad', async (event, idOdontologo, fecha, horaInicio, horaFin) => {
    try {
      const db = getDatabase();
      
      // Parsear la fecha correctamente para evitar problemas de zona horaria
      // La fecha viene en formato YYYY-MM-DD
      const [year, month, day] = fecha.split('-').map(Number);
      // Crear fecha en zona horaria local (month - 1 porque Date usa 0-11 para meses)
      const fechaObj = new Date(year, month - 1, day);
      const diaSemana = fechaObj.getDay(); // 0=Domingo, 1=Lunes, etc.

      console.log(`[verificar-disponibilidad] Fecha: ${fecha}, Día de semana: ${diaSemana} (${diaSemana === 0 ? 'Domingo' : diaSemana === 1 ? 'Lunes' : diaSemana === 2 ? 'Martes' : diaSemana === 3 ? 'Miércoles' : diaSemana === 4 ? 'Jueves' : diaSemana === 5 ? 'Viernes' : 'Sábado'})`);

      // Verificar si hay horario configurado para ese día
      const horarios = db
        .prepare(
          'SELECT * FROM horarios_disponibilidad WHERE id_odontologo = ? AND dia_semana = ? AND activo = 1'
        )
        .all(idOdontologo, diaSemana);

      console.log(`[verificar-disponibilidad] Horarios encontrados para día ${diaSemana}:`, horarios.length);

      if (horarios.length === 0) {
        return { disponible: false, razon: 'No hay horario configurado para este día' };
      }

      // Verificar si el horario solicitado está dentro de los horarios disponibles
      const horarioValido = horarios.some((h) => {
        return horaInicio >= h.hora_inicio && horaFin <= h.hora_fin;
      });

      if (!horarioValido) {
        return { disponible: false, razon: 'El horario no está dentro de los horarios disponibles' };
      }

      // Verificar si hay citas que se solapen
      const citasExistentes = db
        .prepare(
          'SELECT * FROM citas WHERE id_odontologo = ? AND fecha = ? AND estado != ? AND ((hora_inicio < ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin > ?) OR (hora_inicio >= ? AND hora_fin <= ?))'
        )
        .all(
          idOdontologo,
          fecha,
          'cancelada',
          horaInicio,
          horaInicio,
          horaFin,
          horaFin,
          horaInicio,
          horaFin
        );

      if (citasExistentes.length > 0) {
        return { disponible: false, razon: 'Ya existe una cita en este horario' };
      }

      return { disponible: true };
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      throw error;
    }
  });
}

module.exports = { register };


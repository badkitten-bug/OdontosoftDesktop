const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para planes de tratamiento
 */
function register(ipcMain) {
  // Obtener planes de un paciente
  ipcMain.handle('get-planes-paciente', async (event, idPaciente) => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          `SELECT pt.*, t.nombre as tratamiento_nombre, t.precio as tratamiento_precio
           FROM planes_tratamiento pt
           LEFT JOIN tratamientos t ON pt.id_tratamiento = t.id
           WHERE pt.id_paciente = ?
           ORDER BY pt.fecha_inicio DESC`
        )
        .all(idPaciente);
    } catch (error) {
      console.error('Error al obtener planes:', error);
      throw error;
    }
  });

  // Obtener un plan con sus citas
  ipcMain.handle('get-plan', async (event, id) => {
    try {
      const db = getDatabase();
      const plan = db
        .prepare(
          `SELECT pt.*, t.nombre as tratamiento_nombre, p.nombre as paciente_nombre
           FROM planes_tratamiento pt
           LEFT JOIN tratamientos t ON pt.id_tratamiento = t.id
           LEFT JOIN pacientes p ON pt.id_paciente = p.id
           WHERE pt.id = ?`
        )
        .get(id);

      if (!plan) {
        return null;
      }

      // Obtener citas del plan
      const citas = db
        .prepare(
          `SELECT cp.*, c.fecha, c.hora_inicio, c.hora_fin, c.estado as cita_estado,
           o.nombre as odontologo_nombre
           FROM citas_plan cp
           LEFT JOIN citas c ON cp.id_cita = c.id
           LEFT JOIN odontologos o ON c.id_odontologo = o.id
           WHERE cp.id_plan = ?
           ORDER BY cp.orden ASC`
        )
        .all(id);

      return { ...plan, citas };
    } catch (error) {
      console.error('Error al obtener plan:', error);
      throw error;
    }
  });

  // Crear plan de tratamiento
  ipcMain.handle('add-plan-tratamiento', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_paciente, id_tratamiento, nombre, descripcion, fecha_inicio, fecha_fin_estimada, observaciones } = data;

      const result = db
        .prepare(
          'INSERT INTO planes_tratamiento (id_paciente, id_tratamiento, nombre, descripcion, fecha_inicio, fecha_fin_estimada, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          id_paciente,
          id_tratamiento,
          nombre,
          descripcion || null,
          fecha_inicio,
          fecha_fin_estimada || null,
          observaciones || null
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear plan:', error);
      throw error;
    }
  });

  // Agregar cita a un plan
  ipcMain.handle('add-cita-plan', async (event, data) => {
    try {
      const db = getDatabase();
      const { id_plan, id_cita, orden, observaciones } = data;

      const result = db
        .prepare(
          'INSERT INTO citas_plan (id_plan, id_cita, orden, observaciones) VALUES (?, ?, ?, ?)'
        )
        .run(id_plan, id_cita, orden, observaciones || null);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar cita al plan:', error);
      throw error;
    }
  });

  // Marcar cita del plan como completada
  ipcMain.handle('marcar-cita-plan-completada', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('UPDATE citas_plan SET completada = 1 WHERE id = ?').run(id);

      // Verificar si todas las citas están completadas para actualizar el estado del plan
      const plan = db.prepare('SELECT id_plan FROM citas_plan WHERE id = ?').get(id);
      if (plan) {
        const citasPlan = db
          .prepare('SELECT COUNT(*) as total, SUM(completada) as completadas FROM citas_plan WHERE id_plan = ?')
          .get(plan.id_plan);

        if (citasPlan.total === citasPlan.completadas) {
          db.prepare("UPDATE planes_tratamiento SET estado = 'completado', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
            plan.id_plan
          );
        }
      }

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al marcar cita como completada:', error);
      throw error;
    }
  });

  // Actualizar plan
  ipcMain.handle('update-plan-tratamiento', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { nombre, descripcion, fecha_fin_estimada, estado, observaciones } = data;

      const result = db
        .prepare(
          'UPDATE planes_tratamiento SET nombre = ?, descripcion = ?, fecha_fin_estimada = ?, estado = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(nombre, descripcion || null, fecha_fin_estimada || null, estado, observaciones || null, id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar plan:', error);
      throw error;
    }
  });

  // Eliminar plan
  ipcMain.handle('delete-plan-tratamiento', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM planes_tratamiento WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar plan:', error);
      throw error;
    }
  });
}

module.exports = { register };


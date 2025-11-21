const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para recordatorios
 */
function register(ipcMain) {
  // Obtener recordatorios pendientes
  ipcMain.handle('get-recordatorios', async (event, filtros = {}) => {
    try {
      const db = getDatabase();
      let query = 'SELECT * FROM recordatorios WHERE 1=1';
      const params = [];

      if (filtros.visto !== undefined) {
        query += ' AND visto = ?';
        params.push(filtros.visto ? 1 : 0);
      }

      if (filtros.activo !== undefined) {
        query += ' AND activo = ?';
        params.push(filtros.activo ? 1 : 0);
      }

      if (filtros.tipo) {
        query += ' AND tipo = ?';
        params.push(filtros.tipo);
      }

      if (filtros.fecha) {
        query += ' AND fecha_recordatorio <= ?';
        params.push(filtros.fecha);
      }

      query += ' ORDER BY fecha_recordatorio ASC, visto ASC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error al obtener recordatorios:', error);
      throw error;
    }
  });

  // Obtener recordatorios no vistos
  ipcMain.handle('get-recordatorios-no-vistos', async () => {
    try {
      const db = getDatabase();
      const hoy = new Date().toISOString().split('T')[0];
      return db
        .prepare(
          'SELECT * FROM recordatorios WHERE visto = 0 AND activo = 1 AND fecha_recordatorio <= ? ORDER BY fecha_recordatorio ASC'
        )
        .all(hoy);
    } catch (error) {
      console.error('Error al obtener recordatorios no vistos:', error);
      throw error;
    }
  });

  // Crear recordatorio
  ipcMain.handle('add-recordatorio', async (event, data) => {
    try {
      const db = getDatabase();
      const {
        tipo,
        id_entidad,
        entidad_tipo,
        titulo,
        mensaje,
        fecha_recordatorio,
        fecha_vencimiento,
      } = data;

      const result = db
        .prepare(
          'INSERT INTO recordatorios (tipo, id_entidad, entidad_tipo, titulo, mensaje, fecha_recordatorio, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          tipo,
          id_entidad || null,
          entidad_tipo || null,
          titulo,
          mensaje,
          fecha_recordatorio,
          fecha_vencimiento || null
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear recordatorio:', error);
      throw error;
    }
  });

  // Marcar recordatorio como visto
  ipcMain.handle('marcar-recordatorio-visto', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('UPDATE recordatorios SET visto = 1, visto_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al marcar recordatorio como visto:', error);
      throw error;
    }
  });

  // Eliminar recordatorio
  ipcMain.handle('delete-recordatorio', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM recordatorios WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      throw error;
    }
  });

  // Generar recordatorios automáticos de citas (24h antes)
  ipcMain.handle('generar-recordatorios-citas', async () => {
    try {
      const db = getDatabase();
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const fechaManana = manana.toISOString().split('T')[0];

      // Obtener citas programadas para mañana
      const citas = db
        .prepare(
          `SELECT c.*, p.nombre as paciente_nombre, p.telefono, o.nombre as odontologo_nombre 
           FROM citas c
           LEFT JOIN pacientes p ON c.id_paciente = p.id
           LEFT JOIN odontologos o ON c.id_odontologo = o.id
           WHERE c.fecha = ? AND c.estado IN ('programada', 'confirmada')
           AND NOT EXISTS (
             SELECT 1 FROM recordatorios r 
             WHERE r.tipo = 'cita' AND r.id_entidad = c.id AND r.fecha_recordatorio = ?
           )`
        )
        .all(fechaManana, fechaManana);

      const stmt = db.prepare(
        'INSERT INTO recordatorios (tipo, id_entidad, entidad_tipo, titulo, mensaje, fecha_recordatorio) VALUES (?, ?, ?, ?, ?, ?)'
      );

      let creados = 0;
      citas.forEach((cita) => {
        const titulo = `Recordatorio de Cita - ${cita.paciente_nombre}`;
        const mensaje = `El paciente ${cita.paciente_nombre} tiene una cita mañana (${fechaManana}) a las ${cita.hora_inicio} con ${cita.odontologo_nombre}.${cita.motivo ? ` Motivo: ${cita.motivo}` : ''}`;

        stmt.run('cita', cita.id, 'cita', titulo, mensaje, hoy.toISOString().split('T')[0]);
        creados++;
      });

      return { creados, total: citas.length };
    } catch (error) {
      console.error('Error al generar recordatorios de citas:', error);
      throw error;
    }
  });

  // Generar recordatorios automáticos de pagos programados
  ipcMain.handle('generar-recordatorios-pagos', async () => {
    try {
      const db = getDatabase();
      const hoy = new Date().toISOString().split('T')[0];

      // Obtener facturas pendientes con pagos programados
      const facturas = db
        .prepare(
          `SELECT f.*, p.nombre as paciente_nombre, p.telefono,
           (SELECT SUM(monto) FROM pagos WHERE id_factura = f.id) as total_pagado
           FROM facturas f
           LEFT JOIN pacientes p ON f.id_paciente = p.id
           WHERE f.estado = 'pendiente'
           AND (SELECT SUM(monto) FROM pagos WHERE id_factura = f.id) < f.total
           AND NOT EXISTS (
             SELECT 1 FROM recordatorios r 
             WHERE r.tipo = 'pago' AND r.id_entidad = f.id AND r.fecha_recordatorio = ?
           )`
        )
        .all(hoy);

      const stmt = db.prepare(
        'INSERT INTO recordatorios (tipo, id_entidad, entidad_tipo, titulo, mensaje, fecha_recordatorio) VALUES (?, ?, ?, ?, ?, ?)'
      );

      let creados = 0;
      facturas.forEach((factura) => {
        const pendiente = factura.total - (factura.total_pagado || 0);
        const titulo = `Pago Pendiente - ${factura.paciente_nombre}`;
        const mensaje = `El paciente ${factura.paciente_nombre} tiene un saldo pendiente de S/ ${pendiente.toFixed(2)} en la factura ${factura.numero}.`;

        stmt.run('pago', factura.id, 'factura', titulo, mensaje, hoy);
        creados++;
      });

      return { creados, total: facturas.length };
    } catch (error) {
      console.error('Error al generar recordatorios de pagos:', error);
      throw error;
    }
  });
}

module.exports = { register };


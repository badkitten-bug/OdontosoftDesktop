const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para promociones y cupones
 */
function register(ipcMain) {
  // Obtener promociones activas
  ipcMain.handle('get-promociones', async (event, soloActivas = false) => {
    try {
      const db = getDatabase();
      const hoy = new Date().toISOString().split('T')[0];
      let query = 'SELECT * FROM promociones WHERE 1=1';

      if (soloActivas) {
        query += ` AND activa = 1 AND fecha_inicio <= '${hoy}' AND fecha_fin >= '${hoy}'`;
      }

      query += ' ORDER BY fecha_inicio DESC';

      return db.prepare(query).all();
    } catch (error) {
      console.error('Error al obtener promociones:', error);
      throw error;
    }
  });

  // Obtener una promoción
  ipcMain.handle('get-promocion', async (event, id) => {
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM promociones WHERE id = ?').get(id);
    } catch (error) {
      console.error('Error al obtener promoción:', error);
      throw error;
    }
  });

  // Crear promoción
  ipcMain.handle('add-promocion', async (event, data) => {
    try {
      const db = getDatabase();
      const { nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, aplica_a, id_entidad } = data;

      const result = db
        .prepare(
          'INSERT INTO promociones (nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, aplica_a, id_entidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(nombre, descripcion || null, tipo, valor, fecha_inicio, fecha_fin, aplica_a || 'todos', id_entidad || null);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear promoción:', error);
      throw error;
    }
  });

  // Actualizar promoción
  ipcMain.handle('update-promocion', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, activa, aplica_a, id_entidad } = data;

      const result = db
        .prepare(
          'UPDATE promociones SET nombre = ?, descripcion = ?, tipo = ?, valor = ?, fecha_inicio = ?, fecha_fin = ?, activa = ?, aplica_a = ?, id_entidad = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(
          nombre,
          descripcion || null,
          tipo,
          valor,
          fecha_inicio,
          fecha_fin,
          activa !== undefined ? (activa ? 1 : 0) : 1,
          aplica_a || 'todos',
          id_entidad || null,
          id
        );

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar promoción:', error);
      throw error;
    }
  });

  // Eliminar promoción
  ipcMain.handle('delete-promocion', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM promociones WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar promoción:', error);
      throw error;
    }
  });

  // Obtener cupones
  ipcMain.handle('get-cupones', async (event, soloActivos = false) => {
    try {
      const db = getDatabase();
      const hoy = new Date().toISOString().split('T')[0];
      let query = 'SELECT c.*, p.nombre as promocion_nombre FROM cupones c LEFT JOIN promociones p ON c.id_promocion = p.id WHERE 1=1';

      if (soloActivos) {
        query += ` AND c.activo = 1 AND c.fecha_inicio <= '${hoy}' AND c.fecha_fin >= '${hoy}' AND (c.usos_maximos = 0 OR c.usos_actuales < c.usos_maximos)`;
      }

      query += ' ORDER BY c.created_at DESC';

      return db.prepare(query).all();
    } catch (error) {
      console.error('Error al obtener cupones:', error);
      throw error;
    }
  });

  // Validar y usar cupón
  ipcMain.handle('validar-cupon', async (event, codigo) => {
    try {
      const db = getDatabase();
      const hoy = new Date().toISOString().split('T')[0];

      const cupon = db
        .prepare(
          'SELECT * FROM cupones WHERE codigo = ? AND activo = 1 AND fecha_inicio <= ? AND fecha_fin >= ?'
        )
        .get(codigo, hoy, hoy);

      if (!cupon) {
        return { valido: false, error: 'Cupón no válido o expirado' };
      }

      if (cupon.usos_maximos > 0 && cupon.usos_actuales >= cupon.usos_maximos) {
        return { valido: false, error: 'Cupón agotado' };
      }

      return { valido: true, cupon };
    } catch (error) {
      console.error('Error al validar cupón:', error);
      throw error;
    }
  });

  // Usar cupón (incrementar usos)
  ipcMain.handle('usar-cupon', async (event, codigo) => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE codigo = ?')
        .run(codigo);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al usar cupón:', error);
      throw error;
    }
  });

  // Crear cupón
  ipcMain.handle('add-cupon', async (event, data) => {
    try {
      const db = getDatabase();
      const { codigo, id_promocion, descuento_porcentaje, descuento_fijo, fecha_inicio, fecha_fin, usos_maximos } = data;

      // Verificar que el código no exista
      const existe = db.prepare('SELECT id FROM cupones WHERE codigo = ?').get(codigo);
      if (existe) {
        throw new Error('El código del cupón ya existe');
      }

      const result = db
        .prepare(
          'INSERT INTO cupones (codigo, id_promocion, descuento_porcentaje, descuento_fijo, fecha_inicio, fecha_fin, usos_maximos) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          codigo,
          id_promocion || null,
          descuento_porcentaje || null,
          descuento_fijo || null,
          fecha_inicio,
          fecha_fin,
          usos_maximos || 1
        );

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear cupón:', error);
      throw error;
    }
  });

  // Eliminar cupón
  ipcMain.handle('delete-cupon', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM cupones WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar cupón:', error);
      throw error;
    }
  });
}

module.exports = { register };


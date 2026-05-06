const { getDatabase } = require('../db/database');
const { requireRol } = require('../auth/sesiones');

/**
 * Registra los handlers IPC para configuración (campos dinámicos)
 */
function register(ipcMain) {
  // Obtener campos dinámicos por entidad (incluyendo base)
  ipcMain.handle('get-campos-dinamicos', async (event, entidad) => {
    try {
      const db = getDatabase();
      return db
        .prepare('SELECT * FROM campos_config WHERE entidad = ? ORDER BY orden ASC, nombre_campo ASC')
        .all(entidad);
    } catch (error) {
      console.error('Error al obtener campos dinámicos:', error);
      throw error;
    }
  });

  // Inicializar campos base para una entidad
  ipcMain.handle('init-campos-base', async (event, sessionId, entidad) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      
      const camposBaseMap = {
        pacientes: [
          { nombre_campo: 'Nombre', name: 'nombre', tipo: 'text', requerido: true, orden: 1, ancho: 100 },
          { nombre_campo: 'DNI', name: 'dni', tipo: 'text', requerido: false, orden: 2, ancho: 50 },
          { nombre_campo: 'Teléfono', name: 'telefono', tipo: 'text', requerido: false, orden: 3, ancho: 50 },
        ],
        odontologos: [
          { nombre_campo: 'Nombre', name: 'nombre', tipo: 'text', requerido: true, orden: 1, ancho: 100 },
          { nombre_campo: 'DNI', name: 'dni', tipo: 'text', requerido: false, orden: 2, ancho: 50 },
          { nombre_campo: 'Teléfono', name: 'telefono', tipo: 'text', requerido: false, orden: 3, ancho: 50 },
          { nombre_campo: 'Email', name: 'email', tipo: 'email', requerido: false, orden: 4, ancho: 50 },
          { nombre_campo: 'Especialidad', name: 'especialidad', tipo: 'text', requerido: false, orden: 5, ancho: 50 },
          { nombre_campo: 'Matrícula', name: 'matricula', tipo: 'text', requerido: false, orden: 6, ancho: 50 },
        ],
        tratamientos: [
          { nombre_campo: 'Código', name: 'codigo', tipo: 'text', requerido: false, orden: 1, ancho: 50 },
          { nombre_campo: 'Nombre', name: 'nombre', tipo: 'text', requerido: true, orden: 2, ancho: 100 },
          { nombre_campo: 'Descripción', name: 'descripcion', tipo: 'textarea', requerido: false, orden: 3, ancho: 100 },
          { nombre_campo: 'Precio', name: 'precio', tipo: 'number', requerido: true, orden: 4, ancho: 50 },
          { nombre_campo: 'Duración (minutos)', name: 'duracion_minutos', tipo: 'number', requerido: false, orden: 5, ancho: 50 },
        ],
        historial: [
          { nombre_campo: 'Peso (kg)', name: 'peso', tipo: 'number', requerido: false, orden: 1, ancho: 50 },
          { nombre_campo: 'Edad', name: 'edad', tipo: 'number', requerido: false, orden: 2, ancho: 50 },
          { nombre_campo: 'Alergias', name: 'alergias', tipo: 'textarea', requerido: false, orden: 3, ancho: 100 },
          { nombre_campo: 'Presión Arterial', name: 'presion_arterial', tipo: 'text', requerido: false, orden: 4, ancho: 50 },
          { nombre_campo: 'Pulso', name: 'pulso', tipo: 'number', requerido: false, orden: 5, ancho: 50 },
          { nombre_campo: 'Temperatura (°C)', name: 'temperatura', tipo: 'number', requerido: false, orden: 6, ancho: 50 },
          { nombre_campo: 'Motivo de Consulta', name: 'motivo_consulta', tipo: 'textarea', requerido: false, orden: 7, ancho: 100 },
          { nombre_campo: 'Diagnóstico', name: 'diagnostico', tipo: 'textarea', requerido: false, orden: 8, ancho: 100 },
          { nombre_campo: 'Tratamiento Realizado', name: 'tratamiento_realizado', tipo: 'textarea', requerido: false, orden: 9, ancho: 100 },
          { nombre_campo: 'Observaciones', name: 'observaciones', tipo: 'textarea', requerido: false, orden: 10, ancho: 100 },
        ],
      };

      const camposBase = camposBaseMap[entidad] || [];
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO campos_config 
        (entidad, nombre_campo, name, tipo, requerido, orden, ancho, es_campo_base)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `);

      let inserted = 0;
      camposBase.forEach((campo) => {
        try {
          stmt.run(
            entidad,
            campo.nombre_campo,
            campo.name, // Guardar el name para usar como clave en formData
            campo.tipo,
            campo.requerido ? 1 : 0,
            campo.orden,
            campo.ancho || 100
          );
          inserted++;
        } catch (error) {
          // Ignorar duplicados
        }
      });

      // Actualizar campos base existentes que no tienen 'name'
      const updateStmt = db.prepare(`
        UPDATE campos_config 
        SET name = ? 
        WHERE entidad = ? AND nombre_campo = ? AND (name IS NULL OR name = '')
      `);
      
      camposBase.forEach((campo) => {
        try {
          updateStmt.run(campo.name, entidad, campo.nombre_campo);
        } catch (error) {
          // Ignorar errores
        }
      });

      return { success: true, inserted };
    } catch (error) {
      console.error('Error al inicializar campos base:', error);
      throw error;
    }
  });

  // Agregar nuevo campo dinámico
  ipcMain.handle('add-campo-dinamico', async (event, sessionId, data) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const { 
        entidad, 
        nombre_campo, 
        name = null, // Si no se proporciona, usar nombre_campo normalizado
        tipo, 
        requerido = 0, 
        orden = 0,
        icono = null,
        ancho = 100,
        es_campo_base = 0
      } = data;

      // Obtener opciones directamente de data
      const opciones = data.opciones !== undefined ? data.opciones : null;

      console.log('[add-campo-dinamico] Opciones recibidas:', opciones);
      console.log('[add-campo-dinamico] Tipo:', tipo);

      // Si no se proporciona name, generar uno a partir de nombre_campo
      const nameField = name || nombre_campo.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Eliminar caracteres especiales

      const result = db
        .prepare(
          'INSERT INTO campos_config (entidad, nombre_campo, name, tipo, requerido, orden, icono, ancho, es_campo_base, opciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(entidad, nombre_campo, nameField, tipo, requerido ? 1 : 0, orden, icono, ancho || 100, es_campo_base ? 1 : 0, opciones);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar campo dinámico:', error);
      throw error;
    }
  });

  // Actualizar campo dinámico
  ipcMain.handle('update-campo-dinamico', async (event, sessionId, id, data) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const { 
        nombre_campo, 
        name = null,
        tipo, 
        requerido = 0, 
        orden = 0,
        icono = null,
        ancho = 100,
        es_campo_base = 0
      } = data;

      // Obtener opciones directamente de data, no desestructurar para evitar perder el valor
      const opciones = data.opciones !== undefined ? data.opciones : null;

      console.log('[update-campo-dinamico] ID:', id);
      console.log('[update-campo-dinamico] Opciones recibidas:', opciones);
      console.log('[update-campo-dinamico] Tipo:', tipo);

      // Si no se proporciona name, generar uno a partir de nombre_campo
      const nameField = name || nombre_campo.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Eliminar caracteres especiales

      const result = db
        .prepare(
          'UPDATE campos_config SET nombre_campo = ?, name = ?, tipo = ?, requerido = ?, orden = ?, icono = ?, ancho = ?, es_campo_base = ?, opciones = ? WHERE id = ?'
        )
        .run(nombre_campo, nameField, tipo, requerido ? 1 : 0, orden, icono, ancho || 100, es_campo_base ? 1 : 0, opciones, id);

      console.log('[update-campo-dinamico] Filas actualizadas:', result.changes);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar campo dinámico:', error);
      throw error;
    }
  });

  // Eliminar campo dinámico
  ipcMain.handle('delete-campo-dinamico', async (event, sessionId, id) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const result = db.prepare('DELETE FROM campos_config WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar campo dinámico:', error);
      throw error;
    }
  });

  // Actualizar orden de múltiples campos (para reordenamiento)
  ipcMain.handle('update-orden-campos', async (event, sessionId, campos) => {
    try {
      requireRol(sessionId, 'admin');
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const stmt = db.prepare('UPDATE campos_config SET orden = ? WHERE id = ?');
        let totalChanges = 0;

        campos.forEach((campo) => {
          const result = stmt.run(campo.orden, campo.id);
          totalChanges += result.changes;
        });

        return {
          success: totalChanges > 0,
          changes: totalChanges,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al actualizar orden de campos:', error);
      throw error;
    }
  });
}

module.exports = { register };


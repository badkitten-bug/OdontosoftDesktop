const { getDatabase } = require('../db/database');
const { requireRol, requireSesion } = require('../auth/sesiones');

const CAMPOS_PERMITIDOS = [
  'nombre_clinica',
  'ruc',
  'direccion',
  'telefono',
  'email',
  'logo_path',
  'moneda_simbolo',
  'moneda_codigo',
  'igv_porcentaje',
  'formato_fecha',
];

const FORMATOS_FECHA_VALIDOS = new Set(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);

function getConfiguracion(db) {
  return db.prepare('SELECT * FROM configuracion_clinica WHERE id = 1').get();
}

function register(ipcMain) {
  // Lectura: pública dentro del proceso (no expone datos sensibles).
  // Útil para mostrar nombre de clínica en login/header antes de autenticarse.
  ipcMain.handle('get-configuracion-clinica', async () => {
    const db = getDatabase();
    return getConfiguracion(db) || null;
  });

  // Escritura: sólo admin.
  ipcMain.handle('set-configuracion-clinica', async (event, sessionId, data) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();

    const updates = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (data && Object.prototype.hasOwnProperty.call(data, campo)) {
        updates[campo] = data[campo];
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'Sin cambios' };
    }

    // Validaciones puntuales
    if (updates.igv_porcentaje !== undefined) {
      const v = Number(updates.igv_porcentaje);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        throw new Error('IGV inválido (debe estar entre 0 y 100)');
      }
      updates.igv_porcentaje = v;
    }
    if (updates.formato_fecha && !FORMATOS_FECHA_VALIDOS.has(updates.formato_fecha)) {
      throw new Error('Formato de fecha no soportado');
    }
    if (updates.nombre_clinica !== undefined) {
      const nombre = String(updates.nombre_clinica).trim();
      if (!nombre) throw new Error('El nombre de la clínica no puede estar vacío');
      updates.nombre_clinica = nombre;
    }
    if (updates.ruc !== undefined && updates.ruc) {
      const ruc = String(updates.ruc).trim();
      if (!/^\d{11}$/.test(ruc)) {
        throw new Error('El RUC debe tener exactamente 11 dígitos');
      }
      updates.ruc = ruc;
    }

    const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    const params = Object.values(updates);
    db.prepare(
      `UPDATE configuracion_clinica SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`
    ).run(...params);

    return { success: true, configuracion: getConfiguracion(db) };
  });

  // Marcar setup como completado (admin)
  ipcMain.handle('marcar-setup-completado', async (event, sessionId) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();
    db.prepare(
      'UPDATE configuracion_clinica SET setup_completado = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
    ).run();
    return { success: true };
  });

  // Estado del wizard (cualquier sesión)
  ipcMain.handle('get-estado-setup', async (event, sessionId) => {
    requireSesion(sessionId);
    const db = getDatabase();
    const cfg = getConfiguracion(db);
    return {
      setupCompletado: !!(cfg && cfg.setup_completado),
      tieneNombreClinica: !!(cfg && cfg.nombre_clinica && cfg.nombre_clinica !== 'Mi Clínica'),
    };
  });
}

module.exports = { register };

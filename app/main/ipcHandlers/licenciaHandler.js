const { getDatabase } = require('../db/database');
const { requireRol, requireSesion } = require('../auth/sesiones');
const { generarFingerprint } = require('../auth/fingerprint');
const { verificarClave } = require('../auth/licencia');

const LIMITE_PACIENTES_DEMO = 10;

function getLicencia(db) {
  return db.prepare('SELECT * FROM licencia WHERE id = 1').get();
}

/**
 * Lee el estado de licencia actual desde BD y revalida la firma.
 * Si la firma ya no es válida (clave pública nueva, fingerprint cambiado, etc.)
 * vuelve la licencia a 'demo' silenciosamente.
 */
function obtenerEstadoLicencia() {
  const db = getDatabase();
  const lic = getLicencia(db);
  const fingerprint = generarFingerprint();

  if (!lic) {
    db.prepare("INSERT OR IGNORE INTO licencia (id, tipo) VALUES (1, 'demo')").run();
  }

  if (!lic || lic.tipo === 'demo' || !lic.clave) {
    return {
      tipo: 'demo',
      fingerprint,
      limite_pacientes: LIMITE_PACIENTES_DEMO,
      email_cliente: null,
      nombre_cliente: null,
      activada_en: null,
    };
  }

  const verif = verificarClave(lic.clave, fingerprint);
  if (!verif.ok) {
    // Volver a demo y avisar al UI
    db.prepare(
      `UPDATE licencia SET tipo = 'demo', clave = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1`
    ).run();
    return {
      tipo: 'demo',
      fingerprint,
      limite_pacientes: LIMITE_PACIENTES_DEMO,
      email_cliente: null,
      nombre_cliente: null,
      activada_en: null,
      error_revalidacion: verif.error,
    };
  }

  return {
    tipo: lic.tipo,
    fingerprint,
    limite_pacientes: null, // sin límite en planes pagos
    email_cliente: lic.email_cliente,
    nombre_cliente: lic.nombre_cliente,
    activada_en: lic.activada_en,
  };
}

/**
 * Cuenta los pacientes registrados. Útil para verificar si el demo ya alcanzó el tope.
 */
function contarPacientes() {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM pacientes').get();
  return row?.count || 0;
}

function register(ipcMain) {
  // Estado de licencia actual (cualquier sesión válida puede leerlo)
  ipcMain.handle('get-licencia', async (event, sessionId) => {
    requireSesion(sessionId);
    const estado = obtenerEstadoLicencia();
    if (estado.tipo === 'demo') {
      const usados = contarPacientes();
      return {
        ...estado,
        pacientes_usados: usados,
        pacientes_restantes: Math.max(0, LIMITE_PACIENTES_DEMO - usados),
      };
    }
    return estado;
  });

  // Activar licencia (admin)
  ipcMain.handle('activar-licencia', async (event, sessionId, clave) => {
    requireRol(sessionId, 'admin');
    const fingerprint = generarFingerprint();
    const verif = verificarClave(clave, fingerprint);
    if (!verif.ok) {
      throw new Error(verif.error);
    }

    const { email, tipo } = verif.payload;
    const db = getDatabase();
    db.prepare(
      `UPDATE licencia
       SET tipo = ?, clave = ?, email_cliente = ?, fingerprint = ?,
           activada_en = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    ).run(tipo, clave.trim(), email || null, fingerprint);

    return { success: true, tipo, email };
  });

  // Volver a modo demo (admin) — útil si el cliente quiere reinstalar o mover de PC
  ipcMain.handle('desactivar-licencia', async (event, sessionId) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();
    db.prepare(
      `UPDATE licencia
       SET tipo = 'demo', clave = NULL, email_cliente = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    ).run();
    return { success: true };
  });
}

module.exports = {
  register,
  obtenerEstadoLicencia,
  LIMITE_PACIENTES_DEMO,
  contarPacientes,
};

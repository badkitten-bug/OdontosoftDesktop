const crypto = require('crypto');

const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

const sesiones = new Map();

function crearSesion(userId, rol, nombre) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sesiones.set(sessionId, {
    userId,
    rol,
    nombre,
    expiresAt: Date.now() + TTL_MS,
  });
  return sessionId;
}

function obtenerSesion(sessionId) {
  if (!sessionId) return null;
  const s = sesiones.get(sessionId);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sesiones.delete(sessionId);
    return null;
  }
  return s;
}

function destruirSesion(sessionId) {
  sesiones.delete(sessionId);
}

function refrescarSesion(sessionId) {
  const s = sesiones.get(sessionId);
  if (s) s.expiresAt = Date.now() + TTL_MS;
}

function requireSesion(sessionId) {
  const s = obtenerSesion(sessionId);
  if (!s) {
    const err = new Error('Sesión inválida o expirada');
    err.code = 'NO_AUTH';
    throw err;
  }
  return s;
}

function requireRol(sessionId, ...rolesPermitidos) {
  const s = requireSesion(sessionId);
  if (rolesPermitidos.length && !rolesPermitidos.includes(s.rol)) {
    const err = new Error('No tienes permiso para realizar esta acción');
    err.code = 'NO_PERMISSION';
    throw err;
  }
  return s;
}

module.exports = {
  crearSesion,
  obtenerSesion,
  destruirSesion,
  refrescarSesion,
  requireSesion,
  requireRol,
};

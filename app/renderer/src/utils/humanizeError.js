/**
 * Convierte un error técnico (SQLite, IPC, validación) en un mensaje
 * legible para un usuario sin contexto.
 */
const PATRONES = [
  {
    test: /UNIQUE constraint failed: usuarios\.username/i,
    mensaje: 'Ese nombre de usuario ya está en uso.',
  },
  {
    test: /UNIQUE constraint failed: pacientes\.dni/i,
    mensaje: 'Ya existe un paciente con ese DNI.',
  },
  {
    test: /UNIQUE constraint failed: tratamientos\.codigo/i,
    mensaje: 'Ya existe un tratamiento con ese código.',
  },
  {
    test: /UNIQUE constraint failed: facturas\.numero/i,
    mensaje: 'Ya existe un comprobante con ese número.',
  },
  {
    test: /FOREIGN KEY constraint failed/i,
    mensaje:
      'No se puede completar porque hay registros relacionados. Elimina o desvincula esos registros primero.',
  },
  {
    test: /NO_AUTH|Sesión inválida o expirada/i,
    mensaje: 'Tu sesión expiró. Cierra y vuelve a iniciar sesión.',
  },
  {
    test: /NO_PERMISSION|No tienes permiso/i,
    mensaje: 'No tienes permiso para realizar esta acción.',
  },
  {
    test: /DEMO_LIMIT|límite.*demo|alcanzado el límite/i,
    mensaje:
      'Has alcanzado el límite de la versión demo (10 pacientes). Activa una licencia para registrar más.',
  },
  {
    test: /se solapa con otra cita/i,
    mensaje: 'Ese horario se solapa con otra cita del odontólogo.',
  },
  {
    test: /hora de fin debe ser mayor/i,
    mensaje: 'La hora de fin debe ser posterior a la hora de inicio.',
  },
  {
    test: /SQLITE_BUSY|database is locked/i,
    mensaje:
      'La base de datos está ocupada por otro proceso. Cierra otras instancias de la app y reintenta.',
  },
];

const FALLBACKS_TECNICOS = [
  /^SqliteError/i,
  /^Error: SQL/i,
  /constraint failed/i,
];

export function humanizeError(err, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  if (!err) return fallback;
  const mensaje = typeof err === 'string' ? err : (err?.message || String(err));

  for (const p of PATRONES) {
    if (p.test.test(mensaje)) return p.mensaje;
  }

  // Si parece un mensaje técnico crudo, devolver fallback genérico
  for (const r of FALLBACKS_TECNICOS) {
    if (r.test(mensaje)) return fallback;
  }

  // Si no encaja con nada, devolver el mensaje original (suele venir ya humanizado del handler).
  return mensaje;
}

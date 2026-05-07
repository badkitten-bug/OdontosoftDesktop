const crypto = require('node:crypto');

/**
 * Verificación de claves de licencia firmadas con RSA.
 *
 * Una "clave" es: base64url(JSON_payload) + "." + base64url(firma_RSA)
 *
 * El JSON contiene: { email, tipo, fingerprint, emitida_en, expira_en? }
 * La firma se hace con la clave privada (que está fuera del repo) y se verifica
 * en la app con la clave pública embebida abajo.
 *
 * Para generar una nueva licencia:
 *   bun run scripts/generarLicencia.js --fingerprint=... --tipo=pro --email=...
 *
 * Para regenerar el par de claves (sólo se hace UNA vez al inicio del negocio):
 *   bun run scripts/generarParClaves.js
 *
 * La clave pública se reemplaza pegando el contenido en `PUBLIC_KEY_PEM` abajo.
 * La privada NUNCA se commitea — vive en `secrets/license-private.pem` (gitignored).
 */

// Placeholder. Reemplazar con la salida de scripts/generarParClaves.js.
// Mientras esté como placeholder, ninguna licencia es válida y la app permanece en demo.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
PUBLIC_KEY_PLACEHOLDER_REEMPLAZAR_TRAS_GENERAR_PAR
-----END PUBLIC KEY-----`;

const TIPOS_VALIDOS = new Set(['demo', 'esencial', 'pro', 'cloud']);

function decodeB64Url(s) {
  // base64url → base64
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

/**
 * Verifica una clave de licencia. Devuelve { ok: true, payload } o { ok: false, error }.
 *
 * @param {string} clave  La clave proporcionada por el cliente.
 * @param {string} fingerprintActual  El fingerprint de la PC actual.
 */
function verificarClave(clave, fingerprintActual) {
  if (!clave || typeof clave !== 'string') {
    return { ok: false, error: 'Clave vacía' };
  }
  if (PUBLIC_KEY_PEM.includes('PLACEHOLDER')) {
    return { ok: false, error: 'La clave pública aún no está configurada en esta build' };
  }

  const partes = clave.trim().split('.');
  if (partes.length !== 2) {
    return { ok: false, error: 'Formato de clave inválido' };
  }

  let payload;
  let firma;
  try {
    const payloadBytes = decodeB64Url(partes[0]);
    payload = JSON.parse(payloadBytes.toString('utf8'));
    firma = decodeB64Url(partes[1]);
  } catch (_e) {
    return { ok: false, error: 'No se pudo decodificar la clave' };
  }

  // Verificación criptográfica
  const verificador = crypto.createVerify('sha256');
  verificador.update(partes[0]); // se firma sobre el payload codificado
  verificador.end();
  const firmaValida = verificador.verify(PUBLIC_KEY_PEM, firma);
  if (!firmaValida) {
    return { ok: false, error: 'Firma de licencia inválida' };
  }

  // Validaciones de payload
  if (!payload.email || !payload.tipo || !payload.fingerprint) {
    return { ok: false, error: 'Licencia incompleta' };
  }
  if (!TIPOS_VALIDOS.has(payload.tipo)) {
    return { ok: false, error: `Tipo de licencia desconocido: ${payload.tipo}` };
  }
  if (payload.fingerprint !== fingerprintActual) {
    return { ok: false, error: 'Esta licencia fue emitida para otra computadora' };
  }
  if (payload.expira_en) {
    const exp = new Date(payload.expira_en).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) {
      return { ok: false, error: 'Esta licencia ha expirado' };
    }
  }

  return { ok: true, payload };
}

/**
 * Útil para tests y para mostrar el contenido de una licencia ya verificada.
 */
function decodificarPayload(clave) {
  try {
    const partes = clave.trim().split('.');
    if (partes.length !== 2) return null;
    return JSON.parse(decodeB64Url(partes[0]).toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  verificarClave,
  decodificarPayload,
  PUBLIC_KEY_PEM,
};

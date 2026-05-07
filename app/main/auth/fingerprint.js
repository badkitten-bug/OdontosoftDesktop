const os = require('node:os');
const crypto = require('node:crypto');

/**
 * Genera un fingerprint estable de la máquina actual.
 *
 * Combina:
 *  - hostname
 *  - MAC de la primera interfaz de red no virtual y no de loopback
 *  - plataforma + arquitectura
 *
 * Lo hashea con SHA-256 y devuelve los primeros 16 bytes en hex (32 chars).
 *
 * Notas:
 *  - Estable entre reinicios de la misma PC.
 *  - Cambia si el cliente cambia de PC, lo que es deseable: una licencia por máquina.
 *  - Si la MAC no está disponible (raro), usa el hostname solo. Sigue siendo único en
 *    la mayoría de casos pero menos robusto.
 */
function generarFingerprint() {
  const hostname = os.hostname() || 'unknown';
  const platform = `${os.platform()}-${os.arch()}`;

  let mac = '';
  const ifaces = os.networkInterfaces();
  for (const nombre of Object.keys(ifaces)) {
    const candidatos = (ifaces[nombre] || []).filter(
      (i) => !i.internal && i.mac && i.mac !== '00:00:00:00:00:00'
    );
    if (candidatos.length > 0) {
      mac = candidatos[0].mac;
      break;
    }
  }

  const payload = `${hostname}|${mac}|${platform}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

module.exports = { generarFingerprint };

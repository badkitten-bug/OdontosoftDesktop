#!/usr/bin/env node
/**
 * Genera el par de claves RSA usado para firmar licencias.
 *
 * Sólo lo corres UNA VEZ al inicio del negocio. La privada queda en
 * `secrets/license-private.pem` y NUNCA se commitea (está en .gitignore).
 *
 * Después de correr este script:
 *   1. Copia el contenido de `secrets/license-public.pem`.
 *   2. Pégalo en `app/main/auth/licencia.js` reemplazando PUBLIC_KEY_PLACEHOLDER.
 *   3. Reconstruye la app (bun run build) y publica esa build.
 *
 * Uso:
 *   node scripts/generarParClaves.js
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const secretsDir = path.join(__dirname, '..', 'secrets');
const privatePath = path.join(secretsDir, 'license-private.pem');
const publicPath = path.join(secretsDir, 'license-public.pem');

if (!fs.existsSync(secretsDir)) {
  fs.mkdirSync(secretsDir, { recursive: true });
}

if (fs.existsSync(privatePath)) {
  console.error(`Ya existe ${privatePath}. Mueve o borra el archivo antes de regenerar.`);
  console.error('CUIDADO: regenerar las claves invalida TODAS las licencias emitidas.');
  process.exit(1);
}

console.log('Generando par RSA-2048...');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicPath, publicKey);

console.log('Listo.');
console.log(`  privada: ${privatePath}  (NO COMMITEAR — guárdala fuera del repo además)`);
console.log(`  pública: ${publicPath}`);
console.log('');
console.log('Próximo paso: pega el contenido de license-public.pem en');
console.log('  app/main/auth/licencia.js → constante PUBLIC_KEY_PEM');

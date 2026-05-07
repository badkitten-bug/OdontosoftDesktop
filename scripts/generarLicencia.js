#!/usr/bin/env node
/**
 * Genera una clave de licencia firmada para un cliente.
 *
 * El cliente te da SU FINGERPRINT (lo ve en la pantalla "Licencia" de la app).
 * Tú corres este script con la clave privada y le mandas la salida por WhatsApp.
 *
 * Uso:
 *   node scripts/generarLicencia.js \
 *     --fingerprint=abc123def456... \
 *     --tipo=esencial \
 *     --email=cliente@gmail.com \
 *     --nombre="Clínica Sonrisas" \
 *     [--expira=2027-05-06]
 *
 * Tipos válidos: esencial | pro | cloud
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const args = parseArgs(process.argv);

const required = ['fingerprint', 'tipo', 'email'];
for (const k of required) {
  if (!args[k]) {
    console.error(`Falta --${k}`);
    process.exit(1);
  }
}

const tiposValidos = new Set(['esencial', 'pro', 'cloud']);
if (!tiposValidos.has(args.tipo)) {
  console.error(`tipo inválido. Usa uno de: ${[...tiposValidos].join(', ')}`);
  process.exit(1);
}

const privatePath = path.join(__dirname, '..', 'secrets', 'license-private.pem');
if (!fs.existsSync(privatePath)) {
  console.error(`No encontré la clave privada en ${privatePath}`);
  console.error('Corre primero: node scripts/generarParClaves.js');
  process.exit(1);
}
const privateKey = fs.readFileSync(privatePath, 'utf8');

const payload = {
  email: args.email,
  tipo: args.tipo,
  fingerprint: args.fingerprint,
  nombre_cliente: args.nombre || null,
  emitida_en: new Date().toISOString(),
};
if (args.expira) payload.expira_en = new Date(args.expira).toISOString();

const payloadB64 = b64url(JSON.stringify(payload));

const signer = crypto.createSign('sha256');
signer.update(payloadB64);
signer.end();
const firma = signer.sign(privateKey);
const firmaB64 = b64url(firma);

const clave = `${payloadB64}.${firmaB64}`;

console.log('--- LICENCIA GENERADA ---');
console.log('Cliente:', args.email, args.nombre || '');
console.log('Tipo:   ', args.tipo);
console.log('Para fingerprint:', args.fingerprint);
if (payload.expira_en) console.log('Expira:', payload.expira_en);
console.log('');
console.log('Clave (copia y manda al cliente):');
console.log(clave);

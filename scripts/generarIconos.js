#!/usr/bin/env node
/**
 * Genera todos los iconos de la app a partir de build/source/logo.svg.
 *
 * Flujo:
 *  1. Renderiza el SVG a PNG 1024x1024 con @resvg/resvg-js.
 *  2. Llama a electron-icon-builder, que genera:
 *       build/icon.ico    (Windows)
 *       build/icon.icns   (macOS)
 *       build/icon.png    (Linux + uso general)
 *       build/icons/*.png (resoluciones intermedias)
 *
 * Uso:
 *   bun run icons
 *
 * Cuando cambies el logo, edita build/source/logo.svg y vuelve a correr.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.join(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'build', 'source', 'logo.svg');
const PNG_PATH = path.join(ROOT, 'build', 'source', 'logo.png');
const OUT_DIR = path.join(ROOT, 'build');

if (!fs.existsSync(SVG_PATH)) {
  console.error(`No encontré ${SVG_PATH}`);
  console.error('Crea o restaura el archivo y vuelve a correr.');
  process.exit(1);
}

console.log(`[1/2] Renderizando SVG → PNG 1024×1024...`);
const svg = fs.readFileSync(SVG_PATH);
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: 'rgba(0,0,0,0)', // fondo transparente
});
const pngData = resvg.render().asPng();
fs.writeFileSync(PNG_PATH, pngData);
console.log(`      → ${PNG_PATH}`);

console.log(`[2/2] Generando .ico, .icns, .png con electron-icon-builder...`);
// Invocar directamente el script del paquete para evitar problemas con shims
// distintos entre npm/bun en Windows.
const cli = path.join(ROOT, 'node_modules', 'electron-icon-builder', 'index.js');
const result = spawnSync(
  process.execPath, // node
  [cli, '--input', PNG_PATH, '--output', OUT_DIR, '--flatten'],
  { stdio: 'inherit' }
);
if (result.status !== 0) {
  console.error('electron-icon-builder falló');
  process.exit(result.status || 1);
}

// electron-icon-builder pone los archivos en build/icons/. Los movemos
// a build/ donde electron-builder.yml los espera.
const ICONS_SUBDIR = path.join(OUT_DIR, 'icons');
const movimientos = [
  { from: 'icon.ico', to: 'icon.ico' },
  { from: 'icon.icns', to: 'icon.icns' },
  { from: '1024x1024.png', to: 'icon.png' },
];
for (const m of movimientos) {
  const src = path.join(ICONS_SUBDIR, m.from);
  const dst = path.join(OUT_DIR, m.to);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

console.log('');
console.log('Listo. Verifica que existan:');
for (const f of ['icon.ico', 'icon.icns', 'icon.png']) {
  const p = path.join(OUT_DIR, f);
  console.log(`  ${fs.existsSync(p) ? '✓' : '✗'}  ${p}`);
}

const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');
const { app, dialog } = require('electron');
const log = require('electron-log/main');

const { getDatabase } = require('../db/database');
const { requireRol } = require('../auth/sesiones');
const { generarFingerprint } = require('../auth/fingerprint');

/**
 * Recolecta info no sensible de la BD para diagnóstico.
 * Nada de payloads de pacientes, solo métricas y esquema.
 */
function recolectarInfoBD() {
  try {
    const db = getDatabase();
    const tablas = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);

    const conteos = {};
    for (const t of tablas) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM "${t}"`).get();
        conteos[t] = row?.count ?? 0;
      } catch (_) {
        conteos[t] = 'error';
      }
    }

    const cfg = db.prepare('SELECT * FROM configuracion_clinica WHERE id = 1').get() || null;
    const lic = db.prepare('SELECT * FROM licencia WHERE id = 1').get() || null;

    return {
      tablas,
      conteos,
      configuracion_clinica: cfg
        ? {
            nombre_clinica: cfg.nombre_clinica,
            moneda_codigo: cfg.moneda_codigo,
            igv_porcentaje: cfg.igv_porcentaje,
            formato_fecha: cfg.formato_fecha,
            setup_completado: !!cfg.setup_completado,
          }
        : null,
      licencia: lic
        ? {
            tipo: lic.tipo,
            email_cliente: lic.email_cliente,
            activada_en: lic.activada_en,
            tiene_clave: !!lic.clave,
          }
        : null,
    };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

function recolectarInfoSistema() {
  return {
    app_version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    os_release: require('node:os').release(),
    fingerprint: generarFingerprint(),
    timestamp: new Date().toISOString(),
  };
}

async function escribirZipDiagnostico(rutaDestino) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(rutaDestino);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);

    // 1. info-sistema.json
    archive.append(JSON.stringify(recolectarInfoSistema(), null, 2), {
      name: 'info-sistema.json',
    });

    // 2. info-bd.json
    archive.append(JSON.stringify(recolectarInfoBD(), null, 2), {
      name: 'info-bd.json',
    });

    // 3. logs (electron-log) — los que existan en userData/logs/
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (fs.existsSync(logsDir)) {
      try {
        for (const archivo of fs.readdirSync(logsDir)) {
          const ruta = path.join(logsDir, archivo);
          if (fs.statSync(ruta).isFile()) {
            archive.file(ruta, { name: `logs/${archivo}` });
          }
        }
      } catch (_) { /* best-effort */ }
    }

    archive.finalize();
  });
}

function register(ipcMain) {
  // Crear y guardar ZIP de diagnóstico (admin)
  ipcMain.handle('exportar-diagnostico', async (event, sessionId) => {
    requireRol(sessionId, 'admin');

    const sugerido = `diagnostico-odontosoft-${new Date().toISOString().split('T')[0]}.zip`;
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar diagnóstico',
      defaultPath: sugerido,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });

    if (canceled || !filePath) {
      return { success: false, cancelado: true };
    }

    log.info(`Generando diagnóstico en ${filePath}`);
    await escribirZipDiagnostico(filePath);
    log.info('Diagnóstico generado correctamente');

    return { success: true, ruta: filePath };
  });
}

module.exports = { register };

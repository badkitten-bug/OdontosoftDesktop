const { app } = require('electron');
const log = require('electron-log/main');
const { autoUpdater } = require('electron-updater');
const { requireRol } = require('./auth/sesiones');

/**
 * Integración con electron-updater (GitHub Releases por defecto, según
 * la config de electron-builder.yml `publish: github`).
 *
 * En desarrollo (app no empaquetada) está desactivado: electron-updater
 * no encuentra el `app-update.yml` y dispara errores ruidosos.
 */

let mainWindow = null;
let buscoAlInicio = false;

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false; // Lo controlamos a mano

function emitir(estado, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('update-status', { estado, ...payload });
    } catch (_) { /* ignore */ }
  }
}

function configurarListeners() {
  autoUpdater.on('checking-for-update', () => emitir('checking'));
  autoUpdater.on('update-available', (info) =>
    emitir('available', { version: info?.version, releaseNotes: info?.releaseNotes })
  );
  autoUpdater.on('update-not-available', (info) =>
    emitir('not-available', { version: info?.version || app.getVersion() })
  );
  autoUpdater.on('error', (err) =>
    emitir('error', { message: err?.message || String(err) })
  );
  autoUpdater.on('download-progress', (progress) =>
    emitir('progress', {
      percent: Math.round(progress.percent || 0),
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    })
  );
  autoUpdater.on('update-downloaded', (info) =>
    emitir('downloaded', { version: info?.version })
  );
}

function inicializar(window) {
  mainWindow = window;
  configurarListeners();

  // Sólo intentar buscar updates en builds empaquetados.
  if (!app.isPackaged || buscoAlInicio) return;
  buscoAlInicio = true;

  // Pequeño delay para no competir con el arranque.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Falló buscar actualizaciones al inicio:', err?.message || err);
    });
  }, 5000);
}

function register(ipcMain) {
  ipcMain.handle('buscar-actualizaciones', async (event, sessionId) => {
    requireRol(sessionId, 'admin');
    if (!app.isPackaged) {
      return { success: false, motivo: 'Sólo disponible en builds instalados' };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return {
        success: true,
        version: res?.updateInfo?.version,
        version_actual: app.getVersion(),
      };
    } catch (err) {
      log.error('Error buscando actualizaciones:', err);
      throw new Error(err?.message || 'Error al buscar actualizaciones');
    }
  });

  ipcMain.handle('instalar-actualizacion', async (event, sessionId) => {
    requireRol(sessionId, 'admin');
    if (!app.isPackaged) {
      return { success: false, motivo: 'Sólo disponible en builds instalados' };
    }
    // El cliente ya descargó; reiniciar e instalar.
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { success: true };
  });
}

module.exports = { inicializar, register };

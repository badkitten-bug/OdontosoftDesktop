const { getDatabase } = require('../db/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  crearSesion,
  destruirSesion,
  obtenerSesion,
  requireSesion,
  requireRol,
} = require('../auth/sesiones');
const { validarPasswordFuerte } = require('../auth/passwords');

const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function isBcryptHash(stored) {
  return typeof stored === 'string' && /^\$2[aby]\$/.test(stored);
}

function isLegacySha256(stored) {
  return typeof stored === 'string' && /^[a-f0-9]{64}$/i.test(stored);
}

function legacySha256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function verifyPassword(stored, plain) {
  if (isBcryptHash(stored)) {
    return { ok: await bcrypt.compare(plain, stored), legacy: false };
  }
  if (isLegacySha256(stored)) {
    const ok = legacySha256(plain) === stored;
    return { ok, legacy: ok };
  }
  return { ok: false, legacy: false };
}

function asegurarPasswordValido(password) {
  const { ok, error } = validarPasswordFuerte(password);
  if (!ok) {
    throw new Error(error);
  }
}

function register(ipcMain) {
  // ¿Existen usuarios? (para detectar primer arranque)
  ipcMain.handle('existen-usuarios', async () => {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
      return { existen: row.count > 0, total: row.count };
    } catch (error) {
      console.error('Error al verificar usuarios:', error);
      throw error;
    }
  });

  // Crear el primer admin (solo permitido si NO hay usuarios)
  ipcMain.handle('crear-primer-admin', async (event, data) => {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
      if (row.count > 0) {
        throw new Error('Ya existe al menos un usuario; este endpoint sólo aplica para el primer arranque');
      }

      const { username, password, nombre, email } = data || {};
      if (!username || !nombre) {
        throw new Error('username y nombre son obligatorios');
      }
      asegurarPasswordValido(password);

      const passwordHash = await hashPassword(password);
      const result = db
        .prepare(
          'INSERT INTO usuarios (username, password_hash, nombre, email, rol, activo) VALUES (?, ?, ?, ?, ?, 1)'
        )
        .run(username.trim(), passwordHash, nombre.trim(), email || null, 'admin');

      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error al crear primer admin:', error);
      throw error;
    }
  });

  // Login → devuelve sessionId
  ipcMain.handle('login', async (event, username, password) => {
    try {
      const db = getDatabase();
      const usuario = db
        .prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1')
        .get(username);

      if (!usuario) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      const { ok, legacy } = await verifyPassword(usuario.password_hash, password);
      if (!ok) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      // Migrar hash legacy SHA-256 → bcrypt al primer login válido
      if (legacy) {
        try {
          const nuevoHash = await hashPassword(password);
          db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
            .run(nuevoHash, usuario.id);
          console.log(`[auth] Hash migrado a bcrypt para usuario id=${usuario.id}`);
        } catch (e) {
          console.error('[auth] Error migrando hash a bcrypt:', e);
        }
      }

      db.prepare('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(usuario.id);

      const sessionId = crearSesion(usuario.id, usuario.rol, usuario.nombre);

      delete usuario.password_hash;
      return { success: true, usuario, sessionId };
    } catch (error) {
      console.error('Error al autenticar:', error);
      throw error;
    }
  });

  // Logout
  ipcMain.handle('logout', async (event, sessionId) => {
    destruirSesion(sessionId);
    return { success: true };
  });

  // Whoami: valida sessionId al cargar la app
  ipcMain.handle('whoami', async (event, sessionId) => {
    const sesion = obtenerSesion(sessionId);
    if (!sesion) return { autenticado: false };
    try {
      const db = getDatabase();
      const usuario = db
        .prepare('SELECT id, username, nombre, email, rol, activo, id_odontologo FROM usuarios WHERE id = ?')
        .get(sesion.userId);
      if (!usuario || !usuario.activo) {
        destruirSesion(sessionId);
        return { autenticado: false };
      }
      return { autenticado: true, usuario };
    } catch (error) {
      console.error('Error en whoami:', error);
      return { autenticado: false };
    }
  });

  // Listar usuarios (admin)
  ipcMain.handle('get-usuarios', async (event, sessionId) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();
    return db
      .prepare(
        `SELECT u.id, u.username, u.nombre, u.email, u.rol, u.activo, u.id_odontologo,
                u.created_at, u.updated_at, u.last_login,
                o.nombre as odontologo_nombre
         FROM usuarios u
         LEFT JOIN odontologos o ON u.id_odontologo = o.id
         ORDER BY u.nombre ASC`
      )
      .all();
  });

  // Obtener un usuario (admin o el propio usuario)
  ipcMain.handle('get-usuario', async (event, sessionId, id) => {
    const sesion = requireSesion(sessionId);
    if (sesion.rol !== 'admin' && sesion.userId !== id) {
      const err = new Error('Sin permiso para ver este usuario');
      err.code = 'NO_PERMISSION';
      throw err;
    }
    const db = getDatabase();
    const usuario = db
      .prepare('SELECT id, username, nombre, email, rol, activo, id_odontologo, created_at, updated_at, last_login FROM usuarios WHERE id = ?')
      .get(id);
    return usuario || null;
  });

  // Crear usuario (admin)
  ipcMain.handle('add-usuario', async (event, sessionId, data) => {
    requireRol(sessionId, 'admin');
    const db = getDatabase();
    const { username, password, nombre, email, rol, id_odontologo } = data || {};

    if (!username || !nombre || !rol) {
      throw new Error('username, nombre y rol son obligatorios');
    }
    asegurarPasswordValido(password);
    const rolesValidos = ['admin', 'recepcionista', 'odontologo'];
    if (!rolesValidos.includes(rol)) {
      throw new Error('Rol inválido');
    }

    const existe = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
    if (existe) {
      throw new Error('El nombre de usuario ya existe');
    }

    const passwordHash = await hashPassword(password);
    const result = db
      .prepare(
        'INSERT INTO usuarios (username, password_hash, nombre, email, rol, id_odontologo) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(username.trim(), passwordHash, nombre.trim(), email || null, rol, id_odontologo || null);

    return { id: result.lastInsertRowid, success: true };
  });

  // Actualizar usuario:
  //  - admin puede actualizar cualquier usuario y cualquier campo
  //  - usuario no-admin solo puede actualizarse a sí mismo y solo nombre, email y password
  ipcMain.handle('update-usuario', async (event, sessionId, id, data) => {
    const sesion = requireSesion(sessionId);
    const esAdmin = sesion.rol === 'admin';
    const esSelf = sesion.userId === id;

    if (!esAdmin && !esSelf) {
      const err = new Error('Sin permiso para actualizar este usuario');
      err.code = 'NO_PERMISSION';
      throw err;
    }

    const db = getDatabase();
    const { nombre, email, rol, id_odontologo, activo, password } = data || {};

    if (password) {
      asegurarPasswordValido(password);
    }

    let query, params;
    if (esAdmin) {
      const rolesValidos = ['admin', 'recepcionista', 'odontologo'];
      if (rol && !rolesValidos.includes(rol)) {
        throw new Error('Rol inválido');
      }
      query = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, id_odontologo = ?, activo = ?';
      params = [
        nombre,
        email || null,
        rol,
        id_odontologo || null,
        activo !== undefined ? (activo ? 1 : 0) : 1,
      ];
    } else {
      // Self-update: solo nombre, email y password
      query = 'UPDATE usuarios SET nombre = COALESCE(?, nombre), email = COALESCE(?, email)';
      params = [nombre || null, email || null];
    }

    if (password) {
      query += ', password_hash = ?';
      params.push(await hashPassword(password));
    }

    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);

    const result = db.prepare(query).run(...params);
    return { success: result.changes > 0, changes: result.changes };
  });

  // Eliminar usuario (admin, no puede eliminarse a sí mismo)
  ipcMain.handle('delete-usuario', async (event, sessionId, id) => {
    const sesion = requireRol(sessionId, 'admin');
    if (sesion.userId === id) {
      throw new Error('No puedes eliminar tu propio usuario');
    }
    const db = getDatabase();
    // Evitar dejar la app sin ningún admin activo
    const usuario = db.prepare('SELECT rol FROM usuarios WHERE id = ?').get(id);
    if (usuario && usuario.rol === 'admin') {
      const otrosAdmins = db
        .prepare('SELECT COUNT(*) as count FROM usuarios WHERE rol = ? AND activo = 1 AND id != ?')
        .get('admin', id);
      if (otrosAdmins.count === 0) {
        throw new Error('No puedes eliminar al último administrador activo');
      }
    }
    const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
    return { success: result.changes > 0, changes: result.changes };
  });

  // Permisos
  ipcMain.handle('get-permisos-rol', async (event, sessionId, rol) => {
    requireSesion(sessionId);
    const db = getDatabase();
    return db.prepare('SELECT * FROM permisos WHERE rol = ? AND activo = 1').all(rol);
  });

  ipcMain.handle('verificar-permiso', async (event, sessionId, rol, modulo, permiso) => {
    requireSesion(sessionId);
    const db = getDatabase();
    const resultado = db
      .prepare('SELECT 1 FROM permisos WHERE rol = ? AND modulo = ? AND permiso = ? AND activo = 1')
      .get(rol, modulo, permiso);
    return { tienePermiso: !!resultado };
  });

  ipcMain.handle('recuperar-password', async (_event, { nombreClinica, username, newPassword }) => {
    try {
      const db = getDatabase();
      const cfg = db.prepare('SELECT nombre_clinica FROM configuracion_clinica WHERE id = 1').get();
      if (!cfg?.nombre_clinica) return { success: false, error: 'No hay clínica registrada' };
      const coincide = cfg.nombre_clinica.trim().toLowerCase() === String(nombreClinica).trim().toLowerCase();
      if (!coincide) return { success: false, error: 'El nombre de la clínica no coincide' };

      // Paso 1: solo verificar clínica y devolver lista de usuarios admin
      if (!username && !newPassword) {
        const admins = db.prepare("SELECT username, nombre FROM usuarios WHERE rol = 'admin' AND activo = 1 ORDER BY id ASC").all();
        return { success: true, usuarios: admins };
      }

      // Paso 2: resetear contraseña del usuario seleccionado
      if (!newPassword || newPassword.length < 8) return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
      if (!/[A-Z]/.test(newPassword)) return { success: false, error: 'Debe incluir al menos una letra mayúscula' };
      if (!/\d/.test(newPassword)) return { success: false, error: 'Debe incluir al menos un número' };
      const target = db.prepare("SELECT id FROM usuarios WHERE username = ? AND rol = 'admin' AND activo = 1").get(username);
      if (!target) return { success: false, error: 'Usuario no encontrado' };
      const hash = await hashPassword(newPassword);
      db.prepare('UPDATE usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, target.id);
      return { success: true };
    } catch (e) {
      console.error('[recuperar-password]', e);
      return { success: false, error: e.message };
    }
  });
}

module.exports = { register };

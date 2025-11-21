const { getDatabase } = require('../db/database');
const crypto = require('crypto');

/**
 * Hash de contraseña simple (en producción usar bcrypt)
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Registra los handlers IPC para usuarios
 */
function register(ipcMain) {
  // Obtener todos los usuarios
  ipcMain.handle('get-usuarios', async () => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          `SELECT u.*, o.nombre as odontologo_nombre 
           FROM usuarios u
           LEFT JOIN odontologos o ON u.id_odontologo = o.id
           ORDER BY u.nombre ASC`
        )
        .all();
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  });

  // Obtener un usuario
  ipcMain.handle('get-usuario', async (event, id) => {
    try {
      const db = getDatabase();
      const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
      if (usuario) {
        delete usuario.password_hash; // No devolver el hash
      }
      return usuario;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  });

  // Autenticar usuario
  ipcMain.handle('login', async (event, username, password) => {
    try {
      const db = getDatabase();
      const passwordHash = hashPassword(password);
      const usuario = db
        .prepare('SELECT * FROM usuarios WHERE username = ? AND password_hash = ? AND activo = 1')
        .get(username, passwordHash);

      if (usuario) {
        // Actualizar último login
        db.prepare('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(usuario.id);
        delete usuario.password_hash; // No devolver el hash
        return { success: true, usuario };
      }

      return { success: false, error: 'Usuario o contraseña incorrectos' };
    } catch (error) {
      console.error('Error al autenticar:', error);
      throw error;
    }
  });

  // Crear usuario
  ipcMain.handle('add-usuario', async (event, data) => {
    try {
      const db = getDatabase();
      const { username, password, nombre, email, rol, id_odontologo } = data;

      // Verificar que el username no exista
      const existe = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
      if (existe) {
        throw new Error('El nombre de usuario ya existe');
      }

      const passwordHash = hashPassword(password);

      const result = db
        .prepare(
          'INSERT INTO usuarios (username, password_hash, nombre, email, rol, id_odontologo) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(username, passwordHash, nombre, email || null, rol, id_odontologo || null);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  });

  // Actualizar usuario
  ipcMain.handle('update-usuario', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { nombre, email, rol, id_odontologo, activo, password } = data;

      let query = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, id_odontologo = ?, activo = ?';
      const params = [nombre, email || null, rol, id_odontologo || null, activo !== undefined ? (activo ? 1 : 0) : 1];

      if (password) {
        query += ', password_hash = ?';
        params.push(hashPassword(password));
      }

      query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params.push(id);

      const result = db.prepare(query).run(...params);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  });

  // Eliminar usuario
  ipcMain.handle('delete-usuario', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  });

  // Obtener permisos de un rol
  ipcMain.handle('get-permisos-rol', async (event, rol) => {
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM permisos WHERE rol = ? AND activo = 1').all(rol);
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      throw error;
    }
  });

  // Verificar permiso
  ipcMain.handle('verificar-permiso', async (event, rol, modulo, permiso) => {
    try {
      const db = getDatabase();
      const resultado = db
        .prepare('SELECT 1 FROM permisos WHERE rol = ? AND modulo = ? AND permiso = ? AND activo = 1')
        .get(rol, modulo, permiso);

      return { tienePermiso: !!resultado };
    } catch (error) {
      console.error('Error al verificar permiso:', error);
      throw error;
    }
  });
}

module.exports = { register };


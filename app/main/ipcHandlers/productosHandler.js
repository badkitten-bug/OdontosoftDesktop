const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para productos
 */
function register(ipcMain) {
  // Obtener todos los productos
  ipcMain.handle('get-productos', async () => {
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM productos ORDER BY nombre ASC').all();
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  });

  // Obtener un producto por ID
  ipcMain.handle('get-producto', async (event, id) => {
    try {
      const db = getDatabase();
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }
  });

  // Agregar nuevo producto
  ipcMain.handle('add-producto', async (event, data) => {
    try {
      const db = getDatabase();
      const { nombre, stock = 0, stock_minimo = 0, precio = 0.0, descripcion = '' } = data;

      const result = db
        .prepare(
          'INSERT INTO productos (nombre, stock, stock_minimo, precio, descripcion) VALUES (?, ?, ?, ?, ?)'
        )
        .run(nombre, stock, stock_minimo, precio, descripcion);

      return {
        id: result.lastInsertRowid,
        success: true,
      };
    } catch (error) {
      console.error('Error al agregar producto:', error);
      throw error;
    }
  });

  // Actualizar producto
  ipcMain.handle('update-producto', async (event, id, data) => {
    try {
      const db = getDatabase();
      const { nombre, stock, stock_minimo, precio, descripcion = '' } = data;

      const result = db
        .prepare(
          'UPDATE productos SET nombre = ?, stock = ?, stock_minimo = ?, precio = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(nombre, stock, stock_minimo || 0, precio, descripcion, id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  });

  // Eliminar producto
  ipcMain.handle('delete-producto', async (event, id) => {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM productos WHERE id = ?').run(id);

      return {
        success: result.changes > 0,
        changes: result.changes,
      };
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  });
}

module.exports = { register };


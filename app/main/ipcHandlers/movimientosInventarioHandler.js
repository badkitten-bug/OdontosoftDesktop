const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para movimientos de inventario
 */
function register(ipcMain) {
  // Obtener movimientos de un producto
  ipcMain.handle('get-movimientos-producto', async (event, idProducto, filtros = {}) => {
    try {
      const db = getDatabase();
      let query = 'SELECT * FROM movimientos_inventario WHERE id_producto = ?';
      const params = [idProducto];

      if (filtros.tipo) {
        query += ' AND tipo = ?';
        params.push(filtros.tipo);
      }

      if (filtros.fecha_inicio) {
        query += ' AND DATE(created_at) >= ?';
        params.push(filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        query += ' AND DATE(created_at) <= ?';
        params.push(filtros.fecha_fin);
      }

      query += ' ORDER BY created_at DESC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  });

  // Obtener todos los movimientos
  ipcMain.handle('get-movimientos', async (event, filtros = {}) => {
    try {
      const db = getDatabase();
      let query = `
        SELECT m.*, p.nombre as producto_nombre 
        FROM movimientos_inventario m
        LEFT JOIN productos p ON m.id_producto = p.id
        WHERE 1=1
      `;
      const params = [];

      if (filtros.tipo) {
        query += ' AND m.tipo = ?';
        params.push(filtros.tipo);
      }

      if (filtros.id_producto) {
        query += ' AND m.id_producto = ?';
        params.push(filtros.id_producto);
      }

      if (filtros.fecha_inicio) {
        query += ' AND DATE(m.created_at) >= ?';
        params.push(filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        query += ' AND DATE(m.created_at) <= ?';
        params.push(filtros.fecha_fin);
      }

      query += ' ORDER BY m.created_at DESC LIMIT 500';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  });

  // Registrar movimiento de inventario
  ipcMain.handle('add-movimiento-inventario', async (event, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { id_producto, tipo, cantidad, motivo, referencia, usuario } = data;

        // Obtener stock actual
        const producto = db.prepare('SELECT stock FROM productos WHERE id = ?').get(id_producto);
        if (!producto) {
          throw new Error('Producto no encontrado');
        }

        const stockAnterior = producto.stock;
        let stockNuevo;

        if (tipo === 'entrada') {
          stockNuevo = stockAnterior + cantidad;
        } else if (tipo === 'salida') {
          stockNuevo = stockAnterior - cantidad;
          if (stockNuevo < 0) {
            throw new Error('No hay suficiente stock');
          }
        } else if (tipo === 'ajuste') {
          stockNuevo = cantidad; // En ajuste, cantidad es el nuevo stock
        } else {
          throw new Error('Tipo de movimiento inválido');
        }

        // Actualizar stock del producto
        db.prepare('UPDATE productos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          stockNuevo,
          id_producto
        );

        // Registrar movimiento
        const result = db
          .prepare(
            'INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            id_producto,
            tipo,
            tipo === 'ajuste' ? Math.abs(stockNuevo - stockAnterior) : cantidad,
            stockAnterior,
            stockNuevo,
            motivo || null,
            referencia || null,
            usuario || 'Sistema'
          );

        return {
          id: result.lastInsertRowid,
          success: true,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      throw error;
    }
  });

  // Obtener productos con stock bajo
  ipcMain.handle('get-productos-stock-bajo', async () => {
    try {
      const db = getDatabase();
      return db
        .prepare(
          'SELECT * FROM productos WHERE stock <= stock_minimo AND stock_minimo > 0 ORDER BY (stock - stock_minimo) ASC'
        )
        .all();
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      throw error;
    }
  });
}

module.exports = { register };


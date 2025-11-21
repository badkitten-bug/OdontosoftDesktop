const { getDatabase } = require('../db/database');

/**
 * Registra los handlers IPC para facturas y pagos
 */
function register(ipcMain) {
  // Generar número de factura único
  function generarNumeroFactura() {
    const db = getDatabase();
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    
    // Buscar el último número del mes
    const ultimaFactura = db
      .prepare('SELECT numero FROM facturas WHERE numero LIKE ? ORDER BY id DESC LIMIT 1')
      .get(`FAC-${año}${mes}-%`);

    let siguienteNumero = 1;
    if (ultimaFactura) {
      const partes = ultimaFactura.numero.split('-');
      const numero = parseInt(partes[2]) || 0;
      siguienteNumero = numero + 1;
    }

    return `FAC-${año}${mes}-${String(siguienteNumero).padStart(4, '0')}`;
  }

  // Obtener todas las facturas
  ipcMain.handle('get-facturas', async (event, filtros = {}) => {
    try {
      const db = getDatabase();
      let query = 'SELECT f.*, p.nombre as paciente_nombre FROM facturas f LEFT JOIN pacientes p ON f.id_paciente = p.id WHERE 1=1';
      const params = [];

      if (filtros.id_paciente) {
        query += ' AND f.id_paciente = ?';
        params.push(filtros.id_paciente);
      }
      if (filtros.estado) {
        query += ' AND f.estado = ?';
        params.push(filtros.estado);
      }
      if (filtros.fecha_desde) {
        query += ' AND f.fecha >= ?';
        params.push(filtros.fecha_desde);
      }
      if (filtros.fecha_hasta) {
        query += ' AND f.fecha <= ?';
        params.push(filtros.fecha_hasta);
      }

      query += ' ORDER BY f.fecha DESC, f.id DESC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      throw error;
    }
  });

  // Obtener una factura por ID
  ipcMain.handle('get-factura', async (event, id) => {
    try {
      const db = getDatabase();
      const factura = db
        .prepare(
          'SELECT f.*, p.nombre as paciente_nombre FROM facturas f LEFT JOIN pacientes p ON f.id_paciente = p.id WHERE f.id = ?'
        )
        .get(id);

      return factura;
    } catch (error) {
      console.error('Error al obtener factura:', error);
      throw error;
    }
  });

  // Crear factura directamente (sin cita) - alias para compatibilidad
  ipcMain.handle('crear-factura-directa', async (event, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { id_paciente, fecha, subtotal = 0, descuento = 0, impuesto = 0, observaciones } = data;
        
        // Validar que id_paciente sea un número válido
        if (!id_paciente || isNaN(parseInt(id_paciente))) {
          throw new Error('ID de paciente inválido');
        }
        
        // Asegurar que los valores numéricos sean correctos
        const subtotalNum = parseFloat(subtotal) || 0;
        const descuentoNum = parseFloat(descuento) || 0;
        const impuestoNum = parseFloat(impuesto) || 0;
        const total = subtotalNum - descuentoNum + impuestoNum;
        
        const numeroFactura = generarNumeroFactura();
        const fechaFactura = fecha || new Date().toISOString().split('T')[0];
        
        const result = db
          .prepare(
            'INSERT INTO facturas (numero, id_paciente, fecha, subtotal, descuento, impuesto, total, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            numeroFactura,
            parseInt(id_paciente),
            fechaFactura,
            subtotalNum,
            descuentoNum,
            impuestoNum,
            total,
            'pendiente',
            observaciones || null
          );

        return {
          id: result.lastInsertRowid,
          numero: numeroFactura,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al crear factura directa:', error);
      throw error;
    }
  });

  // Crear factura directamente (sin cita)
  ipcMain.handle('crear-factura', async (event, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { id_paciente, fecha, subtotal = 0, descuento = 0, impuesto = 0, observaciones } = data;
        
        // Validar que id_paciente sea un número válido
        if (!id_paciente || isNaN(parseInt(id_paciente))) {
          throw new Error('ID de paciente inválido');
        }
        
        // Asegurar que los valores numéricos sean correctos
        const subtotalNum = parseFloat(subtotal) || 0;
        const descuentoNum = parseFloat(descuento) || 0;
        const impuestoNum = parseFloat(impuesto) || 0;
        const total = subtotalNum - descuentoNum + impuestoNum;
        
        const numeroFactura = generarNumeroFactura();
        const fechaFactura = fecha || new Date().toISOString().split('T')[0];
        
        const result = db
          .prepare(
            'INSERT INTO facturas (numero, id_paciente, fecha, subtotal, descuento, impuesto, total, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            numeroFactura,
            parseInt(id_paciente),
            fechaFactura,
            subtotalNum,
            descuentoNum,
            impuestoNum,
            total,
            'pendiente',
            observaciones || null
          );

        return {
          id: result.lastInsertRowid,
          numero: numeroFactura,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  });

  // Crear factura desde una cita
  ipcMain.handle('crear-factura-desde-cita', async (event, idCita) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        // Obtener la cita con sus tratamientos
        const cita = db
          .prepare(
            'SELECT c.*, p.id as id_paciente FROM citas c LEFT JOIN pacientes p ON c.id_paciente = p.id WHERE c.id = ?'
          )
          .get(idCita);

        if (!cita) {
          throw new Error('Cita no encontrada');
        }

        // Obtener tratamientos de la cita
        const tratamientos = db
          .prepare(
            'SELECT ct.*, t.nombre as tratamiento_nombre FROM citas_tratamientos ct LEFT JOIN tratamientos t ON ct.id_tratamiento = t.id WHERE ct.id_cita = ?'
          )
          .all(idCita);

        // Calcular totales
        let subtotal = 0;
        tratamientos.forEach((t) => {
          const totalItem = (t.precio_unitario * t.cantidad) - (t.descuento || 0);
          subtotal += totalItem;
        });

        const descuento = 0; // Se puede agregar descuento general
        const impuesto = 0; // Se puede calcular impuesto
        const total = subtotal - descuento + impuesto;

        // Crear factura
        const numeroFactura = generarNumeroFactura();
        const result = db
          .prepare(
            'INSERT INTO facturas (numero, id_cita, id_paciente, fecha, subtotal, descuento, impuesto, total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            numeroFactura,
            idCita,
            cita.id_paciente,
            new Date().toISOString().split('T')[0],
            subtotal,
            descuento,
            impuesto,
            total,
            'pendiente'
          );

        return {
          id: result.lastInsertRowid,
          numero: numeroFactura,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al crear factura desde cita:', error);
      throw error;
    }
  });

  // Agregar pago
  ipcMain.handle('add-pago', async (event, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { id_factura, monto, metodo_pago, fecha, referencia, observaciones } = data;

        // Agregar pago
        const result = db
          .prepare(
            'INSERT INTO pagos (id_factura, monto, metodo_pago, fecha, referencia, observaciones) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(
            id_factura,
            monto,
            metodo_pago,
            fecha,
            referencia || null,
            observaciones || null
          );

        // Calcular total pagado de la factura
        const pagos = db
          .prepare('SELECT SUM(monto) as total_pagado FROM pagos WHERE id_factura = ?')
          .get(id_factura);

        const factura = db.prepare('SELECT total FROM facturas WHERE id = ?').get(id_factura);

        // Si el total pagado es igual o mayor al total, marcar como pagada
        if (pagos.total_pagado >= factura.total) {
          db.prepare('UPDATE facturas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            'pagada',
            id_factura
          );
        }

        return {
          id: result.lastInsertRowid,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al agregar pago:', error);
      throw error;
    }
  });

  // Obtener pagos de una factura
  ipcMain.handle('get-pagos-factura', async (event, idFactura) => {
    try {
      const db = getDatabase();
      return db
        .prepare('SELECT * FROM pagos WHERE id_factura = ? ORDER BY fecha DESC')
        .all(idFactura);
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      throw error;
    }
  });

  // Actualizar pago
  ipcMain.handle('update-pago', async (event, id, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { monto, metodo_pago, fecha, referencia, observaciones } = data;

        // Obtener el pago para saber a qué factura pertenece
        const pago = db.prepare('SELECT id_factura FROM pagos WHERE id = ?').get(id);
        if (!pago) {
          throw new Error('Pago no encontrado');
        }

        // Actualizar pago
        db.prepare(
          'UPDATE pagos SET monto = ?, metodo_pago = ?, fecha = ?, referencia = ?, observaciones = ? WHERE id = ?'
        ).run(monto, metodo_pago, fecha, referencia || null, observaciones || null, id);

        // Recalcular total pagado de la factura
        const pagos = db
          .prepare('SELECT SUM(monto) as total_pagado FROM pagos WHERE id_factura = ?')
          .get(pago.id_factura);

        const factura = db.prepare('SELECT total FROM facturas WHERE id = ?').get(pago.id_factura);

        // Si el total pagado es igual o mayor al total, marcar como pagada, sino pendiente
        if (pagos.total_pagado >= factura.total) {
          db.prepare('UPDATE facturas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            'pagada',
            pago.id_factura
          );
        } else {
          db.prepare('UPDATE facturas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            'pendiente',
            pago.id_factura
          );
        }

        return { success: true };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      throw error;
    }
  });

  // Eliminar pago
  ipcMain.handle('delete-pago', async (event, id) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        // Obtener el pago para saber a qué factura pertenece
        const pago = db.prepare('SELECT id_factura FROM pagos WHERE id = ?').get(id);
        if (!pago) {
          throw new Error('Pago no encontrado');
        }

        // Eliminar pago
        db.prepare('DELETE FROM pagos WHERE id = ?').run(id);

        // Recalcular total pagado de la factura
        const pagos = db
          .prepare('SELECT SUM(monto) as total_pagado FROM pagos WHERE id_factura = ?')
          .get(pago.id_factura);

        const factura = db.prepare('SELECT total FROM facturas WHERE id = ?').get(pago.id_factura);

        // Si el total pagado es igual o mayor al total, marcar como pagada, sino pendiente
        if (pagos.total_pagado >= factura.total) {
          db.prepare('UPDATE facturas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            'pagada',
            pago.id_factura
          );
        } else {
          db.prepare('UPDATE facturas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            'pendiente',
            pago.id_factura
          );
        }

        return { success: true };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      throw error;
    }
  });
}

module.exports = { register };


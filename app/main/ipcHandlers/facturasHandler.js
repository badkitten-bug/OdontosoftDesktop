const { getDatabase } = require('../db/database');
const { validarDNI, validarRUC } = require('../validation/identidad');

const TIPOS_VALIDOS = new Set(['boleta', 'factura']);

function getConfigClinica(db) {
  return db.prepare('SELECT * FROM configuracion_clinica WHERE id = 1').get() || {};
}

function serieParaTipo(tipo) {
  return tipo === 'factura' ? 'F001' : 'B001';
}

/**
 * Genera el siguiente número correlativo para una serie SUNAT.
 * Devuelve { numero: 'F001-00000123', serie: 'F001', correlativo: 123 }.
 */
function siguienteCorrelativo(db, tipo) {
  const serie = serieParaTipo(tipo);
  const row = db
    .prepare('SELECT MAX(correlativo) as max_corr FROM facturas WHERE serie = ?')
    .get(serie);
  const correlativo = (row?.max_corr || 0) + 1;
  const numero = `${serie}-${String(correlativo).padStart(8, '0')}`;
  return { numero, serie, correlativo };
}

/**
 * Resuelve los datos del comprobante a partir de la entrada del cliente.
 * Aplica reglas SUNAT: factura requiere RUC válido y razón social;
 * boleta acepta DNI opcional pero validado si se proporciona.
 */
function resolverComprobante(data) {
  const tipo = data.tipo_comprobante || 'boleta';
  if (!TIPOS_VALIDOS.has(tipo)) {
    throw new Error(`Tipo de comprobante inválido: ${tipo}`);
  }

  const cliente_dni = data.cliente_dni ? String(data.cliente_dni).trim() : null;
  const cliente_ruc = data.cliente_ruc ? String(data.cliente_ruc).trim() : null;
  const cliente_razon_social = data.cliente_razon_social
    ? String(data.cliente_razon_social).trim()
    : null;

  if (tipo === 'factura') {
    if (!cliente_ruc) throw new Error('Una factura requiere RUC del cliente');
    const v = validarRUC(cliente_ruc);
    if (!v.ok) throw new Error(v.error);
    if (!cliente_razon_social) throw new Error('Una factura requiere razón social del cliente');
  }
  if (cliente_dni) {
    const v = validarDNI(cliente_dni);
    if (!v.ok) throw new Error(v.error);
  }

  return { tipo, cliente_dni, cliente_ruc, cliente_razon_social };
}

/**
 * Calcula los montos de la factura.
 * Si data.calcular_igv_auto === true, usa el porcentaje de la config.
 * En caso contrario, usa el impuesto provisto (compatible con el flujo viejo).
 */
function calcularMontos(db, data) {
  const subtotal = parseFloat(data.subtotal) || 0;
  const descuento = parseFloat(data.descuento) || 0;
  const baseImponible = Math.max(0, subtotal - descuento);

  let impuesto;
  if (data.calcular_igv_auto) {
    const cfg = getConfigClinica(db);
    const pct = Number(cfg.igv_porcentaje ?? 18);
    impuesto = +(baseImponible * (pct / 100)).toFixed(2);
  } else {
    impuesto = parseFloat(data.impuesto) || 0;
  }

  const total = +(baseImponible + impuesto).toFixed(2);
  return { subtotal, descuento, impuesto, total };
}

/**
 * Registra los handlers IPC para facturas y pagos
 */
function register(ipcMain) {

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
        const { id_paciente, fecha, observaciones } = data;

        if (!id_paciente || Number.isNaN(Number.parseInt(id_paciente, 10))) {
          throw new Error('ID de paciente inválido');
        }

        const comprobante = resolverComprobante(data);
        const montos = calcularMontos(db, data);
        const { numero, serie, correlativo } = siguienteCorrelativo(db, comprobante.tipo);
        const fechaFactura = fecha || new Date().toISOString().split('T')[0];

        const result = db
          .prepare(
            `INSERT INTO facturas
             (numero, id_paciente, fecha, subtotal, descuento, impuesto, total,
              estado, observaciones, tipo_comprobante, serie, correlativo,
              cliente_dni, cliente_ruc, cliente_razon_social)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            numero,
            Number.parseInt(id_paciente, 10),
            fechaFactura,
            montos.subtotal,
            montos.descuento,
            montos.impuesto,
            montos.total,
            'pendiente',
            observaciones || null,
            comprobante.tipo,
            serie,
            correlativo,
            comprobante.cliente_dni,
            comprobante.cliente_ruc,
            comprobante.cliente_razon_social
          );

        return {
          id: result.lastInsertRowid,
          numero,
          serie,
          correlativo,
          tipo_comprobante: comprobante.tipo,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al crear factura directa:', error);
      throw error;
    }
  });

  // Crear factura directamente (alias mantenido por compatibilidad UI)
  ipcMain.handle('crear-factura', async (event, data) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const { id_paciente, fecha, observaciones } = data;

        if (!id_paciente || Number.isNaN(Number.parseInt(id_paciente, 10))) {
          throw new Error('ID de paciente inválido');
        }

        const comprobante = resolverComprobante(data);
        const montos = calcularMontos(db, data);
        const { numero, serie, correlativo } = siguienteCorrelativo(db, comprobante.tipo);
        const fechaFactura = fecha || new Date().toISOString().split('T')[0];

        const result = db
          .prepare(
            `INSERT INTO facturas
             (numero, id_paciente, fecha, subtotal, descuento, impuesto, total,
              estado, observaciones, tipo_comprobante, serie, correlativo,
              cliente_dni, cliente_ruc, cliente_razon_social)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            numero,
            Number.parseInt(id_paciente, 10),
            fechaFactura,
            montos.subtotal,
            montos.descuento,
            montos.impuesto,
            montos.total,
            'pendiente',
            observaciones || null,
            comprobante.tipo,
            serie,
            correlativo,
            comprobante.cliente_dni,
            comprobante.cliente_ruc,
            comprobante.cliente_razon_social
          );

        return {
          id: result.lastInsertRowid,
          numero,
          serie,
          correlativo,
          tipo_comprobante: comprobante.tipo,
          success: true,
        };
      });

      return transaccion();
    } catch (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  });

  // Crear factura desde una cita (IGV automático, tipo según datos del paciente)
  ipcMain.handle('crear-factura-desde-cita', async (event, idCita, opciones = {}) => {
    try {
      const db = getDatabase();
      const transaccion = db.transaction(() => {
        const cita = db
          .prepare(
            `SELECT c.*, p.id as id_paciente, p.nombre as paciente_nombre,
                    p.dni as paciente_dni
             FROM citas c
             LEFT JOIN pacientes p ON c.id_paciente = p.id
             WHERE c.id = ?`
          )
          .get(idCita);

        if (!cita) throw new Error('Cita no encontrada');

        const tratamientos = db
          .prepare(
            `SELECT ct.*, t.nombre as tratamiento_nombre
             FROM citas_tratamientos ct
             LEFT JOIN tratamientos t ON ct.id_tratamiento = t.id
             WHERE ct.id_cita = ?`
          )
          .all(idCita);

        let subtotal = 0;
        for (const t of tratamientos) {
          subtotal += (t.precio_unitario * t.cantidad) - (t.descuento || 0);
        }

        // El tipo se puede forzar desde la UI; si no, inferir por datos del paciente
        const tipoSugerido = opciones.tipo_comprobante
          || (opciones.cliente_ruc ? 'factura' : 'boleta');

        const datosComprobante = {
          tipo_comprobante: tipoSugerido,
          cliente_dni: opciones.cliente_dni ?? cita.paciente_dni ?? null,
          cliente_ruc: opciones.cliente_ruc ?? null,
          cliente_razon_social: opciones.cliente_razon_social ?? cita.paciente_nombre ?? null,
        };
        const comprobante = resolverComprobante(datosComprobante);

        const montos = calcularMontos(db, {
          subtotal,
          descuento: opciones.descuento || 0,
          calcular_igv_auto: true,
        });

        const { numero, serie, correlativo } = siguienteCorrelativo(db, comprobante.tipo);

        const result = db
          .prepare(
            `INSERT INTO facturas
             (numero, id_cita, id_paciente, id_odontologo, fecha, subtotal, descuento, impuesto, total,
              estado, tipo_comprobante, serie, correlativo,
              cliente_dni, cliente_ruc, cliente_razon_social)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            numero,
            idCita,
            cita.id_paciente,
            cita.id_odontologo || null,
            new Date().toISOString().split('T')[0],
            montos.subtotal,
            montos.descuento,
            montos.impuesto,
            montos.total,
            'pendiente',
            comprobante.tipo,
            serie,
            correlativo,
            comprobante.cliente_dni,
            comprobante.cliente_ruc,
            comprobante.cliente_razon_social
          );

        return {
          id: result.lastInsertRowid,
          numero,
          serie,
          correlativo,
          tipo_comprobante: comprobante.tipo,
          impuesto: montos.impuesto,
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


import * as XLSX from 'xlsx';

/**
 * Exporta datos a Excel
 */
export function exportarAExcel(datos, nombreArchivo, nombreHoja = 'Datos') {
  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Convertir datos a worksheet
  const ws = XLSX.utils.json_to_sheet(datos);
  
  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  
  // Generar archivo
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

/**
 * Exporta múltiples hojas en un solo archivo Excel.
 * @param {Array<{nombre: string, datos: object[]}>} hojas
 * @param {string} nombreArchivo
 */
export function exportarMultiHoja(hojas, nombreArchivo) {
  const wb = XLSX.utils.book_new();
  for (const hoja of hojas) {
    const ws = XLSX.utils.json_to_sheet(hoja.datos.length ? hoja.datos : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre.slice(0, 31));
  }
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

/**
 * Exporta datos a CSV
 */
export function exportarACSV(datos, nombreArchivo) {
  if (!datos || datos.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  // Obtener headers
  const headers = Object.keys(datos[0]);
  
  // Crear contenido CSV
  let csvContent = headers.join(',') + '\n';
  
  datos.forEach((row) => {
    const values = headers.map(header => {
      const value = row[header];
      // Escapar comillas y valores que contengan comas
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta pacientes a Excel
 */
export function exportarPacientes(pacientes) {
  const datos = pacientes.map(p => ({
    'ID': p.id,
    'Nombre': p.nombre,
    'DNI': p.dni || '',
    'Teléfono': p.telefono || '',
    'Fecha Registro': p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES') : '',
  }));
  exportarAExcel(datos, 'pacientes_export', 'Pacientes');
}

/**
 * Exporta facturas a Excel
 */
export function exportarFacturas(facturas) {
  const datos = facturas.map(f => ({
    'Número': f.numero,
    'Paciente': f.paciente_nombre || '',
    'Fecha': new Date(f.fecha).toLocaleDateString('es-ES'),
    'Subtotal': f.subtotal,
    'Descuento': f.descuento,
    'Impuesto': f.impuesto,
    'Total': f.total,
    'Estado': f.estado,
  }));
  exportarAExcel(datos, 'facturas_export', 'Facturas');
}

/**
 * Exporta citas a Excel
 */
export function exportarCitas(citas) {
  const datos = citas.map(c => ({
    'ID': c.id,
    'Paciente': c.paciente_nombre || '',
    'Odontólogo': c.odontologo_nombre || '',
    'Fecha': c.fecha,
    'Hora Inicio': c.hora_inicio,
    'Hora Fin': c.hora_fin,
    'Estado': c.estado,
    'Motivo': c.motivo || '',
  }));
  exportarAExcel(datos, 'citas_export', 'Citas');
}

/**
 * Exporta productos a Excel
 */
export function exportarProductos(productos) {
  const datos = productos.map(p => ({
    'ID': p.id,
    'Nombre': p.nombre,
    'Stock': p.stock || 0,
    'Stock Mínimo': p.stock_minimo || 0,
    'Precio': p.precio || 0,
    'Descripción': p.descripcion || '',
  }));
  exportarAExcel(datos, 'productos_export', 'Productos');
}

/**
 * Exporta tratamientos a Excel
 */
export function exportarTratamientos(tratamientos) {
  const datos = tratamientos.map(t => ({
    'ID': t.id,
    'Nombre': t.nombre,
    'Precio': t.precio || 0,
    'Duración': t.duracion || '',
    'Descripción': t.descripcion || '',
  }));
  exportarAExcel(datos, 'tratamientos_export', 'Tratamientos');
}


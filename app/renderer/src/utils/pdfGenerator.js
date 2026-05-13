import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un PDF de factura
 */
export function generarPDFFactura(factura, paciente, pagos = [], config = null, items = []) {
  const doc = new jsPDF();

  const esFactura = factura.tipo_comprobante === 'factura';
  const tipoLabel = esFactura ? 'FACTURA' : 'BOLETA DE VENTA';
  const clinicaNombre = config?.nombre_clinica || 'Clínica Odontológica';
  const clinicaDireccion = config?.direccion || '';
  const clinicaRUC = config?.ruc || '';

  // Encabezado
  doc.setFontSize(20);
  doc.text(tipoLabel, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(clinicaNombre, 105, 30, { align: 'center' });
  if (clinicaDireccion) doc.text(clinicaDireccion, 105, 36, { align: 'center' });
  if (clinicaRUC) doc.text(`RUC: ${clinicaRUC}`, 105, clinicaDireccion ? 42 : 36, { align: 'center' });

  // Información del comprobante
  doc.setFontSize(10);
  doc.text(`Número: ${factura.numero}`, 20, 50);
  doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString('es-PE')}`, 20, 56);
  doc.text(`Estado: ${factura.estado.toUpperCase()}`, 20, 62);

  // Datos del cliente / paciente
  doc.setFontSize(12);
  doc.text(esFactura ? 'DATOS DEL CLIENTE' : 'DATOS DEL PACIENTE', 20, 75);
  doc.setFontSize(10);
  doc.text(`Nombre: ${esFactura ? (factura.cliente_razon_social || paciente?.nombre || 'N/A') : (paciente?.nombre || 'N/A')}`, 20, 82);
  if (esFactura && factura.cliente_ruc) {
    doc.text(`RUC: ${factura.cliente_ruc}`, 20, 88);
  } else if (factura.cliente_dni) {
    doc.text(`DNI: ${factura.cliente_dni}`, 20, 88);
  } else if (paciente?.dni) {
    doc.text(`DNI: ${paciente.dni}`, 20, 88);
  }
  if (paciente?.telefono) {
    doc.text(`Teléfono: ${paciente.telefono}`, 20, 94);
  }
  
  // Detalles de la factura
  let yPos = 110;
  doc.setFontSize(12);
  doc.text(esFactura ? 'DETALLES DE LA FACTURA' : 'DETALLES DE LA BOLETA', 20, yPos);
  yPos += 10;
  
  const tableData = [['Concepto', 'Cantidad', 'Precio Unit.', 'Descuento', 'Total']];

  if (items && items.length > 0) {
    items.forEach(item => {
      const precioUnit = item.precio_unitario ?? 0;
      const cantidad = item.cantidad ?? 1;
      const descItem = item.descuento ?? 0;
      const totalItem = precioUnit * cantidad - descItem;
      tableData.push([
        item.nombre || 'Tratamiento',
        cantidad.toString(),
        `S/ ${precioUnit.toFixed(2)}`,
        `S/ ${descItem.toFixed(2)}`,
        `S/ ${totalItem.toFixed(2)}`,
      ]);
    });
  } else {
    tableData.push(['Servicio Odontológico', '1', `S/ ${factura.subtotal.toFixed(2)}`, `S/ ${factura.descuento.toFixed(2)}`, `S/ ${(factura.subtotal - factura.descuento).toFixed(2)}`]);
  }

  if (factura.impuesto > 0) {
    tableData.push(['Impuesto', '1', `S/ ${factura.impuesto.toFixed(2)}`, '-', `S/ ${factura.impuesto.toFixed(2)}`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Totales
  doc.setFontSize(12);
  doc.text('TOTAL: S/ ' + factura.total.toFixed(2), 150, yPos, { align: 'right' });
  
  // Pagos si existen
  if (pagos && pagos.length > 0) {
    yPos += 20;
    doc.setFontSize(12);
    doc.text('HISTORIAL DE PAGOS', 20, yPos);
    yPos += 10;
    
    const pagosData = pagos.map(pago => [
      new Date(pago.fecha).toLocaleDateString('es-ES'),
      pago.metodo_pago,
      `S/ ${pago.monto.toFixed(2)}`,
      pago.referencia || '-',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Método', 'Monto', 'Referencia']],
      body: pagosData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 },
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    const pendiente = factura.total - totalPagado;
    
    doc.setFontSize(10);
    doc.text(`Total Pagado: S/ ${totalPagado.toFixed(2)}`, 150, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Pendiente: S/ ${pendiente.toFixed(2)}`, 150, yPos, { align: 'right' });
  }
  
  // Observaciones
  if (factura.observaciones) {
    yPos += 15;
    doc.setFontSize(10);
    doc.text('Observaciones:', 20, yPos);
    yPos += 6;
    const splitObservaciones = doc.splitTextToSize(factura.observaciones, 170);
    doc.text(splitObservaciones, 20, yPos);
  }
  
  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Este documento fue generado por OdontoSoft Desktop', 105, pageHeight - 10, { align: 'center' });
  
  return doc;
}

/**
 * Genera un PDF de prescripción
 */
export function generarPDFPrescripcion(prescripcion, paciente, odontologo, config = null) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  const clinicaNombre = config?.nombre_clinica || 'Clínica Odontológica';
  const clinicaDireccion = config?.direccion || '';
  const clinicaTelefono = config?.telefono || '';
  const clinicaEmail = config?.email || '';

  // Borde exterior
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // Header azul
  doc.setFillColor(59, 130, 246);
  doc.rect(8, 8, pageW - 16, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(clinicaNombre, pageW / 2, 19, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const subHeader = [clinicaDireccion, clinicaTelefono, clinicaEmail].filter(Boolean).join('  |  ');
  if (subHeader) doc.text(subHeader, pageW / 2, 27, { align: 'center' });

  // Título + número
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIPCIÓN MÉDICA', pageW / 2, 43, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const numStr = `N° ${String(prescripcion.id || '').padStart(4, '0')}`;
  const fechaStr = `Fecha: ${new Date(`${prescripcion.fecha}T12:00:00`).toLocaleDateString('es-PE')}`;
  doc.text(numStr, 14, 51);
  doc.text(fechaStr, pageW - 14, 51, { align: 'right' });
  if (prescripcion.fecha_vencimiento) {
    const vencStr = `Válida hasta: ${new Date(`${prescripcion.fecha_vencimiento}T12:00:00`).toLocaleDateString('es-PE')}`;
    doc.text(vencStr, pageW - 14, 56, { align: 'right' });
  }

  // Separador
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, 60, pageW - 14, 60);

  // Paciente | Odontólogo
  let y = 68;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PACIENTE', 14, y);
  doc.text('PRESCRIPTOR', pageW / 2 + 4, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(`Nombre: ${paciente?.nombre || '—'}`, 14, y);
  doc.text(`Dr./Dra.: ${odontologo?.nombre || '—'}`, pageW / 2 + 4, y);
  y += 5;
  if (paciente?.dni || odontologo?.matricula) {
    if (paciente?.dni) doc.text(`DNI: ${paciente.dni}`, 14, y);
    if (odontologo?.matricula) doc.text(`COP: ${odontologo.matricula}`, pageW / 2 + 4, y);
    y += 5;
  }
  if (paciente?.telefono || odontologo?.especialidad) {
    if (paciente?.telefono) doc.text(`Tel.: ${paciente.telefono}`, 14, y);
    if (odontologo?.especialidad) doc.text(`Esp.: ${odontologo.especialidad}`, pageW / 2 + 4, y);
    y += 5;
  }

  // Separador + Rp.
  y += 3;
  doc.line(14, y, pageW - 14, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('Rp.', 14, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  // Medicamentos
  let meds = [];
  try {
    meds = typeof prescripcion.medicamentos === 'string'
      ? JSON.parse(prescripcion.medicamentos)
      : prescripcion.medicamentos;
    if (!Array.isArray(meds)) meds = [];
  } catch (_) { meds = []; }

  if (meds.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duración']],
      body: meds.map(m => [m.nombre || '—', m.dosis || '—', m.frecuencia || '—', m.duracion || '—']),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('(Sin medicamentos registrados)', 14, y + 4);
    y += 12;
  }

  // Instrucciones
  if (prescripcion.instrucciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Instrucciones:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(prescripcion.instrucciones, pageW - 28);
    doc.text(lines, 14, y);
  }

  // Área de firma (anclada al fondo)
  const sigY = pageH - 42;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, sigY, pageW - 14, sigY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________', 14, sigY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr./Dra. ${odontologo?.nombre || '—'}`, 14, sigY + 18);
  doc.setFont('helvetica', 'normal');
  if (odontologo?.matricula) doc.text(`COP: ${odontologo.matricula}`, 14, sigY + 23);

  // Círculo sello
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.circle(pageW - 30, sigY + 14, 13);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('SELLO', pageW - 30, sigY + 13, { align: 'center' });
  doc.text('MÉDICO', pageW - 30, sigY + 18, { align: 'center' });

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Generado por OdontoSoft Desktop', pageW / 2, pageH - 12, { align: 'center' });

  return doc;
}

/**
 * Genera un PDF de historia clínica
 */
export function generarPDFHistoriaClinica(entrada, paciente, odontologo = null) {
  const doc = new jsPDF();
  
  // Encabezado
  doc.setFontSize(20);
  doc.text('HISTORIA CLÍNICA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('OdontoSoft - Clínica Odontológica', 105, 30, { align: 'center' });
  
  // Información del paciente
  doc.setFontSize(12);
  doc.text('DATOS DEL PACIENTE', 20, 45);
  doc.setFontSize(10);
  doc.text(`Nombre: ${paciente?.nombre || 'N/A'}`, 20, 52);
  if (paciente?.dni) {
    doc.text(`DNI: ${paciente.dni}`, 20, 58);
  }
  if (paciente?.telefono) {
    doc.text(`Teléfono: ${paciente.telefono}`, 20, 64);
  }
  
  // Información de la consulta
  doc.setFontSize(12);
  doc.text('INFORMACIÓN DE LA CONSULTA', 20, 80);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date(entrada.fecha).toLocaleDateString('es-ES')}`, 20, 87);
  
  // Datos de salud (si existen)
  if (entrada.datos_extra && Object.keys(entrada.datos_extra).length > 0) {
    let yPos = 100;
    doc.setFontSize(12);
    doc.text('DATOS DE SALUD', 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    
    Object.entries(entrada.datos_extra).forEach(([key, value]) => {
      if (value && value !== '') {
        doc.text(`${key}: ${String(value)}`, 20, yPos);
        yPos += 6;
      }
    });
  }
  
  // Descripción
  let yPos = 130;
  doc.setFontSize(12);
  doc.text('DESCRIPCIÓN DE LA CONSULTA', 20, yPos);
  yPos += 6;
  doc.setFontSize(10);
  const splitDescripcion = doc.splitTextToSize(entrada.descripcion || 'Sin descripción', 170);
  doc.text(splitDescripcion, 20, yPos);
  yPos += splitDescripcion.length * 6;
  
  // Nota sobre odontograma
  if (entrada.odontograma_data && Object.keys(entrada.odontograma_data).length > 0) {
    yPos += 10;
    doc.setFontSize(10);
    doc.text('Nota: Esta consulta incluye un odontograma. Ver versión digital para detalles visuales.', 20, yPos, { maxWidth: 170 });
  }
  
  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text('Este documento fue generado por OdontoSoft Desktop', 105, pageHeight - 10, { align: 'center' });
  
  return doc;
}


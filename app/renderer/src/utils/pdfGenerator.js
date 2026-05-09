import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un PDF de factura
 */
export function generarPDFFactura(factura, paciente, pagos = []) {
  const doc = new jsPDF();
  
  const esFactura = factura.tipo_comprobante === 'factura';
  const tipoLabel = esFactura ? 'FACTURA' : 'BOLETA DE VENTA';

  // Encabezado
  doc.setFontSize(20);
  doc.text(tipoLabel, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text('OdontoSoft - Clínica Odontológica', 105, 30, { align: 'center' });
  doc.text('Sistema de Gestión Clínica', 105, 36, { align: 'center' });

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
  
  const tableData = [
    ['Concepto', 'Cantidad', 'Precio Unit.', 'Descuento', 'Total'],
    ['Servicio Odontológico', '1', `S/ ${factura.subtotal.toFixed(2)}`, `S/ ${factura.descuento.toFixed(2)}`, `S/ ${(factura.subtotal - factura.descuento).toFixed(2)}`],
  ];
  
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
export function generarPDFPrescripcion(prescripcion, paciente, odontologo) {
  const doc = new jsPDF();
  
  // Encabezado
  doc.setFontSize(20);
  doc.text('PRESCRIPCIÓN MÉDICA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('OdontoSoft - Clínica Odontológica', 105, 30, { align: 'center' });
  
  // Información de la prescripción
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date(prescripcion.fecha).toLocaleDateString('es-ES')}`, 20, 45);
  if (prescripcion.fecha_vencimiento) {
    doc.text(`Válida hasta: ${new Date(prescripcion.fecha_vencimiento).toLocaleDateString('es-ES')}`, 20, 51);
  }
  
  // Información del paciente
  doc.setFontSize(12);
  doc.text('DATOS DEL PACIENTE', 20, 65);
  doc.setFontSize(10);
  doc.text(`Nombre: ${paciente?.nombre || 'N/A'}`, 20, 72);
  if (paciente?.dni) {
    doc.text(`DNI: ${paciente.dni}`, 20, 78);
  }
  if (paciente?.telefono) {
    doc.text(`Teléfono: ${paciente.telefono}`, 20, 84);
  }
  
  // Información del odontólogo
  doc.setFontSize(12);
  doc.text('ODONTÓLOGO', 120, 65);
  doc.setFontSize(10);
  doc.text(`Dr./Dra. ${odontologo?.nombre || 'N/A'}`, 120, 72);
  if (odontologo?.matricula) {
    doc.text(`Matrícula: ${odontologo.matricula}`, 120, 78);
  }
  if (odontologo?.especialidad) {
    doc.text(`Especialidad: ${odontologo.especialidad}`, 120, 84);
  }
  
  // Medicamentos
  let yPos = 100;
  doc.setFontSize(12);
  doc.text('MEDICAMENTOS', 20, yPos);
  yPos += 10;
  
  let medicamentos = [];
  try {
    medicamentos = typeof prescripcion.medicamentos === 'string' 
      ? JSON.parse(prescripcion.medicamentos) 
      : prescripcion.medicamentos;
    if (!Array.isArray(medicamentos)) medicamentos = [];
  } catch (e) {
    medicamentos = [];
  }
  
  if (medicamentos.length > 0) {
    const medicamentosData = medicamentos.map((med, idx) => [
      (idx + 1).toString(),
      med.nombre || '-',
      med.dosis || '-',
      med.frecuencia || '-',
      med.duracion || '-',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Medicamento', 'Dosis', 'Frecuencia', 'Duración']],
      body: medicamentosData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  } else {
    doc.text('No hay medicamentos registrados', 20, yPos);
    yPos += 10;
  }
  
  // Instrucciones
  if (prescripcion.instrucciones) {
    yPos += 5;
    doc.setFontSize(12);
    doc.text('INSTRUCCIONES', 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    const splitInstrucciones = doc.splitTextToSize(prescripcion.instrucciones, 170);
    doc.text(splitInstrucciones, 20, yPos);
  }
  
  // Firma
  const pageHeight = doc.internal.pageSize.height;
  yPos = pageHeight - 40;
  doc.setFontSize(10);
  doc.text('_________________________', 20, yPos);
  yPos += 6;
  doc.text(`Dr./Dra. ${odontologo?.nombre || 'N/A'}`, 20, yPos);
  if (odontologo?.matricula) {
    yPos += 6;
    doc.text(`Matrícula: ${odontologo.matricula}`, 20, yPos);
  }
  
  // Pie de página
  doc.setFontSize(8);
  doc.text('Este documento fue generado por OdontoSoft Desktop', 105, pageHeight - 10, { align: 'center' });
  
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


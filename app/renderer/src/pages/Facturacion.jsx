import { useState, useEffect } from 'react';
import { Plus, Search, Receipt, DollarSign, Calendar, User, FileText, Edit, Trash2, Printer, Download } from 'lucide-react';
import { getFacturas, getFactura, crearFactura, crearFacturaDirecta, crearFacturaDesdeCita, getPagosFactura, addPago, updatePago, deletePago } from '../services/dbService';
import { getCitas, getPacientes, getPaciente, getTratamientosCita } from '../services/dbService';
import { getConfiguracionClinica } from '../services/dbService';
import { generarPDFFactura } from '../utils/pdfGenerator';
import { exportarFacturas } from '../utils/excelExporter';
import { formatMoneda, formatFecha, getIgvPorcentaje, getMonedaSimbolo } from '../utils/formatters';
import { validarDNI, validarRUC } from '../utils/identidad';
import EmptyState from '../components/EmptyState';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

const ESTADO_FACTURA_INICIAL = {
  id_paciente: '',
  fecha: new Date().toISOString().split('T')[0],
  tipo_comprobante: 'boleta',
  cliente_dni: '',
  cliente_ruc: '',
  cliente_razon_social: '',
  subtotal: '',
  descuento: '',
  impuesto: '',
  calcular_igv_auto: true,
  observaciones: '',
};

function Facturacion() {
  const confirm = useConfirm();
  const toast = useToast();
  const [facturas, setFacturas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalPago, setShowModalPago] = useState(false);
  const [showModalFactura, setShowModalFactura] = useState(false);
  const [showModalFacturaDirecta, setShowModalFacturaDirecta] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formDataFactura, setFormDataFactura] = useState(ESTADO_FACTURA_INICIAL);
  const [formDataPago, setFormDataPago] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    fecha: new Date().toISOString().split('T')[0],
    referencia: '',
    observaciones: '',
  });
  const [pagoEditando, setPagoEditando] = useState(null);

  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'yape', label: 'Yape / Plin' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'cheque', label: 'Cheque' },
  ];

  useEffect(() => {
    loadFacturas();
    loadCitas();
    loadPacientes();
  }, []);

  const loadFacturas = async () => {
    try {
      setLoading(true);
      const data = await getFacturas({});
      setFacturas(data);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los comprobantes.'));
    } finally {
      setLoading(false);
    }
  };

  const loadCitas = async () => {
    try {
      const data = await getCitas({ estado: 'completada' });
      setCitas(data);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    }
  };

  const loadPacientes = async () => {
    try {
      const data = await getPacientes();
      setPacientes(data);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  const handleCrearFactura = async (idCita) => {
    try {
      await crearFacturaDesdeCita(idCita);
      await loadFacturas();
      setShowModalFactura(false);
      toast.success('Factura creada exitosamente.');
    } catch (error) {
      console.error('Error al crear factura:', error);
      toast.error(humanizeError(error, 'No se pudo crear la factura.'));
    }
  };

  const handleCrearFacturaDirecta = async (e) => {
    e.preventDefault();

    if (!formDataFactura.id_paciente) {
      toast.warning('Selecciona un paciente.');
      return;
    }

    if (!formDataFactura.subtotal || parseFloat(formDataFactura.subtotal) <= 0) {
      toast.warning('El subtotal debe ser mayor a 0.');
      return;
    }

    if (formDataFactura.tipo_comprobante === 'factura') {
      const v = validarRUC(formDataFactura.cliente_ruc);
      if (!v.ok) { toast.warning(`RUC: ${v.error}`); return; }
      if (!formDataFactura.cliente_razon_social.trim()) {
        toast.warning('La razón social es obligatoria para emitir una factura.');
        return;
      }
    }
    if (formDataFactura.tipo_comprobante === 'boleta' && formDataFactura.cliente_dni) {
      const v = validarDNI(formDataFactura.cliente_dni);
      if (!v.ok) { toast.warning(`DNI: ${v.error}`); return; }
    }

    try {
      const facturaData = {
        id_paciente: parseInt(formDataFactura.id_paciente),
        fecha: formDataFactura.fecha,
        tipo_comprobante: formDataFactura.tipo_comprobante,
        cliente_dni: formDataFactura.cliente_dni.trim() || null,
        cliente_ruc: formDataFactura.cliente_ruc.trim() || null,
        cliente_razon_social: formDataFactura.cliente_razon_social.trim() || null,
        subtotal: parseFloat(formDataFactura.subtotal) || 0,
        descuento: formDataFactura.descuento ? parseFloat(formDataFactura.descuento) : 0,
        impuesto: formDataFactura.impuesto ? parseFloat(formDataFactura.impuesto) : 0,
        calcular_igv_auto: !!formDataFactura.calcular_igv_auto,
        observaciones: formDataFactura.observaciones || null,
      };

      await crearFacturaDirecta(facturaData);
      await loadFacturas();
      setShowModalFacturaDirecta(false);
      setFormDataFactura(ESTADO_FACTURA_INICIAL);
      toast.success('Comprobante creado correctamente.');
    } catch (error) {
      console.error('Error al crear factura:', error);
      toast.error(humanizeError(error, 'No se pudo crear el comprobante.'));
    }
  };

  const handleVerPagos = async (factura) => {
    try {
      setFacturaSeleccionada(factura);
      const data = await getPagosFactura(factura.id);
      setPagos(data);
      
      // Dejar el monto en 0 para que el usuario decida el próximo importe
      setFormDataPago((prev) => ({
        ...prev,
        monto: '0.00',
      }));

      setShowModalPago(true);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los pagos.'));
    }
  };

  const handleAgregarPago = async (e) => {
    e.preventDefault();
    
    // Validar monto
    if (!formDataPago.monto || parseFloat(formDataPago.monto) <= 0) {
      toast.warning('El monto debe ser mayor a 0.');
      return;
    }
    
    try {
      if (pagoEditando) {
        // Actualizar pago existente
        await updatePago(pagoEditando.id, {
          monto: parseFloat(formDataPago.monto) || 0,
          metodo_pago: formDataPago.metodo_pago,
          fecha: formDataPago.fecha,
          referencia: formDataPago.referencia || null,
          observaciones: formDataPago.observaciones || null,
        });
        toast.success('Pago actualizado exitosamente.');
      } else {
        // Agregar nuevo pago
        await addPago({
          id_factura: facturaSeleccionada.id,
          monto: parseFloat(formDataPago.monto) || 0,
          metodo_pago: formDataPago.metodo_pago,
          fecha: formDataPago.fecha,
          referencia: formDataPago.referencia || null,
          observaciones: formDataPago.observaciones || null,
        });
        toast.success('Pago agregado exitosamente.');
      }
      // Refrescar facturas y pagos de la factura seleccionada
      await loadFacturas();
      const data = await getPagosFactura(facturaSeleccionada.id);
      setPagos(data);

      // Dejar el monto en 0.00 para que el usuario escriba el siguiente pago libremente
      setFormDataPago({
        monto: '0.00',
        metodo_pago: 'efectivo',
        fecha: new Date().toISOString().split('T')[0],
        referencia: '',
        observaciones: '',
      });

      setPagoEditando(null);
    } catch (error) {
      console.error('Error al guardar pago:', error);
      toast.error(humanizeError(error, `No se pudo ${pagoEditando ? 'actualizar' : 'agregar'} el pago.`));
    }
  };

  const handleEditarPago = (pago) => {
    setPagoEditando(pago);
    setFormDataPago({
      monto: pago.monto.toString(),
      metodo_pago: pago.metodo_pago,
      fecha: pago.fecha,
      referencia: pago.referencia || '',
      observaciones: pago.observaciones || '',
    });
    // Scroll al formulario
    setTimeout(() => {
      document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleEliminarPago = async (pago) => {
    const ok = await confirm({
      title: 'Eliminar pago',
      message: `Vas a eliminar el pago de ${formatMoneda(pago.monto)}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) {
      return;
    }

    try {
      await deletePago(pago.id);
      toast.success('Pago eliminado exitosamente.');
      await loadFacturas();
      await handleVerPagos(facturaSeleccionada);
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el pago.'));
    }
  };

  const handleCancelarEdicion = () => {
    setPagoEditando(null);

    // Volver a dejar el monto neutro cuando se cancela la edición
    setFormDataPago((prev) => ({
      ...prev,
      monto: '0.00',
      fecha: new Date().toISOString().split('T')[0],
      referencia: '',
      observaciones: '',
    }));
  };

  const filteredFacturas = facturas.filter((factura) =>
    factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factura.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'pagada':
        return <span className="badge badge-success">Pagada</span>;
      case 'pendiente':
        return <span className="badge badge-warning">Pendiente</span>;
      case 'cancelada':
        return <span className="badge badge-error">Cancelada</span>;
      default:
        return <span className="badge badge-ghost">{estado}</span>;
    }
  };

  const calcularTotalPagado = (facturaId) => {
    if (!facturaSeleccionada || facturaSeleccionada.id !== facturaId) return 0;
    return pagos.reduce((sum, pago) => sum + pago.monto, 0);
  };

  const handleImprimirFactura = async (factura) => {
    try {
      const [facturaCompleta, pagosFactura, config] = await Promise.all([
        getFactura(factura.id),
        getPagosFactura(factura.id),
        getConfiguracionClinica(),
      ]);
      const [paciente, items] = await Promise.all([
        getPaciente(facturaCompleta.id_paciente),
        facturaCompleta.id_cita ? getTratamientosCita(facturaCompleta.id_cita) : Promise.resolve([]),
      ]);
      const doc = generarPDFFactura(facturaCompleta, paciente, pagosFactura, config, items);
      doc.save(`Factura_${factura.numero}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error(humanizeError(error, 'No se pudo generar el PDF de la factura.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Facturación</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowModalFacturaDirecta(true)}
            className="btn btn-primary gap-2"
          >
            <Plus size={20} />
            Nueva Factura
          </button>
          <button
            type="button"
            onClick={() => setShowModalFactura(true)}
            className="btn btn-outline btn-primary gap-2"
          >
            <Receipt size={20} />
            Desde Cita
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número de factura o paciente..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando facturas...</div>
        ) : filteredFacturas.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aún no hay comprobantes"
            description="Cuando emitas tu primera boleta o factura, aparecerá aquí. Puedes crearla desde una cita completada o emitirla directo."
            actionLabel="Nuevo comprobante"
            onAction={() => setShowModalFacturaDirecta(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Tipo</th>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacturas.map((factura) => {
                  const tipo = factura.tipo_comprobante || 'boleta';
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td>
                        <span className={`badge ${tipo === 'factura' ? 'badge-primary' : 'badge-ghost'}`}>
                          {tipo === 'factura' ? 'Factura' : 'Boleta'}
                        </span>
                      </td>
                      <td className="font-medium">{factura.numero}</td>
                      <td>
                        {factura.cliente_razon_social || factura.paciente_nombre}
                        {factura.cliente_ruc && (
                          <span className="text-xs text-gray-500 block">RUC: {factura.cliente_ruc}</span>
                        )}
                        {!factura.cliente_ruc && factura.cliente_dni && (
                          <span className="text-xs text-gray-500 block">DNI: {factura.cliente_dni}</span>
                        )}
                      </td>
                      <td>{formatFecha(factura.fecha)}</td>
                      <td>{formatMoneda(factura.subtotal)}</td>
                      <td>{formatMoneda(factura.descuento)}</td>
                      <td className="font-semibold">{formatMoneda(factura.total)}</td>
                      <td>{getEstadoBadge(factura.estado)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleImprimirFactura(factura)}
                            className="btn btn-sm btn-ghost gap-1"
                            title="Imprimir factura"
                          >
                            <Printer size={16} />
                            Imprimir
                          </button>
                          <button
                            onClick={() => handleVerPagos(factura)}
                            className="btn btn-sm btn-ghost gap-1"
                          >
                            <DollarSign size={16} />
                            Pagos
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear comprobante (boleta o factura) */}
      {showModalFacturaDirecta && (() => {
        const simbolo = getMonedaSimbolo();
        const subtotalNum = parseFloat(formDataFactura.subtotal) || 0;
        const descuentoNum = parseFloat(formDataFactura.descuento) || 0;
        const baseImponible = Math.max(0, subtotalNum - descuentoNum);
        const igvPct = getIgvPorcentaje();
        const impuestoCalc = formDataFactura.calcular_igv_auto
          ? +(baseImponible * (igvPct / 100)).toFixed(2)
          : (parseFloat(formDataFactura.impuesto) || 0);
        const totalCalc = +(baseImponible + impuestoCalc).toFixed(2);
        const esFactura = formDataFactura.tipo_comprobante === 'factura';

        return (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg mb-4">Nuevo comprobante</h3>

              <form onSubmit={handleCrearFacturaDirecta} className="space-y-4">
                {/* Tipo de comprobante */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Tipo de comprobante *</span>
                  </label>
                  <div className="join w-full">
                    <button
                      type="button"
                      className={`btn join-item flex-1 ${!esFactura ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setFormDataFactura({ ...formDataFactura, tipo_comprobante: 'boleta' })}
                    >
                      Boleta (B001)
                    </button>
                    <button
                      type="button"
                      className={`btn join-item flex-1 ${esFactura ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setFormDataFactura({ ...formDataFactura, tipo_comprobante: 'factura' })}
                    >
                      Factura (F001)
                    </button>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Paciente *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formDataFactura.id_paciente}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const pac = pacientes.find((p) => String(p.id) === pid);
                      setFormDataFactura({
                        ...formDataFactura,
                        id_paciente: pid,
                        cliente_dni: pac?.dni || '',
                      });
                    }}
                    required
                  >
                    <option value="">-- Selecciona un paciente --</option>
                    {pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.nombre} {paciente.dni ? `(DNI: ${paciente.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Datos del cliente según tipo */}
                {esFactura ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">RUC del cliente *</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        className="input input-bordered w-full"
                        placeholder="11 dígitos"
                        value={formDataFactura.cliente_ruc}
                        onChange={(e) => setFormDataFactura({ ...formDataFactura, cliente_ruc: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Razón social *</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="Nombre o razón social del cliente"
                        value={formDataFactura.cliente_razon_social}
                        onChange={(e) => setFormDataFactura({ ...formDataFactura, cliente_razon_social: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">DNI del cliente (opcional)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      className="input input-bordered w-full md:w-1/2"
                      placeholder="8 dígitos"
                      value={formDataFactura.cliente_dni}
                      onChange={(e) => setFormDataFactura({ ...formDataFactura, cliente_dni: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formDataFactura.fecha}
                    onChange={(e) => setFormDataFactura({ ...formDataFactura, fecha: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Subtotal ({simbolo}) *</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={formDataFactura.subtotal}
                      onChange={(e) => setFormDataFactura({ ...formDataFactura, subtotal: e.target.value })}
                      placeholder="0.00"
                      required
                      min="0"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Descuento ({simbolo})</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={formDataFactura.descuento}
                      onChange={(e) => setFormDataFactura({ ...formDataFactura, descuento: e.target.value })}
                      placeholder="0.00"
                      min="0"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label flex justify-between">
                      <span className="label-text font-medium">IGV ({simbolo})</span>
                      <span className="label-text-alt">
                        <label className="cursor-pointer flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={formDataFactura.calcular_igv_auto}
                            onChange={(e) => setFormDataFactura({ ...formDataFactura, calcular_igv_auto: e.target.checked })}
                          />
                          Auto {igvPct}%
                        </label>
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={formDataFactura.calcular_igv_auto ? impuestoCalc.toFixed(2) : formDataFactura.impuesto}
                      onChange={(e) => setFormDataFactura({ ...formDataFactura, impuesto: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      disabled={formDataFactura.calcular_igv_auto}
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="text-xl font-bold">{formatMoneda(totalCalc)}</span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Observaciones</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={formDataFactura.observaciones}
                    onChange={(e) => setFormDataFactura({ ...formDataFactura, observaciones: e.target.value })}
                    rows={3}
                    placeholder="Ej: Tratamiento de brackets - Pago inicial"
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalFacturaDirecta(false);
                      setFormDataFactura(ESTADO_FACTURA_INICIAL);
                    }}
                    className="btn btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Crear {esFactura ? 'Factura' : 'Boleta'}
                  </button>
                </div>
              </form>
            </div>
            <div className="modal-backdrop" onClick={() => setShowModalFacturaDirecta(false)} />
          </div>
        );
      })()}

      {/* Modal crear factura desde cita */}
      {showModalFactura && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Crear Factura desde Cita</h3>
            
            <div className="space-y-4">
              {citas.length === 0 ? (
                <p className="text-gray-500">No hay citas completadas disponibles</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {citas.map((cita) => (
                    <div
                      key={cita.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleCrearFactura(cita.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cita.paciente_nombre}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(cita.fecha).toLocaleDateString('es-ES')} - {cita.hora_inicio}
                          </p>
                        </div>
                        <button className="btn btn-sm btn-primary">
                          Crear Factura
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowModalFactura(false)}
                className="btn btn-ghost"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModalFactura(false)}></div>
        </div>
      )}

      {/* Modal de pagos */}
      {showModalPago && facturaSeleccionada && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              Pagos - Factura {facturaSeleccionada.numero}
            </h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Factura</p>
                  <p className="text-2xl font-bold">{formatMoneda(facturaSeleccionada.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMoneda(calcularTotalPagado(facturaSeleccionada.id))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendiente</p>
                  <p className="text-2xl font-bold text-red-600">
                    S/ {(facturaSeleccionada.total - calcularTotalPagado(facturaSeleccionada.id)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de pagos */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Historial de Pagos</h4>
              {pagos.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay pagos registrados</p>
              ) : (
                <div className="space-y-2">
                  {pagos.map((pago) => (
                    <div key={pago.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">S/ {pago.monto.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {metodosPago.find((m) => m.value === pago.metodo_pago)?.label || pago.metodo_pago} - {new Date(pago.fecha).toLocaleDateString('es-ES')}
                        </p>
                        {pago.referencia && (
                          <p className="text-xs text-gray-500 mt-1">Ref: {pago.referencia}</p>
                        )}
                        {pago.observaciones && (
                          <p className="text-xs text-gray-500 mt-1">{pago.observaciones}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleEditarPago(pago)}
                          className="btn btn-sm btn-ghost btn-circle"
                          title="Editar pago"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarPago(pago)}
                          className="btn btn-sm btn-ghost btn-circle text-red-600 hover:text-red-700"
                          title="Eliminar pago"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario de nuevo pago o edición */}
            {pagoEditando && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Editando pago:</strong> S/ {pagoEditando.monto.toFixed(2)} - {new Date(pagoEditando.fecha).toLocaleDateString('es-ES')}
                </p>
                <button
                  type="button"
                  onClick={handleCancelarEdicion}
                  className="btn btn-sm btn-ghost mt-2"
                >
                  Cancelar edición
                </button>
              </div>
            )}
            <form onSubmit={handleAgregarPago} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Monto *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formDataPago.monto}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Guardar como string para que el usuario pueda escribir montos grandes sin saltos raros
                      setFormDataPago({ ...formDataPago, monto: value });
                    }}
                    placeholder="0.00"
                    required
                    min="0"
                    autoFocus
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Método de Pago *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formDataPago.metodo_pago}
                    onChange={(e) => setFormDataPago({ ...formDataPago, metodo_pago: e.target.value })}
                    required
                  >
                    {metodosPago.map((metodo) => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Fecha *</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formDataPago.fecha}
                  onChange={(e) => setFormDataPago({ ...formDataPago, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Referencia</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formDataPago.referencia}
                  onChange={(e) => setFormDataPago({ ...formDataPago, referencia: e.target.value })}
                  placeholder="Número de referencia o comprobante"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Observaciones</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formDataPago.observaciones}
                  onChange={(e) => setFormDataPago({ ...formDataPago, observaciones: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalPago(false);
                    setFacturaSeleccionada(null);
                    setPagos([]);
                    setPagoEditando(null);
                    handleCancelarEdicion();
                  }}
                  className="btn btn-ghost"
                >
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary">
                  {pagoEditando ? 'Actualizar Pago' : 'Agregar Pago'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowModalPago(false);
            setFacturaSeleccionada(null);
            setPagos([]);
            setPagoEditando(null);
            handleCancelarEdicion();
          }}></div>
        </div>
      )}
    </div>
  );
}

export default Facturacion;


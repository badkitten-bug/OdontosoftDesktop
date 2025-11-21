import { useState, useEffect } from 'react';
import { Plus, Search, Receipt, DollarSign, Calendar, User, FileText, Edit, Trash2, Printer, Download } from 'lucide-react';
import { getFacturas, getFactura, crearFactura, crearFacturaDirecta, crearFacturaDesdeCita, getPagosFactura, addPago, updatePago, deletePago } from '../services/dbService';
import { getCitas, getPacientes, getPaciente } from '../services/dbService';
import { generarPDFFactura } from '../utils/pdfGenerator';
import { exportarFacturas } from '../utils/excelExporter';

function Facturacion() {
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
  const [formDataFactura, setFormDataFactura] = useState({
    id_paciente: '',
    fecha: new Date().toISOString().split('T')[0],
    subtotal: '',
    descuento: '',
    impuesto: '',
    observaciones: '',
  });
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
      alert('Error al cargar facturas');
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
      alert('Factura creada exitosamente');
    } catch (error) {
      console.error('Error al crear factura:', error);
      alert('Error al crear factura');
    }
  };

  const handleCrearFacturaDirecta = async (e) => {
    e.preventDefault();
    
    if (!formDataFactura.id_paciente) {
      alert('Por favor selecciona un paciente');
      return;
    }

    try {
      // Validar subtotal
      if (!formDataFactura.subtotal || parseFloat(formDataFactura.subtotal) <= 0) {
        alert('El subtotal debe ser mayor a 0');
        return;
      }

      // Asegurar que id_paciente sea un número y convertir valores numéricos
      const facturaData = {
        ...formDataFactura,
        id_paciente: parseInt(formDataFactura.id_paciente),
        subtotal: parseFloat(formDataFactura.subtotal) || 0,
        descuento: formDataFactura.descuento ? parseFloat(formDataFactura.descuento) : 0,
        impuesto: formDataFactura.impuesto ? parseFloat(formDataFactura.impuesto) : 0,
      };
      
      await crearFacturaDirecta(facturaData);
      await loadFacturas();
      setShowModalFacturaDirecta(false);
      setFormDataFactura({
        id_paciente: '',
        fecha: new Date().toISOString().split('T')[0],
        subtotal: '',
        descuento: '',
        impuesto: '',
        observaciones: '',
      });
      alert('Factura creada exitosamente');
    } catch (error) {
      console.error('Error al crear factura:', error);
      alert(`Error al crear factura: ${error.message || error}`);
    }
  };

  const handleVerPagos = async (factura) => {
    try {
      setFacturaSeleccionada(factura);
      const data = await getPagosFactura(factura.id);
      setPagos(data);
      setShowModalPago(true);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      alert('Error al cargar pagos');
    }
  };

  const handleAgregarPago = async (e) => {
    e.preventDefault();
    
    // Validar monto
    if (!formDataPago.monto || parseFloat(formDataPago.monto) <= 0) {
      alert('El monto debe ser mayor a 0');
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
        alert('Pago actualizado exitosamente');
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
        alert('Pago agregado exitosamente');
      }
      await loadFacturas();
      await handleVerPagos(facturaSeleccionada);
      setFormDataPago({
        monto: '',
        metodo_pago: 'efectivo',
        fecha: new Date().toISOString().split('T')[0],
        referencia: '',
        observaciones: '',
      });
      setPagoEditando(null);
    } catch (error) {
      console.error('Error al guardar pago:', error);
      alert(`Error al ${pagoEditando ? 'actualizar' : 'agregar'} pago: ${error.message || error}`);
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
    if (!confirm(`¿Estás seguro de eliminar el pago de S/ ${pago.monto.toFixed(2)}?`)) {
      return;
    }

    try {
      await deletePago(pago.id);
      alert('Pago eliminado exitosamente');
      await loadFacturas();
      await handleVerPagos(facturaSeleccionada);
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      alert(`Error al eliminar pago: ${error.message || error}`);
    }
  };

  const handleCancelarEdicion = () => {
    setPagoEditando(null);
    setFormDataPago({
      monto: '',
      metodo_pago: 'efectivo',
      fecha: new Date().toISOString().split('T')[0],
      referencia: '',
      observaciones: '',
    });
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
      // Obtener datos completos de la factura
      const facturaCompleta = await getFactura(factura.id);
      const paciente = await getPaciente(facturaCompleta.id_paciente);
      const pagosFactura = await getPagosFactura(factura.id);
      
      // Generar PDF
      const doc = generarPDFFactura(facturaCompleta, paciente, pagosFactura);
      
      // Guardar PDF
      doc.save(`Factura_${factura.numero}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF de la factura');
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
          <div className="text-center py-8 text-gray-500">
            No hay facturas registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Número</th>
                  <th>Paciente</th>
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
                  const totalPagado = calcularTotalPagado(factura.id);
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="font-medium">{factura.numero}</td>
                      <td>{factura.paciente_nombre}</td>
                      <td>{new Date(factura.fecha).toLocaleDateString('es-ES')}</td>
                      <td>S/ {factura.subtotal.toFixed(2)}</td>
                      <td>S/ {factura.descuento.toFixed(2)}</td>
                      <td className="font-semibold">S/ {factura.total.toFixed(2)}</td>
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

      {/* Modal crear factura directamente */}
      {showModalFacturaDirecta && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Nueva Factura</h3>
            
            <form onSubmit={handleCrearFacturaDirecta} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Paciente *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formDataFactura.id_paciente}
                  onChange={(e) => setFormDataFactura({ ...formDataFactura, id_paciente: e.target.value })}
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
                    <span className="label-text font-medium">Subtotal (S/) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formDataFactura.subtotal}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir vacío o número válido
                      setFormDataFactura({ ...formDataFactura, subtotal: value === '' ? '' : (parseFloat(value) || '') });
                    }}
                    placeholder="0.00"
                    required
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Descuento (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formDataFactura.descuento}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir vacío o número válido
                      setFormDataFactura({ ...formDataFactura, descuento: value === '' ? '' : (parseFloat(value) || '') });
                    }}
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Impuesto (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formDataFactura.impuesto}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir vacío o número válido
                      setFormDataFactura({ ...formDataFactura, impuesto: value === '' ? '' : (parseFloat(value) || '') });
                    }}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">
                    S/ {(
                      (parseFloat(formDataFactura.subtotal) || 0) - 
                      (parseFloat(formDataFactura.descuento) || 0) + 
                      (parseFloat(formDataFactura.impuesto) || 0)
                    ).toFixed(2)}
                  </span>
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
                    setFormDataFactura({
                      id_paciente: '',
                      fecha: new Date().toISOString().split('T')[0],
                      subtotal: '',
                      descuento: '',
                      impuesto: '',
                      observaciones: '',
                    });
                  }}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Factura
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModalFacturaDirecta(false)}></div>
        </div>
      )}

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
                  <p className="text-2xl font-bold">S/ {facturaSeleccionada.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-600">
                    S/ {calcularTotalPagado(facturaSeleccionada.id).toFixed(2)}
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
                      // Permitir vacío o número válido
                      setFormDataPago({ ...formDataPago, monto: value === '' ? '' : (parseFloat(value) || '') });
                    }}
                    placeholder="0.00"
                    required
                    min="0"
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


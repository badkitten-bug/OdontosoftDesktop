import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar, Download, FileText, UserCog, AlertCircle } from 'lucide-react';
import { getFacturas, getCitas, getPacientes, getTratamientosPopulares, getReportesOdontologos } from '../services/dbService';
import { exportarAExcel } from '../utils/excelExporter';
import { formatMoneda } from '../utils/formatters';
import { useToast } from '../context/UIContext';

function Reportes() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [estadisticas, setEstadisticas] = useState({
    ingresos: 0,
    facturas: 0,
    citas: 0,
    pacientes: 0,
    tratamientos: 0,
    promedioFactura: 0,
    facturasPagadas: 0,
    facturasPendientes: 0,
    citasCompletadas: 0,
    citasCanceladas: 0,
  });

  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [tratamientosMasComunes, setTratamientosMasComunes] = useState([]);
  const [estadoCitas, setEstadoCitas] = useState([]);
  const [reportesOdontologos, setReportesOdontologos] = useState([]);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [tasaAsistencia, setTasaAsistencia] = useState({ asistieron: 0, noAsistieron: 0 });

  useEffect(() => {
    loadReportes();
  }, [fechaInicio, fechaFin]);

  const loadReportes = async () => {
    try {
      setLoading(true);
      
      // Obtener datos
      const [facturas, citas, pacientes, tratamientosPopulares, odontologosReporte] = await Promise.all([
        getFacturas({ fecha_desde: fechaInicio, fecha_hasta: fechaFin }),
        getCitas({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        getPacientes(),
        getTratamientosPopulares({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        getReportesOdontologos({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      ]);
      setReportesOdontologos(odontologosReporte);

      const citasFiltradas = citas;

      // Calcular estadísticas
      const facturasPagadas = facturas.filter(f => f.estado === 'pagada');
      const ingresos = facturasPagadas.reduce((sum, f) => sum + (f.total || 0), 0);
      const promedioFactura = facturasPagadas.length > 0 ? ingresos / facturasPagadas.length : 0;

      setEstadisticas({
        ingresos,
        facturas: facturas.length,
        citas: citasFiltradas.length,
        pacientes: pacientes.length,
        tratamientos: tratamientosPopulares.length,
        promedioFactura,
        facturasPagadas: facturasPagadas.length,
        facturasPendientes: facturas.filter(f => f.estado === 'pendiente').length,
        citasCompletadas: citasFiltradas.filter(c => c.estado === 'completada').length,
        citasCanceladas: citasFiltradas.filter(c => c.estado === 'cancelada').length,
      });

      // Ingresos por mes (últimos 6 meses)
      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() - i);
        const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0];
        const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const facturasMes = facturas.filter(f => {
          const fechaFactura = new Date(f.fecha);
          return fechaFactura >= new Date(mesInicio) && fechaFactura <= new Date(mesFin) && f.estado === 'pagada';
        });
        
        const totalMes = facturasMes.reduce((sum, f) => sum + (f.total || 0), 0);
        meses.push({
          mes: fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          total: totalMes,
        });
      }
      setIngresosPorMes(meses);

      setTratamientosMasComunes(tratamientosPopulares);

      // Cartera de cobranza (pendientes en el período)
      setFacturasPendientes(
        facturas
          .filter(f => f.estado === 'pendiente')
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      );

      // Tasa de asistencia (citas con asistio registrado)
      setTasaAsistencia({
        asistieron: citas.filter(c => c.asistio === 1).length,
        noAsistieron: citas.filter(c => c.asistio === 0).length,
      });

      // Estado de citas
      const estados = ['programada', 'confirmada', 'en_proceso', 'completada', 'cancelada'];
      setEstadoCitas(estados.map(estado => ({
        estado,
        cantidad: citasFiltradas.filter(c => c.estado === estado).length,
      })));

    } catch (error) {
      console.error('Error al cargar reportes:', error);
      toast.error('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = () => {
    const datos = [
      {
        'Período': `${fechaInicio} a ${fechaFin}`,
        'Ingresos Totales': estadisticas.ingresos,
        'Facturas': estadisticas.facturas,
        'Facturas Pagadas': estadisticas.facturasPagadas,
        'Facturas Pendientes': estadisticas.facturasPendientes,
        'Citas': estadisticas.citas,
        'Citas Completadas': estadisticas.citasCompletadas,
        'Citas Canceladas': estadisticas.citasCanceladas,
        'Pacientes': estadisticas.pacientes,
        'Promedio por Factura': estadisticas.promedioFactura,
      },
    ];
    exportarAExcel(datos, `Reporte_${fechaInicio}_${fechaFin}`, 'Reporte');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes Avanzados</h1>
          <p className="text-gray-600 mt-1">Análisis detallado de la clínica</p>
        </div>
        <button
          onClick={exportarReporte}
          className="btn btn-primary gap-2"
        >
          <Download size={20} />
          Exportar Reporte
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Fecha Inicio</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Fecha Fin</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Acciones Rápidas</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const hoy = new Date();
                  setFechaInicio(new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]);
                  setFechaFin(hoy.toISOString().split('T')[0]);
                }}
                className="btn btn-sm btn-outline"
              >
                Este Mes
              </button>
              <button
                onClick={() => {
                  const hoy = new Date();
                  setFechaInicio(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split('T')[0]);
                  setFechaFin(new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0]);
                }}
                className="btn btn-sm btn-outline"
              >
                Mes Anterior
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoneda(estadisticas.ingresos)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Facturas</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.facturas}</p>
              <p className="text-xs text-gray-500 mt-1">
                {estadisticas.facturasPagadas} pagadas / {estadisticas.facturasPendientes} pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Citas</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.citas}</p>
              <p className="text-xs text-gray-500 mt-1">
                {estadisticas.citasCompletadas} completadas / {estadisticas.citasCanceladas} canceladas
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Promedio Factura</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoneda(estadisticas.promedioFactura)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por mes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Ingresos por Mes (Últimos 6 meses)
          </h2>
          <div className="space-y-3">
            {ingresosPorMes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">{item.mes}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((item.total / Math.max(...ingresosPorMes.map(i => i.total), 1)) * 100, 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {formatMoneda(item.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado de citas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Distribución de Citas
          </h2>
          <div className="space-y-3">
            {estadoCitas.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 capitalize">{item.estado.replace('_', ' ')}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${estadisticas.citas > 0 ? (item.cantidad / estadisticas.citas) * 100 : 0}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.cantidad}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rendimiento por odontólogo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserCog size={20} />
          Rendimiento por Odontólogo
        </h2>
        {reportesOdontologos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Sin datos para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Odontólogo</th>
                  <th className="text-center">Citas</th>
                  <th className="text-center">Completadas</th>
                  <th className="text-center">Canceladas</th>
                  <th className="text-right">Ingresos</th>
                  <th className="text-center">Facturas pagadas</th>
                </tr>
              </thead>
              <tbody>
                {reportesOdontologos.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <p className="font-medium">{o.nombre}</p>
                      {o.especialidad && <p className="text-xs text-gray-400">{o.especialidad}</p>}
                    </td>
                    <td className="text-center">{o.total_citas}</td>
                    <td className="text-center">
                      <span className="badge badge-success badge-sm">{o.citas_completadas}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-error badge-sm">{o.citas_canceladas}</span>
                    </td>
                    <td className="text-right font-semibold text-green-700">{formatMoneda(o.ingresos)}</td>
                    <td className="text-center">{o.facturas_pagadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tasa de asistencia */}
      {(tasaAsistencia.asistieron + tasaAsistencia.noAsistieron) > 0 && (() => {
        const total = tasaAsistencia.asistieron + tasaAsistencia.noAsistieron;
        const pctAsistio = Math.round((tasaAsistencia.asistieron / total) * 100);
        const pctNoAsistio = 100 - pctAsistio;
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Tasa de Asistencia
            </h2>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-700">{pctAsistio}%</p>
                <p className="text-sm text-gray-600 mt-1">Asistieron</p>
                <p className="text-xs text-gray-400">{tasaAsistencia.asistieron} citas</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-700">{pctNoAsistio}%</p>
                <p className="text-sm text-gray-600 mt-1">No asistieron</p>
                <p className="text-xs text-gray-400">{tasaAsistencia.noAsistieron} citas</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-700">{total}</p>
                <p className="text-sm text-gray-600 mt-1">Total registrado</p>
                <p className="text-xs text-gray-400">con asistencia marcada</p>
              </div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${pctAsistio}%` }} />
              <div className="bg-red-400 h-full" style={{ width: `${pctNoAsistio}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Cartera de cobranza */}
      {facturasPendientes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            Cartera de Cobranza
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {facturasPendientes.length} factura{facturasPendientes.length !== 1 ? 's' : ''} pendiente{facturasPendientes.length !== 1 ? 's' : ''} en el período —{' '}
            total: <span className="font-semibold text-amber-700">{formatMoneda(facturasPendientes.reduce((s, f) => s + (f.total || 0), 0))}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Comprobante</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Días pendiente</th>
                </tr>
              </thead>
              <tbody>
                {facturasPendientes.map(f => {
                  const dias = Math.floor((Date.now() - new Date(f.fecha).getTime()) / 86400000);
                  return (
                    <tr key={f.id} className={dias > 30 ? 'bg-red-50' : dias > 7 ? 'bg-amber-50' : ''}>
                      <td>{f.fecha}</td>
                      <td className="font-medium">{f.paciente_nombre || '—'}</td>
                      <td className="capitalize">{f.tipo_comprobante}</td>
                      <td className="text-right font-semibold">{formatMoneda(f.total)}</td>
                      <td className="text-center">
                        <span className={`badge badge-sm ${dias > 30 ? 'badge-error' : dias > 7 ? 'badge-warning' : 'badge-ghost'}`}>
                          {dias}d
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tratamientos más comunes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tratamientos Más Frecuentes</h2>
        {tratamientosMasComunes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Sin tratamientos registrados en citas para este período.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Tratamiento</th>
                <th>Cantidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {tratamientosMasComunes.map((tratamiento, idx) => {
                const total = tratamientosMasComunes.reduce((sum, t) => sum + t.cantidad, 0);
                const porcentaje = total > 0 ? (tratamiento.cantidad / total) * 100 : 0;
                return (
                  <tr key={idx}>
                    <td className="font-medium">{tratamiento.nombre}</td>
                    <td>{tratamiento.cantidad}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-blue-600 h-4 rounded-full"
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{porcentaje.toFixed(1)}%</span>
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
    </div>
  );
}

export default Reportes;


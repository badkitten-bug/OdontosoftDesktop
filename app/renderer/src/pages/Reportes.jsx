import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Download, FileText } from 'lucide-react';
import { getFacturas, getCitas, getPacientes, getTratamientos } from '../services/dbService';
import { exportarAExcel } from '../utils/excelExporter';
import { formatMoneda } from '../utils/formatters';

function Reportes() {
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

  useEffect(() => {
    loadReportes();
  }, [fechaInicio, fechaFin]);

  const loadReportes = async () => {
    try {
      setLoading(true);
      
      // Obtener datos
      const facturas = await getFacturas({
        fecha_desde: fechaInicio,
        fecha_hasta: fechaFin,
      });
      
      const citas = await getCitas({});
      const pacientes = await getPacientes();
      const tratamientos = await getTratamientos();

      // Filtrar citas por rango de fechas
      const citasFiltradas = citas.filter(c => {
        const fechaCita = new Date(c.fecha);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fechaCita >= inicio && fechaCita <= fin;
      });

      // Calcular estadísticas
      const facturasPagadas = facturas.filter(f => f.estado === 'pagada');
      const ingresos = facturasPagadas.reduce((sum, f) => sum + (f.total || 0), 0);
      const promedioFactura = facturasPagadas.length > 0 ? ingresos / facturasPagadas.length : 0;

      setEstadisticas({
        ingresos,
        facturas: facturas.length,
        citas: citasFiltradas.length,
        pacientes: pacientes.length,
        tratamientos: tratamientos.length,
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

      // Tratamientos más comunes (simulado - necesitarías datos reales de citas_tratamientos)
      setTratamientosMasComunes(tratamientos.slice(0, 5).map(t => ({
        nombre: t.nombre,
        cantidad: Math.floor(Math.random() * 20) + 1, // Simulado hasta tener datos reales
      })));

      // Estado de citas
      const estados = ['programada', 'confirmada', 'en_proceso', 'completada', 'cancelada'];
      setEstadoCitas(estados.map(estado => ({
        estado,
        cantidad: citasFiltradas.filter(c => c.estado === estado).length,
      })));

    } catch (error) {
      console.error('Error al cargar reportes:', error);
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

      {/* Tratamientos más comunes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tratamientos Más Comunes</h2>
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
      </div>
    </div>
  );
}

export default Reportes;


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, Users, AlertCircle, Clock } from 'lucide-react';
import { getCitasPorFecha, getFacturas, getPacientes, getProductosStockBajo } from '../services/dbService';
import { formatMoneda } from '../utils/formatters';
import OnboardingChecklist from '../components/OnboardingChecklist';

function Dashboard() {
  const navigate = useNavigate();
  const [citasHoy, setCitasHoy] = useState([]);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [pacientesActivos, setPacientesActivos] = useState(0);
  const [productosStockBajo, setProductosStockBajo] = useState([]);
  const [deudaPendiente, setDeudaPendiente] = useState({ monto: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatos();
  }, []);

  const loadDatos = async () => {
    try {
      setLoading(true);
      const hoy = new Date().toISOString().split('T')[0];
      
      // Citas de hoy
      const citas = await getCitasPorFecha(hoy);
      setCitasHoy(citas.filter(c => c.estado !== 'cancelada'));

      // Ingresos del mes
      const fechaInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const fechaFin = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      const facturas = await getFacturas({
        fecha_desde: fechaInicio,
        fecha_hasta: fechaFin,
        estado: 'pagada',
      });
      const total = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
      setIngresosMes(total);

      // Pacientes activos (con citas en los últimos 30 días)
      const pacientes = await getPacientes();
      setPacientesActivos(pacientes.length);

      // Productos con stock bajo
      const stockBajo = await getProductosStockBajo();
      setProductosStockBajo(stockBajo);

      // Deuda pendiente (facturas no pagadas)
      const pendientes = await getFacturas({ estado: 'pendiente' });
      setDeudaPendiente({
        monto: pendientes.reduce((sum, f) => sum + (f.total || 0), 0),
        count: pendientes.length,
      });
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'programada':
        return 'badge-info';
      case 'confirmada':
        return 'badge-success';
      case 'en_proceso':
        return 'badge-warning';
      case 'completada':
        return 'badge-success';
      default:
        return 'badge-ghost';
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general de la clínica</p>
      </div>

      <OnboardingChecklist />

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Citas de Hoy</p>
              <p className="text-3xl font-bold text-gray-800">{citasHoy.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos del Mes</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoneda(ingresosMes)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pacientes</p>
              <p className="text-3xl font-bold text-gray-800">{pacientesActivos}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
              <p className="text-3xl font-bold text-gray-800">{productosStockBajo.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/facturacion')}
          className="bg-white rounded-lg shadow-sm border border-amber-200 p-6 text-left hover:bg-amber-50 transition-colors w-full"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Deuda Pendiente</p>
              <p className="text-3xl font-bold text-amber-700">{formatMoneda(deudaPendiente.monto)}</p>
              <p className="text-xs text-gray-500 mt-1">{deudaPendiente.count} factura{deudaPendiente.count !== 1 ? 's' : ''} por cobrar</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas de hoy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Citas de Hoy</h2>
          {citasHoy.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-3">
              {citasHoy.slice(0, 5).map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{cita.paciente_nombre}</p>
                    <p className="text-sm text-gray-600">
                      {cita.hora_inicio} - {cita.odontologo_nombre}
                    </p>
                  </div>
                  <span className={`badge ${getEstadoColor(cita.estado)}`}>
                    {cita.estado}
                  </span>
                </div>
              ))}
              {citasHoy.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  +{citasHoy.length - 5} citas más
                </p>
              )}
            </div>
          )}
        </div>

        {/* Productos con stock bajo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Productos con Stock Bajo</h2>
          {productosStockBajo.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Todos los productos tienen stock suficiente</p>
          ) : (
            <div className="space-y-3">
              {productosStockBajo.slice(0, 5).map((producto) => (
                <div key={producto.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{producto.nombre}</p>
                    <p className="text-sm text-gray-600">
                      Stock: {producto.stock} / Mínimo: {producto.stock_minimo}
                    </p>
                  </div>
                  <AlertCircle className="text-orange-600" size={20} />
                </div>
              ))}
              {productosStockBajo.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  +{productosStockBajo.length - 5} productos más
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;


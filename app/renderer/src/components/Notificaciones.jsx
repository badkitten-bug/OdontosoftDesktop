import { useState, useEffect } from 'react';
import { Bell, X, Calendar, DollarSign, Package, AlertCircle } from 'lucide-react';
import { getRecordatoriosNoVistos, marcarRecordatorioVisto, deleteRecordatorio } from '../services/dbService';

function Notificaciones() {
  const [recordatorios, setRecordatorios] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecordatorios();
    // Recargar cada 30 segundos
    const interval = setInterval(loadRecordatorios, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRecordatorios = async () => {
    try {
      setLoading(true);
      const data = await getRecordatoriosNoVistos();
      setRecordatorios(data);
    } catch (error) {
      console.error('Error al cargar recordatorios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarVisto = async (id) => {
    try {
      await marcarRecordatorioVisto(id);
      await loadRecordatorios();
    } catch (error) {
      console.error('Error al marcar recordatorio como visto:', error);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await deleteRecordatorio(id);
      await loadRecordatorios();
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
    }
  };

  const getIcono = (tipo) => {
    switch (tipo) {
      case 'cita':
        return <Calendar size={18} className="text-blue-500" />;
      case 'pago':
        return <DollarSign size={18} className="text-green-500" />;
      case 'stock':
        return <Package size={18} className="text-orange-500" />;
      default:
        return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  const sinLeer = recordatorios.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificaciones"
      >
        <Bell size={20} />
        {sinLeer > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notificaciones</h3>
              {sinLeer > 0 && (
                <span className="badge badge-primary badge-sm">{sinLeer} sin leer</span>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : recordatorios.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recordatorios.map((recordatorio) => (
                  <div
                    key={recordatorio.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcono(recordatorio.tipo)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 text-sm mb-1">
                          {recordatorio.titulo}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {recordatorio.mensaje}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {new Date(recordatorio.fecha_recordatorio).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMarcarVisto(recordatorio.id)}
                          className="btn btn-xs btn-ghost"
                          title="Marcar como leído"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recordatorios.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    recordatorios.forEach((r) => handleMarcarVisto(r.id));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Notificaciones;


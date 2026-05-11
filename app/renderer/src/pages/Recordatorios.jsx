import { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Plus, RefreshCw, Calendar, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getRecordatorios,
  addRecordatorio,
  marcarRecordatorioVisto,
  deleteRecordatorio,
  generarRecordatoriosCitas,
  generarRecordatoriosPagos,
} from '../services/dbService';
import { useConfirm, useToast } from '../context/UIContext';

const TIPO_CONFIG = {
  cita:   { label: 'Cita',   color: 'badge-info',    icon: Calendar },
  pago:   { label: 'Pago',   color: 'badge-warning', icon: DollarSign },
  manual: { label: 'Manual', color: 'badge-neutral',  icon: Bell },
};

function Recordatorios() {
  const confirm = useConfirm();
  const toast = useToast();

  const [recordatorios, setRecordatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes'); // pendientes | todos | vistos
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: '',
    fecha_recordatorio: new Date().toISOString().split('T')[0],
    tipo: 'manual',
  });

  useEffect(() => {
    loadRecordatorios();
  }, [filtro]);

  const loadRecordatorios = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtro === 'pendientes') filtros.visto = false;
      if (filtro === 'vistos') filtros.visto = true;
      const data = await getRecordatorios(filtros);
      setRecordatorios(data);
    } catch (error) {
      console.error('Error al cargar recordatorios:', error);
      toast.error('No se pudieron cargar los recordatorios.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarVisto = async (id) => {
    try {
      await marcarRecordatorioVisto(id);
      await loadRecordatorios();
    } catch (error) {
      toast.error('No se pudo marcar como visto.');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar recordatorio',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deleteRecordatorio(id);
      toast.success('Recordatorio eliminado.');
      await loadRecordatorios();
    } catch (error) {
      toast.error('No se pudo eliminar el recordatorio.');
    }
  };

  const handleGenerar = async () => {
    try {
      const [resCitas, resPagos] = await Promise.all([
        generarRecordatoriosCitas(),
        generarRecordatoriosPagos(),
      ]);
      const total = (resCitas.creados || 0) + (resPagos.creados || 0);
      toast.success(`${total} recordatorio(s) generado(s) automáticamente.`);
      await loadRecordatorios();
    } catch (error) {
      toast.error('Error al generar recordatorios automáticos.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addRecordatorio(formData);
      toast.success('Recordatorio creado.');
      setShowModal(false);
      setFormData({ titulo: '', mensaje: '', fecha_recordatorio: new Date().toISOString().split('T')[0], tipo: 'manual' });
      await loadRecordatorios();
    } catch (error) {
      toast.error('No se pudo crear el recordatorio.');
    }
  };

  const pendientes = recordatorios.filter(r => !r.visto).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={28} />
            Recordatorios
            {pendientes > 0 && (
              <span className="badge badge-error badge-sm">{pendientes}</span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Alertas de citas y pagos pendientes</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerar}
            className="btn btn-outline btn-secondary gap-2"
            title="Generar recordatorios automáticos de citas (mañana) y pagos pendientes"
          >
            <RefreshCw size={18} />
            Auto-generar
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary gap-2"
          >
            <Plus size={20} />
            Nuevo
          </button>
        </div>
      </div>

      {/* Tabs de filtro */}
      <div className="tabs tabs-boxed bg-white border border-gray-200 w-fit">
        {[
          { key: 'pendientes', label: 'Pendientes' },
          { key: 'todos',      label: 'Todos' },
          { key: 'vistos',     label: 'Vistos' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`tab ${filtro === key ? 'tab-active' : ''}`}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : recordatorios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BellOff size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Sin recordatorios {filtro === 'pendientes' ? 'pendientes' : ''}</p>
            <p className="text-sm mt-1">Usa "Auto-generar" para crear alertas de citas y pagos.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recordatorios.map((rec) => {
              const tipo = TIPO_CONFIG[rec.tipo] || TIPO_CONFIG.manual;
              const TipoIcon = tipo.icon;
              const vencido = !rec.visto && new Date(rec.fecha_recordatorio) < new Date(new Date().toDateString());

              return (
                <div
                  key={rec.id}
                  className={`p-4 flex items-start gap-4 ${rec.visto ? 'opacity-60' : ''} ${vencido ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${rec.visto ? 'bg-gray-100' : vencido ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <TipoIcon size={16} className={rec.visto ? 'text-gray-400' : vencido ? 'text-red-600' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800">{rec.titulo}</span>
                      <span className={`badge badge-sm ${tipo.color}`}>{tipo.label}</span>
                      {vencido && <span className="badge badge-error badge-sm">Vencido</span>}
                      {rec.visto && <span className="badge badge-success badge-sm">Visto</span>}
                    </div>
                    {rec.mensaje && (
                      <p className="text-sm text-gray-600 mb-1">{rec.mensaje}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      <Calendar size={12} className="inline mr-1" />
                      {new Date(rec.fecha_recordatorio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!rec.visto && (
                      <button
                        type="button"
                        onClick={() => handleMarcarVisto(rec.id)}
                        className="btn btn-xs btn-ghost text-green-600 gap-1"
                        title="Marcar como visto"
                      >
                        <CheckCircle2 size={14} />
                        Visto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(rec.id)}
                      className="btn btn-xs btn-ghost text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="alert alert-info shadow-sm">
        <AlertCircle size={18} />
        <div className="text-sm">
          <span className="font-semibold">Auto-generar</span> crea alertas para citas del día siguiente
          y facturas con saldo pendiente. Ejecútalo al iniciar el día.
        </div>
      </div>

      {/* Modal nuevo recordatorio */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nuevo Recordatorio</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Título *</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Mensaje</span></label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Fecha *</span></label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.fecha_recordatorio}
                    onChange={(e) => setFormData({ ...formData, fecha_recordatorio: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Tipo</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  >
                    <option value="manual">Manual</option>
                    <option value="cita">Cita</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  );
}

export default Recordatorios;

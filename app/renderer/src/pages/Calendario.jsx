import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCitas, updateCita } from '../services/dbService';
import { useToast } from '../context/UIContext';

const HORAS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 – 20:00

const NOMBRES_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_COLOR = {
  programada: 'bg-blue-100 text-blue-800 border-blue-300',
  confirmada: 'bg-green-100 text-green-800 border-green-300',
  en_proceso: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completada: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelada: 'bg-red-100 text-red-800 border-red-300',
};

function Calendario() {
  const navigate = useNavigate();
  const toast = useToast();
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vista, setVista] = useState('mes');
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { loadCitas(); }, [fechaActual, vista]); // eslint-disable-line

  const loadCitas = async () => {
    try {
      setLoading(true);
      let fechaInicio, fechaFin;
      if (vista === 'mes') {
        fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];
        fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (vista === 'semana') {
        const ini = new Date(fechaActual);
        ini.setDate(fechaActual.getDate() - fechaActual.getDay());
        const fin = new Date(ini);
        fin.setDate(ini.getDate() + 6);
        fechaInicio = ini.toISOString().split('T')[0];
        fechaFin = fin.toISOString().split('T')[0];
      } else {
        fechaInicio = fechaActual.toISOString().split('T')[0];
        fechaFin = fechaInicio;
      }
      const data = await getCitas({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      setCitas(data);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const navegar = (dir) => {
    const nueva = new Date(fechaActual);
    if (vista === 'mes') nueva.setMonth(fechaActual.getMonth() + dir);
    else if (vista === 'semana') nueva.setDate(fechaActual.getDate() + dir * 7);
    else nueva.setDate(fechaActual.getDate() + dir);
    setFechaActual(nueva);
  };

  const esHoy = (fecha) => new Date().toDateString() === fecha.toDateString();

  const getCitasDia = (fecha) => {
    const s = fecha.toISOString().split('T')[0];
    return citas.filter(c => c.fecha === s);
  };

  const getCitasHora = (fecha, hora) => {
    const s = fecha.toISOString().split('T')[0];
    return citas.filter(c => c.fecha === s && parseInt(c.hora_inicio?.split(':')[0] ?? '-1', 10) === hora);
  };

  const abrirDetalle = (cita) => { setCitaDetalle(cita); setNuevoEstado(cita.estado); };
  const cerrarDetalle = () => { setCitaDetalle(null); setNuevoEstado(''); };

  const guardarEstado = async () => {
    if (!citaDetalle) return;
    if (nuevoEstado === citaDetalle.estado) { cerrarDetalle(); return; }
    try {
      setGuardando(true);
      await updateCita(citaDetalle.id, { ...citaDetalle, estado: nuevoEstado });
      toast.success('Estado actualizado.');
      await loadCitas();
      cerrarDetalle();
    } catch {
      toast.error('No se pudo actualizar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  // --- Vista Mes ---
  const getDiasMes = () => {
    const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    const dias = [];
    const mesAnt = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 0);
    for (let i = primerDia.getDay() - 1; i >= 0; i--)
      dias.push({ fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, mesAnt.getDate() - i), esDelMes: false });
    for (let i = 1; i <= ultimoDia.getDate(); i++)
      dias.push({ fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth(), i), esDelMes: true });
    for (let i = 1; dias.length < 42; i++)
      dias.push({ fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, i), esDelMes: false });
    return dias;
  };

  // --- Vista Semana ---
  const getDiasSemana = () => {
    const ini = new Date(fechaActual);
    ini.setDate(fechaActual.getDate() - fechaActual.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
  };

  const getTitulo = () => {
    if (vista === 'mes') return `${NOMBRES_MESES[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
    if (vista === 'semana') {
      const dias = getDiasSemana();
      const a = dias[0], z = dias[6];
      return a.getMonth() === z.getMonth()
        ? `${a.getDate()} – ${z.getDate()} ${NOMBRES_MESES[a.getMonth()]} ${a.getFullYear()}`
        : `${a.getDate()} ${NOMBRES_MESES[a.getMonth()]} – ${z.getDate()} ${NOMBRES_MESES[z.getMonth()]} ${z.getFullYear()}`;
    }
    return fechaActual.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Calendario</h1>
        <div className="flex items-center gap-2">
          <div className="join">
            {['mes', 'semana', 'dia'].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`join-item btn btn-sm ${vista === v ? 'btn-primary' : 'btn-outline'}`}
              >
                {v === 'dia' ? 'Día' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/citas')} className="btn btn-sm btn-primary gap-1">
            <Plus size={16} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Navegación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center justify-between">
        <button type="button" onClick={() => navegar(-1)} className="btn btn-ghost btn-sm"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-800 capitalize">{getTitulo()}</span>
          <button type="button" onClick={() => setFechaActual(new Date())} className="btn btn-sm btn-outline">Hoy</button>
        </div>
        <button type="button" onClick={() => navegar(1)} className="btn btn-ghost btn-sm"><ChevronRight size={20} /></button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* ── VISTA MES ── */}
      {!loading && vista === 'mes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {NOMBRES_DIAS.map(d => (
              <div key={d} className="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getDiasMes().map((dia) => {
              const citasDia = getCitasDia(dia.fecha);
              const hoy = esHoy(dia.fecha);
              return (
                <div
                  key={dia.fecha.toISOString()}
                  className={`min-h-[110px] border-r border-b border-gray-200 p-1.5 ${!dia.esDelMes ? 'bg-gray-50' : hoy ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${!dia.esDelMes ? 'text-gray-400' : hoy ? 'text-blue-600' : 'text-gray-700'}`}>
                    {hoy
                      ? <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">{dia.fecha.getDate()}</span>
                      : dia.fecha.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {citasDia.slice(0, 3).map(cita => (
                      <button
                        key={cita.id}
                        type="button"
                        onClick={() => abrirDetalle(cita)}
                        className={`w-full text-left text-xs p-1 rounded border truncate hover:opacity-75 ${ESTADO_COLOR[cita.estado]}`}
                      >
                        <span className="font-medium">{cita.hora_inicio}</span> {cita.paciente_nombre}
                      </button>
                    ))}
                    {citasDia.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">+{citasDia.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA SEMANA ── */}
      {!loading && vista === 'semana' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
          <div style={{ minWidth: 700 }}>
            {/* Cabecera días */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="p-2 border-r border-gray-200" />
              {getDiasSemana().map((dia) => (
                <div
                  key={dia.toISOString()}
                  className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${esHoy(dia) ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-xs text-gray-500">{NOMBRES_DIAS[dia.getDay()]}</div>
                  <div className={`text-sm font-semibold ${esHoy(dia) ? 'text-blue-600' : 'text-gray-800'}`}>{dia.getDate()}</div>
                </div>
              ))}
            </div>
            {/* Franjas horarias */}
            {HORAS.map(hora => (
              <div key={hora} className="grid grid-cols-8 border-b border-gray-100 min-h-[50px]">
                <div className="text-xs text-gray-400 border-r border-gray-200 flex items-start justify-end pr-2 pt-1 py-1">{hora}:00</div>
                {getDiasSemana().map((dia) => {
                  const citasSlot = getCitasHora(dia, hora);
                  return (
                    <div
                      key={dia.toISOString()}
                      className={`p-0.5 border-r border-gray-100 last:border-r-0 space-y-0.5 ${esHoy(dia) ? 'bg-blue-50/30' : ''}`}
                    >
                      {citasSlot.map(cita => (
                        <button
                          key={cita.id}
                          type="button"
                          onClick={() => abrirDetalle(cita)}
                          className={`w-full text-left text-xs p-1 rounded border truncate hover:opacity-75 ${ESTADO_COLOR[cita.estado]}`}
                        >
                          <span className="font-medium">{cita.hora_inicio}</span> {cita.paciente_nombre}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA DÍA ── */}
      {!loading && vista === 'dia' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className={`border-b border-gray-200 p-3 text-center ${esHoy(fechaActual) ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <span className={`text-lg font-semibold capitalize ${esHoy(fechaActual) ? 'text-blue-600' : 'text-gray-800'}`}>
              {fechaActual.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          {HORAS.map(hora => {
            const citasSlot = getCitasHora(fechaActual, hora);
            return (
              <div key={hora} className="flex gap-3 border-b border-gray-100 min-h-[52px] px-3 py-2">
                <div className="text-xs text-gray-400 w-12 flex-shrink-0 pt-1">{hora}:00</div>
                <div className="flex-1 space-y-1">
                  {citasSlot.map(cita => (
                    <button
                      key={cita.id}
                      type="button"
                      onClick={() => abrirDetalle(cita)}
                      className={`w-full text-left text-sm p-2 rounded border hover:opacity-75 ${ESTADO_COLOR[cita.estado]}`}
                    >
                      <span className="font-medium">{cita.hora_inicio} – {cita.hora_fin}</span>
                      {' · '}{cita.paciente_nombre}
                      {cita.odontologo_nombre && (
                        <span className="text-xs ml-2 opacity-70">Dr/a. {cita.odontologo_nombre}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-wrap gap-4">
            {[
              ['programada', 'Programada'],
              ['confirmada', 'Confirmada'],
              ['en_proceso', 'En Proceso'],
              ['completada', 'Completada'],
              ['cancelada', 'Cancelada'],
            ].map(([estado, label]) => (
              <div key={estado} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${ESTADO_COLOR[estado]}`} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal detalle / cambio de estado */}
      {citaDetalle && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg">Detalle de Cita</h3>
              <button type="button" onClick={cerrarDetalle} className="btn btn-ghost btn-sm btn-circle">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                ['Paciente', citaDetalle.paciente_nombre],
                ['Odontólogo', citaDetalle.odontologo_nombre || '—'],
                ['Fecha', new Date(citaDetalle.fecha + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Horario', `${citaDetalle.hora_inicio} – ${citaDetalle.hora_fin}`],
                citaDetalle.motivo ? ['Motivo', citaDetalle.motivo] : null,
                citaDetalle.observaciones ? ['Observaciones', citaDetalle.observaciones] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-500 text-sm w-28 flex-shrink-0">{label}:</span>
                  <span className="text-sm">{label === 'Horario' ? <span className="flex items-center gap-1"><Clock size={13} />{value}</span> : value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-gray-500 text-sm w-28 flex-shrink-0">Estado:</span>
                <select
                  className="select select-bordered select-sm flex-1"
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  <option value="programada">Programada</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
            <div className="modal-action">
              <button type="button" onClick={cerrarDetalle} className="btn btn-ghost">Cerrar</button>
              <button type="button" onClick={guardarEstado} className="btn btn-primary" disabled={guardando}>
                {guardando ? <span className="loading loading-spinner loading-sm" /> : 'Guardar Estado'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={cerrarDetalle} />
        </div>
      )}
    </div>
  );
}

export default Calendario;

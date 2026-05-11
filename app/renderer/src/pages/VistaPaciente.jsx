import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, FileText, ClipboardList, Pill, Receipt, Activity } from 'lucide-react';
import {
  getPaciente,
  getHistorial,
  getCitas,
  getPlanesPaciente,
  getPrescripcionesPaciente,
  getFacturas,
} from '../services/dbService';
import { formatMoneda } from '../utils/formatters';
import { useToast } from '../context/UIContext';

const TABS = [
  { id: 'resumen',       label: 'Resumen',          icon: Activity },
  { id: 'historial',     label: 'Historia Clínica',  icon: FileText },
  { id: 'citas',         label: 'Citas',             icon: Calendar },
  { id: 'planes',        label: 'Planes',            icon: ClipboardList },
  { id: 'prescripciones',label: 'Prescripciones',    icon: Pill },
  { id: 'facturas',      label: 'Facturas',          icon: Receipt },
];

const ESTADO_BADGE = {
  programada:  'badge-info',
  confirmada:  'badge-success',
  en_proceso:  'badge-warning',
  completada:  'badge-success',
  cancelada:   'badge-error',
};

function VistaPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [tabActivo, setTabActivo] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [citas, setCitas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [prescripciones, setPrescripciones] = useState([]);
  const [facturas, setFacturas] = useState([]);

  useEffect(() => {
    loadAll();
  }, [id]); // eslint-disable-line

  const loadAll = async () => {
    try {
      setLoading(true);
      const idNum = parseInt(id, 10);
      const [pac, hist, cit, plan, presc, fact] = await Promise.all([
        getPaciente(idNum),
        getHistorial(idNum),
        getCitas({ id_paciente: idNum }),
        getPlanesPaciente(idNum),
        getPrescripcionesPaciente(idNum, false),
        getFacturas({ id_paciente: idNum }),
      ]);
      setPaciente(pac);
      setHistorial(hist || []);
      setCitas(cit || []);
      setPlanes(plan || []);
      setPrescripciones(presc || []);
      setFacturas(fact || []);
    } catch (error) {
      console.error('Error al cargar datos del paciente:', error);
      toast.error('No se pudo cargar el perfil del paciente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Paciente no encontrado.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('/pacientes')}>
          Volver a Pacientes
        </button>
      </div>
    );
  }

  const ingresoTotal = facturas.filter(f => f.estado === 'pagada').reduce((s, f) => s + (f.total || 0), 0);
  const citasCompletadas = citas.filter(c => c.estado === 'completada').length;

  const tabCounts = {
    historial: historial.length,
    citas: citas.length,
    planes: planes.length,
    prescripciones: prescripciones.length,
    facturas: facturas.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/pacientes')} className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            {paciente.nombre}
          </h1>
          <div className="flex gap-4 text-sm text-gray-500 mt-1 ml-13">
            {paciente.dni && <span>DNI: {paciente.dni}</span>}
            {paciente.telefono && <span>Tel: {paciente.telefono}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-white border border-gray-200">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            className={`tab gap-1 ${tabActivo === tabId ? 'tab-active' : ''}`}
            onClick={() => setTabActivo(tabId)}
          >
            <Icon size={14} />
            {label}
            {tabCounts[tabId] > 0 && (
              <span className="badge badge-sm badge-neutral ml-1">{tabCounts[tabId]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}

      {/* RESUMEN */}
      {tabActivo === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Citas" value={citas.length} sub={`${citasCompletadas} completadas`} color="blue" />
            <StatCard label="Historia Clínica" value={historial.length} sub="registros" color="green" />
            <StatCard label="Prescripciones" value={prescripciones.length} sub="emitidas" color="purple" />
            <StatCard label="Total facturado" value={formatMoneda(ingresoTotal)} sub="pagado" color="orange" />
          </div>

          {/* Datos extra del paciente */}
          {paciente.datos_extra && Object.keys(paciente.datos_extra).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Datos adicionales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(paciente.datos_extra).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400 capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium text-gray-700">{String(v) || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Última cita y último historial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {citas.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Última cita</h3>
                {(() => {
                  const ultima = [...citas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
                  return (
                    <div>
                      <p className="text-sm font-medium">{ultima.fecha} {ultima.hora_inicio}</p>
                      <p className="text-sm text-gray-500">{ultima.odontologo_nombre}</p>
                      {ultima.motivo && <p className="text-xs text-gray-400 mt-1">{ultima.motivo}</p>}
                      <span className={`badge badge-sm mt-2 ${ESTADO_BADGE[ultima.estado] || 'badge-neutral'}`}>{ultima.estado}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {historial.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Último registro clínico</h3>
                {(() => {
                  const ultimo = historial[0];
                  return (
                    <div>
                      <p className="text-sm font-medium">{ultimo.fecha}</p>
                      {ultimo.odontologo_nombre && <p className="text-sm text-gray-500">Dr/a. {ultimo.odontologo_nombre}</p>}
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ultimo.descripcion}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORIAL CLÍNICO */}
      {tabActivo === 'historial' && (
        <div className="space-y-3">
          {historial.length === 0 ? (
            <EmptyTabMsg text="Sin registros clínicos." action="Ir a Historia Clínica" onAction={() => navigate('/historias')} />
          ) : historial.map(entry => (
            <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{entry.fecha}</p>
                  {entry.odontologo_nombre && <p className="text-sm text-indigo-700">Dr/a. {entry.odontologo_nombre}</p>}
                  {entry.id_cita && <span className="badge badge-secondary badge-sm">Cita #{entry.id_cita}</span>}
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2">{entry.descripcion}</p>
            </div>
          ))}
        </div>
      )}

      {/* CITAS */}
      {tabActivo === 'citas' && (
        <div className="space-y-3">
          {citas.length === 0 ? (
            <EmptyTabMsg text="Sin citas registradas." action="Ir a Citas" onAction={() => navigate('/citas')} />
          ) : [...citas].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(cita => (
            <div key={cita.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{cita.fecha} — {cita.hora_inicio}–{cita.hora_fin}</p>
                <p className="text-sm text-gray-500">{cita.odontologo_nombre}</p>
                {cita.motivo && <p className="text-xs text-gray-400 mt-1">{cita.motivo}</p>}
              </div>
              <span className={`badge badge-sm ${ESTADO_BADGE[cita.estado] || 'badge-neutral'}`}>{cita.estado}</span>
            </div>
          ))}
        </div>
      )}

      {/* PLANES DE TRATAMIENTO */}
      {tabActivo === 'planes' && (
        <div className="space-y-3">
          {planes.length === 0 ? (
            <EmptyTabMsg text="Sin planes de tratamiento." action="Ir a Planes" onAction={() => navigate('/planes-tratamiento')} />
          ) : planes.map(plan => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{plan.nombre || `Plan #${plan.id}`}</p>
                  {plan.descripcion && <p className="text-sm text-gray-500">{plan.descripcion}</p>}
                  <p className="text-xs text-gray-400 mt-1">Creado: {plan.fecha_inicio || plan.created_at?.split('T')[0]}</p>
                </div>
                <span className={`badge badge-sm ${plan.estado === 'completado' ? 'badge-success' : plan.estado === 'cancelado' ? 'badge-error' : 'badge-warning'}`}>
                  {plan.estado || 'en_progreso'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRESCRIPCIONES */}
      {tabActivo === 'prescripciones' && (
        <div className="space-y-3">
          {prescripciones.length === 0 ? (
            <EmptyTabMsg text="Sin prescripciones." action="Ir a Prescripciones" onAction={() => navigate('/prescripciones')} />
          ) : prescripciones.map(presc => {
            let meds = [];
            try { meds = typeof presc.medicamentos === 'string' ? JSON.parse(presc.medicamentos) : presc.medicamentos || []; } catch { meds = []; }
            return (
              <div key={presc.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{presc.fecha}</p>
                    <p className="text-sm text-gray-500">{presc.odontologo_nombre}</p>
                  </div>
                  {presc.activa === 1 && <span className="badge badge-success badge-sm">Activa</span>}
                </div>
                <div className="space-y-1">
                  {meds.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-xs text-gray-600">• {m.nombre} {m.dosis && `— ${m.dosis}`}</p>
                  ))}
                  {meds.length > 3 && <p className="text-xs text-gray-400">+{meds.length - 3} más</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FACTURAS */}
      {tabActivo === 'facturas' && (
        <div className="space-y-3">
          {facturas.length === 0 ? (
            <EmptyTabMsg text="Sin facturas." action="Ir a Facturación" onAction={() => navigate('/facturacion')} />
          ) : facturas.map(f => (
            <div key={f.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{f.numero || `Factura #${f.id}`}</p>
                <p className="text-sm text-gray-500">{f.fecha} — {f.tipo_comprobante}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">{formatMoneda(f.total)}</p>
                <span className={`badge badge-sm ${f.estado === 'pagada' ? 'badge-success' : f.estado === 'cancelada' ? 'badge-error' : 'badge-warning'}`}>{f.estado}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]?.split(' ')[1] || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function EmptyTabMsg({ text, action, onAction }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
      <p>{text}</p>
      <button type="button" className="btn btn-sm btn-outline btn-primary mt-3" onClick={onAction}>{action}</button>
    </div>
  );
}

export default VistaPaciente;

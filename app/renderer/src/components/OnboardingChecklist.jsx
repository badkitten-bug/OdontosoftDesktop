import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getOnboardingStatus } from '../services/dbService';

const PASOS = [
  {
    key: 'clinicaConfigurada',
    label: 'Configura tu clínica',
    desc: 'Nombre, RUC, dirección y moneda.',
    ruta: '/configuracion',
    accion: 'Ir a Configuración',
  },
  {
    key: 'tieneOdontologos',
    label: 'Agrega un odontólogo',
    desc: 'Necesario para agendar citas y registrar atenciones.',
    ruta: '/odontologos',
    accion: 'Ir a Odontólogos',
  },
  {
    key: 'tieneHorarios',
    label: 'Define los horarios',
    desc: 'Configura en qué días y horas atiende cada odontólogo.',
    ruta: '/horarios',
    accion: 'Ir a Horarios',
  },
  {
    key: 'tienePacientes',
    label: 'Registra tu primer paciente',
    desc: 'Sin pacientes no puedes agendar citas ni emitir comprobantes.',
    ruta: '/pacientes',
    accion: 'Ir a Pacientes',
  },
  {
    key: 'tieneTratamientos',
    label: 'Crea tu catálogo de tratamientos',
    desc: 'Define los procedimientos y sus precios.',
    ruta: '/tratamientos',
    accion: 'Ir a Tratamientos',
  },
  {
    key: 'tieneCitas',
    label: 'Agenda tu primera cita',
    desc: 'Ya tienes todo listo para empezar a operar.',
    ruta: '/citas',
    accion: 'Ir a Citas',
  },
];

export default function OnboardingChecklist({ onComplete }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('onboarding_dismissed') === '1');

  useEffect(() => {
    getOnboardingStatus().then(setStatus);
  }, []);

  if (dismissed || !status) return null;

  const completados = PASOS.filter((p) => status[p.key]).length;
  const total = PASOS.length;
  const todoCompleto = completados === total;

  if (todoCompleto) {
    // Notificar al padre y no renderizar más
    onComplete?.();
    return null;
  }

  const progreso = Math.round((completados / total) * 100);
  // Primer paso pendiente
  const siguientePaso = PASOS.find((p) => !status[p.key]);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <div className="radial-progress text-blue-600 text-xs font-bold" style={{ '--value': progreso, '--size': '2.8rem', '--thickness': '4px' }} role="progressbar">
              {completados}/{total}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm">Configura tu clínica</p>
            <p className="text-xs text-gray-500">{completados} de {total} pasos completados</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs text-gray-400 hover:text-gray-600"
            onClick={handleDismiss}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-gray-100">
        <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progreso}%` }} />
      </div>

      {/* Lista de pasos */}
      {!collapsed && (
        <div className="divide-y divide-gray-100">
          {PASOS.map((paso) => {
            const done = !!status[paso.key];
            const esSiguiente = paso.key === siguientePaso?.key;
            return (
              <div
                key={paso.key}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${esSiguiente ? 'bg-blue-50/60' : ''}`}
              >
                <div className="flex-shrink-0">
                  {done
                    ? <CheckCircle2 size={20} className="text-emerald-500" />
                    : <Circle size={20} className={esSiguiente ? 'text-blue-400' : 'text-gray-300'} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : esSiguiente ? 'text-blue-700' : 'text-gray-700'}`}>
                    {paso.label}
                  </p>
                  {!done && (
                    <p className="text-xs text-gray-500 truncate">{paso.desc}</p>
                  )}
                </div>
                {!done && (
                  <button
                    type="button"
                    className={`btn btn-xs flex-shrink-0 ${esSiguiente ? 'btn-primary' : 'btn-ghost text-blue-500'}`}
                    onClick={() => navigate(paso.ruta)}
                  >
                    {paso.accion}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Atajo al siguiente paso cuando está colapsado */}
      {collapsed && siguientePaso && (
        <div className="px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-600">Siguiente: <span className="font-medium text-blue-700">{siguientePaso.label}</span></p>
          <button type="button" className="btn btn-primary btn-xs" onClick={() => navigate(siguientePaso.ruta)}>
            {siguientePaso.accion}
          </button>
        </div>
      )}
    </div>
  );
}

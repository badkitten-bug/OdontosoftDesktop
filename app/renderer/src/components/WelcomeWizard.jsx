import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Coins,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Users,
  Stethoscope,
  Calendar,
  Receipt,
  PartyPopper,
} from 'lucide-react';
import {
  getConfiguracionClinica,
  setConfiguracionClinica,
  marcarSetupCompletado,
} from '../services/dbService';
import { useUser } from '../context/UserContext';

const FORMATOS_FECHA = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Perú)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
];

const MONEDAS = [
  { simbolo: 'S/', codigo: 'PEN', label: 'Sol Peruano (S/)' },
  { simbolo: '$', codigo: 'USD', label: 'Dólar (US$)' },
  { simbolo: '€', codigo: 'EUR', label: 'Euro (€)' },
];

const ACCIONES_BIENVENIDA = [
  {
    titulo: 'Registra a tu primer paciente',
    descripcion: 'Empieza a llevar tus historias clínicas digitales.',
    ruta: '/pacientes',
    icon: Users,
  },
  {
    titulo: 'Configura odontólogos y horarios',
    descripcion: 'Define quién trabaja y en qué horarios atiende.',
    ruta: '/odontologos',
    icon: Stethoscope,
  },
  {
    titulo: 'Crea tu catálogo de tratamientos',
    descripcion: 'Define precios y duración de cada procedimiento.',
    ruta: '/tratamientos',
    icon: Calendar,
  },
  {
    titulo: 'Aprende a emitir comprobantes',
    descripcion: 'Boletas y facturas con IGV automático y numeración SUNAT.',
    ruta: '/facturacion',
    icon: Receipt,
  },
];

function WelcomeWizard() {
  const { markSetupCompleted } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [clinica, setClinica] = useState({
    nombre_clinica: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
  });
  const [prefs, setPrefs] = useState({
    moneda_simbolo: 'S/',
    moneda_codigo: 'PEN',
    igv_porcentaje: 18,
    formato_fecha: 'DD/MM/YYYY',
  });

  // IDs accesibles
  const idNombre = useId();
  const idRuc = useId();
  const idDireccion = useId();
  const idTelefono = useId();
  const idEmail = useId();
  const idMoneda = useId();
  const idIgv = useId();
  const idFormatoFecha = useId();

  useEffect(() => {
    (async () => {
      const cfg = await getConfiguracionClinica();
      if (cfg) {
        setClinica((prev) => ({
          ...prev,
          nombre_clinica: cfg.nombre_clinica && cfg.nombre_clinica !== 'Mi Clínica' ? cfg.nombre_clinica : '',
          ruc: cfg.ruc || '',
          direccion: cfg.direccion || '',
          telefono: cfg.telefono || '',
          email: cfg.email || '',
        }));
        setPrefs({
          moneda_simbolo: cfg.moneda_simbolo || 'S/',
          moneda_codigo: cfg.moneda_codigo || 'PEN',
          igv_porcentaje: cfg.igv_porcentaje ?? 18,
          formato_fecha: cfg.formato_fecha || 'DD/MM/YYYY',
        });
      }
    })();
  }, []);

  const guardarClinica = async () => {
    setError('');
    if (!clinica.nombre_clinica.trim()) {
      setError('El nombre de la clínica es obligatorio');
      return false;
    }
    if (clinica.ruc && !/^\d{11}$/.test(clinica.ruc.trim())) {
      setError('El RUC debe tener exactamente 11 dígitos');
      return false;
    }
    setSaving(true);
    try {
      await setConfiguracionClinica({
        nombre_clinica: clinica.nombre_clinica.trim(),
        ruc: clinica.ruc.trim() || null,
        direccion: clinica.direccion.trim() || null,
        telefono: clinica.telefono.trim() || null,
        email: clinica.email.trim() || null,
      });
      return true;
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la información de la clínica');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const guardarPreferencias = async () => {
    setError('');
    const igv = Number(prefs.igv_porcentaje);
    if (!Number.isFinite(igv) || igv < 0 || igv > 100) {
      setError('El IGV debe estar entre 0 y 100');
      return false;
    }
    setSaving(true);
    try {
      await setConfiguracionClinica({
        moneda_simbolo: prefs.moneda_simbolo,
        moneda_codigo: prefs.moneda_codigo,
        igv_porcentaje: igv,
        formato_fecha: prefs.formato_fecha,
      });
      return true;
    } catch (err) {
      setError(err?.message || 'No se pudieron guardar las preferencias');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSiguiente = async () => {
    if (step === 0) {
      const ok = await guardarClinica();
      if (ok) setStep(1);
      return;
    }
    if (step === 1) {
      const ok = await guardarPreferencias();
      if (ok) setStep(2);
    }
  };

  const finalizarYAbrir = async (ruta) => {
    setError('');
    try {
      await marcarSetupCompletado();
      markSetupCompleted();
      if (ruta) navigate(ruta);
    } catch (err) {
      setError(err?.message || 'No se pudo finalizar la configuración');
    }
  };

  const onMonedaChange = (codigo) => {
    const m = MONEDAS.find((x) => x.codigo === codigo) || MONEDAS[0];
    setPrefs((prev) => ({ ...prev, moneda_codigo: m.codigo, moneda_simbolo: m.simbolo }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <span className="text-4xl">🦷</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">¡Bienvenido a OdontoSoft!</h1>
          <p className="text-gray-600">
            {step < 2
              ? 'Vamos a configurar tu clínica en 2 pasos'
              : 'Listo. Tu clínica ya está configurada.'}
          </p>
        </div>

        <ul className="steps w-full mb-6">
          <li className={`step ${step >= 0 ? 'step-primary' : ''}`}>Datos de la clínica</li>
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Preferencias</li>
          <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>¡Listo!</li>
        </ul>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Building2 size={20} />
              <span>Datos de tu clínica</span>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={idNombre}>
                <span className="label-text font-medium">Nombre de la clínica *</span>
              </label>
              <input
                id={idNombre}
                type="text"
                className="input input-bordered w-full"
                placeholder="Ej: Clínica Dental Sonrisa"
                value={clinica.nombre_clinica}
                onChange={(e) => setClinica({ ...clinica, nombre_clinica: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label" htmlFor={idRuc}>
                  <span className="label-text font-medium">RUC (opcional)</span>
                </label>
                <input
                  id={idRuc}
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="input input-bordered w-full"
                  placeholder="11 dígitos"
                  value={clinica.ruc}
                  onChange={(e) => setClinica({ ...clinica, ruc: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="form-control">
                <label className="label" htmlFor={idTelefono}>
                  <span className="label-text font-medium">Teléfono</span>
                </label>
                <input
                  id={idTelefono}
                  type="tel"
                  className="input input-bordered w-full"
                  placeholder="Ej: 999 888 777"
                  value={clinica.telefono}
                  onChange={(e) => setClinica({ ...clinica, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={idDireccion}>
                <span className="label-text font-medium">Dirección</span>
              </label>
              <input
                id={idDireccion}
                type="text"
                className="input input-bordered w-full"
                placeholder="Av. Principal 123, Lima"
                value={clinica.direccion}
                onChange={(e) => setClinica({ ...clinica, direccion: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={idEmail}>
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                id={idEmail}
                type="email"
                className="input input-bordered w-full"
                placeholder="contacto@miclinica.com"
                value={clinica.email}
                onChange={(e) => setClinica({ ...clinica, email: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Coins size={20} />
              <span>Moneda, IGV y formato de fecha</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label" htmlFor={idMoneda}>
                  <span className="label-text font-medium">Moneda</span>
                </label>
                <select
                  id={idMoneda}
                  className="select select-bordered w-full"
                  value={prefs.moneda_codigo}
                  onChange={(e) => onMonedaChange(e.target.value)}
                >
                  {MONEDAS.map((m) => (
                    <option key={m.codigo} value={m.codigo}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label" htmlFor={idIgv}>
                  <span className="label-text font-medium">IGV / Impuesto (%)</span>
                </label>
                <input
                  id={idIgv}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={prefs.igv_porcentaje}
                  onChange={(e) => setPrefs({ ...prefs, igv_porcentaje: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={idFormatoFecha}>
                <span className="label-text font-medium">Formato de fecha</span>
              </label>
              <select
                id={idFormatoFecha}
                className="select select-bordered w-full"
                value={prefs.formato_fecha}
                onChange={(e) => setPrefs({ ...prefs, formato_fecha: e.target.value })}
              >
                {FORMATOS_FECHA.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="alert alert-info text-sm mt-2">
              <CheckCircle2 size={20} />
              <span>Podrás cambiar todo esto luego desde Configuración.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <PartyPopper size={26} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Tu clínica está lista</h3>
              <p className="text-gray-600 text-sm">
                Estos son buenos primeros pasos. Elige uno para empezar — el resto puedes
                hacerlo cuando quieras desde el menú lateral.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ACCIONES_BIENVENIDA.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.ruta}
                    type="button"
                    onClick={() => finalizarYAbrir(a.ruta)}
                    className="text-left bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{a.titulo}</p>
                      <p className="text-xs text-gray-600">{a.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn btn-ghost gap-2"
                onClick={() => finalizarYAbrir('/dashboard')}
              >
                Ir al Dashboard <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step < 2 && (
          <div className="flex justify-between mt-8">
            <button
              type="button"
              className="btn btn-ghost gap-2"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft size={18} /> Atrás
            </button>

            <button
              type="button"
              className="btn btn-primary gap-2"
              disabled={saving}
              onClick={handleSiguiente}
            >
              {saving && <span className="loading loading-spinner loading-sm" />}
              Siguiente <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeWizard;

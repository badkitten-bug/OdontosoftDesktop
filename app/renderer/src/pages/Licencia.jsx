import { useEffect, useId, useState } from 'react';
import {
  Copy, Check, ShieldCheck, AlertCircle, KeyRound, RotateCcw,
  Download, RefreshCw, FileArchive,
} from 'lucide-react';
import {
  activarLicencia, desactivarLicencia, getLicencia,
  exportarDiagnostico, buscarActualizaciones, instalarActualizacion, onUpdateStatus,
} from '../services/dbService';
import { useUser } from '../context/UserContext';
import { useConfirm } from '../context/UIContext';

const TIPO_LABEL = {
  demo: 'Demo',
  esencial: 'Esencial Local',
  pro: 'Pro Local',
  cloud: 'Cloud Profesional',
};

function Licencia() {
  const { refreshLicencia } = useUser();
  const confirm = useConfirm();
  const [estado, setEstado] = useState(null);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [activating, setActivating] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Diagnóstico y actualizaciones
  const [exportandoDiag, setExportandoDiag] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [buscandoUpdate, setBuscandoUpdate] = useState(false);

  const claveId = useId();

  const cargar = async () => {
    const l = await getLicencia();
    setEstado(l);
  };

  useEffect(() => {
    cargar();
    const off = onUpdateStatus((payload) => setUpdateStatus(payload));
    return () => off?.();
    // cargar() es estable dentro del componente; no lo memoizamos para mantener simple
    // el archivo. La lectura ocurre una sola vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportarDiagnostico = async () => {
    setError('');
    setInfo('');
    setExportandoDiag(true);
    try {
      const res = await exportarDiagnostico();
      if (res?.success) {
        setInfo(`Diagnóstico guardado en ${res.ruta}`);
      } else if (!res?.cancelado) {
        setError('No se pudo generar el diagnóstico');
      }
    } catch (err) {
      setError(err?.message || 'Error al exportar diagnóstico');
    } finally {
      setExportandoDiag(false);
    }
  };

  const handleBuscarActualizaciones = async () => {
    setError('');
    setInfo('');
    setBuscandoUpdate(true);
    try {
      const res = await buscarActualizaciones();
      if (res?.success === false && res?.motivo) {
        setInfo(res.motivo);
      }
    } catch (err) {
      setError(err?.message || 'Error al buscar actualizaciones');
    } finally {
      setBuscandoUpdate(false);
    }
  };

  const handleInstalarActualizacion = async () => {
    try {
      await instalarActualizacion();
    } catch (err) {
      setError(err?.message || 'Error al instalar actualización');
    }
  };

  const copiarFingerprint = async () => {
    if (!estado?.fingerprint) return;
    try {
      await navigator.clipboard.writeText(estado.fingerprint);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // ignorar
    }
  };

  const activar = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!clave.trim()) {
      setError('Pega tu clave de licencia');
      return;
    }
    setActivating(true);
    try {
      const res = await activarLicencia(clave.trim());
      if (res?.success) {
        setInfo(`Licencia activada como ${TIPO_LABEL[res.tipo] || res.tipo}.`);
        setClave('');
        await cargar();
        await refreshLicencia();
      } else {
        setError('No se pudo activar la licencia');
      }
    } catch (err) {
      setError(err?.message || 'Error al activar licencia');
    } finally {
      setActivating(false);
    }
  };

  const desactivar = async () => {
    const ok = await confirm({
      title: 'Volver a modo demo',
      message:
        'La licencia actual se desactivará en esta computadora. Podrás volver a activarla pegando ' +
        'la clave que ya tienes — pero úsalo solo si vas a mover la app a otra PC.',
      confirmLabel: 'Sí, desactivar',
    });
    if (!ok) return;
    try {
      await desactivarLicencia();
      await cargar();
      await refreshLicencia();
      setInfo('Licencia desactivada. La app está en modo demo.');
    } catch (err) {
      setError(err?.message || 'Error al desactivar licencia');
    }
  };

  if (!estado) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const esDemo = estado.tipo === 'demo';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <KeyRound size={24} /> Licencia
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Estado de tu instalación y activación de licencias.
        </p>
      </div>

      {/* Estado actual */}
      <div className={`rounded-2xl p-6 shadow-sm border-2 ${esDemo ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
        <div className="flex items-start gap-3">
          {esDemo ? (
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={28} />
          ) : (
            <ShieldCheck className="text-emerald-600 flex-shrink-0 mt-1" size={28} />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {TIPO_LABEL[estado.tipo] || estado.tipo}
            </h3>
            {esDemo ? (
              <>
                <p className="text-gray-700 mt-1 text-sm">
                  Estás usando la versión demo. Puedes registrar hasta {estado.limite_pacientes} pacientes.
                </p>
                {estado.pacientes_usados !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>Pacientes registrados</span>
                      <span>{estado.pacientes_usados} / {estado.limite_pacientes}</span>
                    </div>
                    <progress
                      className="progress progress-warning w-full"
                      value={estado.pacientes_usados}
                      max={estado.limite_pacientes}
                    />
                    {estado.pacientes_restantes === 0 && (
                      <p className="text-amber-700 text-sm mt-2">
                        Has alcanzado el límite. Activa una licencia para registrar más pacientes.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-700 mt-1 text-sm">
                  Licencia activa para <strong>{estado.email_cliente || 'tu cuenta'}</strong>.
                </p>
                {estado.activada_en && (
                  <p className="text-gray-600 text-xs mt-1">
                    Activada el {new Date(estado.activada_en).toLocaleDateString('es-PE')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fingerprint */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Identificador de tu PC</h3>
        <p className="text-sm text-gray-600 mb-3">
          Cuando compres una licencia, mándanos este código por WhatsApp para que la generemos
          específicamente para esta computadora.
        </p>
        <div className="flex gap-2">
          <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm break-all">
            {estado.fingerprint}
          </code>
          <button
            type="button"
            onClick={copiarFingerprint}
            className="btn btn-primary gap-2"
          >
            {copiado ? <><Check size={18} /> Copiado</> : <><Copy size={18} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Activación */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Activar licencia</h3>
        <p className="text-sm text-gray-600 mb-4">
          Pega aquí la clave que recibiste por WhatsApp tras realizar tu pago.
        </p>

        {error && (
          <div className="alert alert-error mb-3 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="alert alert-success mb-3 text-sm">
            <ShieldCheck size={18} />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={activar} className="space-y-3">
          <label htmlFor={claveId} className="text-sm font-medium text-gray-700 block">
            Clave de licencia
          </label>
          <textarea
            id={claveId}
            className="textarea textarea-bordered w-full font-mono text-xs"
            rows={4}
            placeholder="Pega aquí la clave completa..."
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <button type="submit" className="btn btn-primary gap-2" disabled={activating}>
            {activating && <span className="loading loading-spinner loading-sm" />}
            <KeyRound size={18} /> Activar
          </button>
        </form>
      </div>

      {/* Volver a demo */}
      {!esDemo && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Cambiar de PC</h3>
          <p className="text-sm text-gray-600 mb-3">
            Si vas a mover esta instalación a otra computadora, desactiva primero la licencia
            aquí. Luego pídenos una nueva clave para tu PC nueva (1 transferencia/año sin costo).
          </p>
          <button type="button" onClick={desactivar} className="btn btn-ghost gap-2">
            <RotateCcw size={18} /> Volver a modo demo
          </button>
        </div>
      )}

      {/* Actualizaciones */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <RefreshCw size={18} /> Actualizaciones
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Las nuevas versiones se descargan automáticamente desde GitHub Releases.
          Puedes forzar la búsqueda y, si hay una versión nueva, instalarla aquí.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBuscarActualizaciones}
            className="btn btn-outline gap-2"
            disabled={buscandoUpdate}
          >
            {buscandoUpdate && <span className="loading loading-spinner loading-sm" />}
            <RefreshCw size={16} /> Buscar actualizaciones
          </button>

          {updateStatus?.estado === 'downloaded' && (
            <button type="button" onClick={handleInstalarActualizacion} className="btn btn-primary gap-2">
              <Download size={16} /> Instalar y reiniciar
            </button>
          )}
        </div>

        {updateStatus && (
          <div className="mt-3 text-sm">
            {updateStatus.estado === 'checking' && <p className="text-gray-600">Buscando…</p>}
            {updateStatus.estado === 'available' && (
              <p className="text-blue-700">
                Nueva versión disponible: <strong>{updateStatus.version}</strong>. Descargando…
              </p>
            )}
            {updateStatus.estado === 'progress' && (
              <p className="text-gray-600">
                Descargando… {updateStatus.percent}%
              </p>
            )}
            {updateStatus.estado === 'downloaded' && (
              <p className="text-emerald-700">
                Versión {updateStatus.version} descargada. Pulsa "Instalar y reiniciar" para aplicarla.
              </p>
            )}
            {updateStatus.estado === 'not-available' && (
              <p className="text-gray-600">Estás en la última versión ({updateStatus.version}).</p>
            )}
            {updateStatus.estado === 'error' && (
              <p className="text-red-600">Error: {updateStatus.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Soporte / Diagnóstico */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FileArchive size={18} /> Soporte técnico
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Si tienes algún problema, exporta este paquete de diagnóstico y mándalo
          por WhatsApp para que el equipo de soporte pueda revisarlo. Contiene logs,
          versión, fingerprint y resumen del estado (sin datos de pacientes).
        </p>
        <button
          type="button"
          onClick={handleExportarDiagnostico}
          className="btn btn-outline gap-2"
          disabled={exportandoDiag}
        >
          {exportandoDiag && <span className="loading loading-spinner loading-sm" />}
          <FileArchive size={16} /> Exportar diagnóstico (.zip)
        </button>
      </div>
    </div>
  );
}

export default Licencia;

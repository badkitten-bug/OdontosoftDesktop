import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/**
 * UIContext expone dos servicios:
 *  - confirm(opts) → Promise<boolean>: muestra un modal de confirmación.
 *  - toast(message, type?) y toast.success/error/info: notificaciones flotantes.
 *
 * Reemplazan a window.confirm/window.alert respectivamente.
 */
const UIContext = createContext(null);

let toastCounter = 0;

const TOAST_TIMEOUT_MS = 4500;

const toastIconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastClassMap = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
};

export function UIProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolverRef = useRef(null);

  // Confirmación
  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        title: opts?.title || '¿Estás seguro?',
        message: opts?.message || 'Esta acción no se puede deshacer.',
        confirmLabel: opts?.confirmLabel || 'Eliminar',
        cancelLabel: opts?.cancelLabel || 'Cancelar',
        danger: opts?.danger !== false, // por defecto destructivo
      });
    });
  }, []);

  const closeConfirm = (result) => {
    setConfirmState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  // Toasts
  const showToast = useCallback((message, type = 'info') => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TIMEOUT_MS);
  }, []);

  const toast = useMemo(() => {
    const fn = (message, type = 'info') => showToast(message, type);
    fn.success = (m) => showToast(m, 'success');
    fn.error = (m) => showToast(m, 'error');
    fn.info = (m) => showToast(m, 'info');
    fn.warning = (m) => showToast(m, 'warning');
    return fn;
  }, [showToast]);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <UIContext.Provider value={value}>
      {children}

      {/* Confirm modal */}
      {confirmState && (
        <div className="modal modal-open" role="dialog" aria-modal="true">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg flex items-center gap-2">
              {confirmState.danger ? (
                <AlertTriangle className="text-red-500" size={22} />
              ) : (
                <Info className="text-blue-500" size={22} />
              )}
              {confirmState.title}
            </h3>
            <p className="py-4 text-sm text-gray-700 whitespace-pre-line">
              {confirmState.message}
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="btn btn-ghost"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`btn ${confirmState.danger ? 'btn-error' : 'btn-primary'}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Cerrar"
            onClick={() => closeConfirm(false)}
          />
        </div>
      )}

      {/* Toasts container */}
      <div className="toast toast-top toast-end z-[2000]">
        {toasts.map((t) => {
          const Icon = toastIconMap[t.type] || Info;
          return (
            <div key={t.id} className={`alert ${toastClassMap[t.type] || 'alert-info'} shadow-lg max-w-sm`}>
              <Icon size={20} />
              <span className="text-sm flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="btn btn-xs btn-ghost"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

export function useConfirm() { return useUI().confirm; }
export function useToast() { return useUI().toast; }

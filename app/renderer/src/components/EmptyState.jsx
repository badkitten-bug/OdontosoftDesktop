import { Plus } from 'lucide-react';

/**
 * Estado vacío reutilizable.
 *
 * Props:
 *  - icon: componente de lucide-react (opcional)
 *  - title: string
 *  - description: string
 *  - actionLabel: string (texto del botón principal)
 *  - onAction: () => void (handler del botón principal)
 *  - secondaryLabel / onSecondary: opcionales, para un botón secundario.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <div className="text-center py-12 px-6 max-w-md mx-auto">
      {Icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 text-sm mb-6">{description}</p>
      )}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="btn btn-primary gap-2">
            <Plus size={18} /> {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button type="button" onClick={onSecondary} className="btn btn-ghost">
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;

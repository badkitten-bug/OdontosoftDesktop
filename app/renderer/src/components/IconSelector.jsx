import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';

/**
 * Componente selector de iconos de lucide-react
 */
function IconSelector({ value, onChange, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Lista de iconos populares de lucide-react
  const popularIcons = [
    'User', 'Mail', 'Phone', 'Calendar', 'MapPin', 'CreditCard',
    'FileText', 'Image', 'Video', 'Music', 'Heart', 'Star',
    'Settings', 'Lock', 'Unlock', 'Eye', 'EyeOff', 'Search',
    'Plus', 'Minus', 'Edit', 'Trash2', 'Save', 'Download',
    'Upload', 'Share', 'Copy', 'Check', 'X', 'AlertCircle',
    'Info', 'HelpCircle', 'CheckCircle', 'XCircle', 'Clock',
    'Home', 'Building', 'Car', 'Plane', 'Train', 'Bike',
    'ShoppingCart', 'Package', 'Box', 'Tag', 'DollarSign',
    'Percent', 'TrendingUp', 'TrendingDown', 'BarChart',
    'PieChart', 'Activity', 'Zap', 'Sun', 'Moon', 'Cloud',
  ];

  // Filtrar iconos según búsqueda
  const filteredIcons = popularIcons.filter(iconName =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectIcon = (iconName) => {
    onChange(iconName);
    if (onClose) onClose();
  };

  const handleClear = () => {
    onChange('');
    if (onClose) onClose();
  };

  return (
    <div className="bg-white border-2 border-primary rounded-lg shadow-2xl p-4 w-96 max-h-96 overflow-hidden flex flex-col z-[101]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Seleccionar Icono</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-ghost btn-circle hover:bg-gray-200"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          className="input input-bordered w-full pl-10"
          placeholder="Buscar icono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de iconos */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-6 gap-2">
          {/* Opción "Sin icono" */}
          <button
            onClick={handleClear}
            className={`p-2 rounded border-2 flex items-center justify-center ${
              !value ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'
            }`}
            title="Sin icono"
          >
            <X size={20} className={!value ? 'text-primary' : 'text-gray-400'} />
          </button>

          {/* Iconos */}
          {filteredIcons.map((iconName) => {
            try {
              // eslint-disable-next-line import/namespace
              const IconComponent = LucideIcons[iconName];
              if (!IconComponent) return null;

              const isSelected = value === iconName;

              return (
                <button
                  key={iconName}
                  onClick={() => handleSelectIcon(iconName)}
                  className={`p-2 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={iconName}
                >
                  <IconComponent
                    size={20}
                    className={isSelected ? 'text-primary' : 'text-gray-600'}
                  />
                </button>
              );
            } catch {
              return null;
            }
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron iconos
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <p>Iconos de lucide-react. Haz clic para seleccionar.</p>
      </div>
    </div>
  );
}

export default IconSelector;


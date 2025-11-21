import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, Package, FileText, Settings, UserCog, Calendar, Stethoscope, Receipt, 
  LayoutDashboard, ClipboardList, Pill, Shield, Tag, HardDrive, ChevronDown, ChevronRight, BarChart3
} from 'lucide-react';
import { useUser } from '../context/UserContext';

// Definir categorías del menú
const menuCategories = [
  {
    id: 'principal',
    label: 'Principal',
    icon: LayoutDashboard,
    roles: ['admin', 'recepcionista', 'odontologo'],
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'recepcionista', 'odontologo'] },
      { path: '/calendario', label: 'Calendario', icon: Calendar, roles: ['admin', 'recepcionista', 'odontologo'] },
      { path: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin', 'recepcionista'] },
    ],
  },
  {
    id: 'clinica',
    label: 'Clínica',
    icon: Stethoscope,
    roles: ['admin', 'recepcionista', 'odontologo'],
    items: [
      { path: '/pacientes', label: 'Pacientes', icon: Users, roles: ['admin', 'recepcionista', 'odontologo'] },
      { path: '/citas', label: 'Citas', icon: Calendar, roles: ['admin', 'recepcionista', 'odontologo'] },
      { path: '/historias', label: 'Historias Clínicas', icon: FileText, roles: ['admin', 'odontologo'] },
      { path: '/tratamientos', label: 'Tratamientos', icon: Stethoscope, roles: ['admin', 'recepcionista', 'odontologo'] },
      { path: '/planes-tratamiento', label: 'Planes de Tratamiento', icon: ClipboardList, roles: ['admin', 'odontologo'] },
      { path: '/prescripciones', label: 'Prescripciones', icon: Pill, roles: ['admin', 'odontologo'] },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Receipt,
    roles: ['admin', 'recepcionista'],
    items: [
      { path: '/facturacion', label: 'Facturación', icon: Receipt, roles: ['admin', 'recepcionista'] },
      { path: '/promociones', label: 'Promociones', icon: Tag, roles: ['admin', 'recepcionista'] },
      { path: '/almacen', label: 'Almacén', icon: Package, roles: ['admin', 'recepcionista'] },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: Settings,
    roles: ['admin'],
    items: [
      { path: '/odontologos', label: 'Odontólogos', icon: UserCog, roles: ['admin'] },
      { path: '/horarios', label: 'Horarios', icon: Calendar, roles: ['admin'] },
      { path: '/usuarios', label: 'Usuarios', icon: Shield, roles: ['admin'] },
      { path: '/backups', label: 'Backups', icon: HardDrive, roles: ['admin'] },
      { path: '/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
    ],
  },
];

function Sidebar() {
  const location = useLocation();
  const { currentUser } = useUser();
  const [expandedCategories, setExpandedCategories] = useState({
    principal: true,
    clinica: true,
    administracion: true,
    configuracion: true,
  });

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Filtrar categorías y items según el rol del usuario
  const getVisibleCategories = () => {
    if (!currentUser) return [];
    
    return menuCategories
      .filter(category => category.roles.includes(currentUser.rol))
      .map(category => ({
        ...category,
        items: category.items.filter(item => item.roles.includes(currentUser.rol)),
      }))
      .filter(category => category.items.length > 0);
  };

  const visibleCategories = getVisibleCategories();

  return (
    <aside className="w-64 bg-blue-600 text-white flex flex-col shadow-lg">
      <div className="p-6 border-b border-blue-500">
        <h1 className="text-2xl font-bold">🦷 OdontoSoft</h1>
        <p className="text-sm text-blue-200 mt-1">Desktop</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories[category.id];
            const hasActiveItem = category.items.some(item => location.pathname === item.path);
            
            return (
              <li key={category.id} className="mb-2">
                {/* Encabezado de categoría */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors mb-1
                    ${hasActiveItem 
                      ? 'bg-blue-700 text-white' 
                      : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon size={18} />
                    <span className="font-semibold text-sm">{category.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                {/* Items de la categoría */}
                {isExpanded && (
                  <ul className="ml-2 space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`
                              flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm
                              ${isActive 
                                ? 'bg-blue-700 text-white shadow-md' 
                                : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                              }
                            `}
                          >
                            <Icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-blue-500 text-xs text-blue-200">
        <p className="font-medium">{currentUser?.nombre || 'Usuario'}</p>
        <p className="text-blue-300">{currentUser?.rol || 'Sin rol'}</p>
        <p className="mt-2">Versión 1.0.0</p>
        <p className="mt-1">© 2024 OdontoSoft</p>
      </div>
    </aside>
  );
}

export default Sidebar;


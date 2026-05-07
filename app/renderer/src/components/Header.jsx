import { useState, useEffect } from 'react';
import { Calendar, LogOut, Globe } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import Notificaciones from './Notificaciones';
import GlobalSearch from './GlobalSearch';
import { getLanguage, setLanguage } from '../utils/i18n';
import { getConfiguracionClinica } from '../services/dbService';

function Header() {
  const { currentUser, logout } = useUser();
  const navigate = useNavigate();
  const [currentLang, setCurrentLang] = useState(getLanguage());
  const [nombreClinica, setNombreClinica] = useState('');
  const today = new Date();
  const formattedDate = today.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    setCurrentLang(getLanguage());
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getConfiguracionClinica();
        if (!cancelled && cfg?.nombre_clinica) {
          setNombreClinica(cfg.nombre_clinica);
        }
      } catch (e) {
        console.error('No se pudo leer la configuración de la clínica:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCurrentLang(lang);
    window.location.reload(); // Recargar para aplicar cambios
  };

  const getRolLabel = (rol) => {
    switch (rol) {
      case 'admin':
        return 'Administrador';
      case 'odontologo':
        return 'Odontólogo';
      case 'recepcionista':
        return 'Recepcionista';
      default:
        return rol;
    }
  };

  const getInitials = (nombre) => {
    if (!nombre) return 'U';
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {nombreClinica || 'Panel de Control'}
          </h2>
        </div>
        
        <div className="flex items-center gap-6">
          <GlobalSearch />
          
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={18} />
            <span className="text-sm capitalize">{formattedDate}</span>
          </div>

          {/* Selector de idioma */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
              <Globe size={18} />
              <span className="text-sm">{currentLang.toUpperCase()}</span>
            </label>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-32 p-2 shadow-lg border border-gray-200">
              <li>
                <button onClick={() => handleLanguageChange('es')} className={currentLang === 'es' ? 'active' : ''}>
                  🇪🇸 Español
                </button>
              </li>
              <li>
                <button onClick={() => handleLanguageChange('en')} className={currentLang === 'en' ? 'active' : ''}>
                  🇺🇸 English
                </button>
              </li>
            </ul>
          </div>
          
          <Notificaciones />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {getInitials(currentUser?.nombre || 'Usuario')}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {currentUser?.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">
                {getRolLabel(currentUser?.rol || 'Sin rol')}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn btn-ghost btn-sm gap-2"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;


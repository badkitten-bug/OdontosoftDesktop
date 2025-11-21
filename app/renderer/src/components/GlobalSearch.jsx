import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Calendar, User, Receipt, Package } from 'lucide-react';
import { getPacientes, getCitas, getFacturas, getProductos } from '../services/dbService';
import { useNavigate } from 'react-router-dom';

function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchLower = query.toLowerCase();
      const allResults = [];

      // Buscar pacientes
      const pacientes = await getPacientes();
      pacientes.forEach(p => {
        if (
          p.nombre?.toLowerCase().includes(searchLower) ||
          p.dni?.toLowerCase().includes(searchLower) ||
          p.telefono?.toLowerCase().includes(searchLower)
        ) {
          allResults.push({
            type: 'paciente',
            id: p.id,
            title: p.nombre,
            subtitle: `DNI: ${p.dni || 'N/A'} | Tel: ${p.telefono || 'N/A'}`,
            icon: User,
            route: '/pacientes',
          });
        }
      });

      // Buscar citas
      const citas = await getCitas({});
      citas.forEach(c => {
        if (
          c.paciente_nombre?.toLowerCase().includes(searchLower) ||
          c.odontologo_nombre?.toLowerCase().includes(searchLower) ||
          c.motivo?.toLowerCase().includes(searchLower) ||
          c.fecha?.includes(query)
        ) {
          allResults.push({
            type: 'cita',
            id: c.id,
            title: `${c.paciente_nombre} - ${c.fecha} ${c.hora_inicio}`,
            subtitle: `Odontólogo: ${c.odontologo_nombre || 'N/A'} | Estado: ${c.estado}`,
            icon: Calendar,
            route: '/citas',
          });
        }
      });

      // Buscar facturas
      const facturas = await getFacturas({});
      facturas.forEach(f => {
        if (
          f.numero?.toLowerCase().includes(searchLower) ||
          f.paciente_nombre?.toLowerCase().includes(searchLower)
        ) {
          allResults.push({
            type: 'factura',
            id: f.id,
            title: `Factura ${f.numero}`,
            subtitle: `Paciente: ${f.paciente_nombre} | Total: S/ ${f.total?.toFixed(2) || '0.00'}`,
            icon: Receipt,
            route: '/facturacion',
          });
        }
      });

      // Buscar productos
      const productos = await getProductos();
      productos.forEach(p => {
        if (p.nombre?.toLowerCase().includes(searchLower)) {
          allResults.push({
            type: 'producto',
            id: p.id,
            title: p.nombre,
            subtitle: `Stock: ${p.stock || 0} | Precio: S/ ${p.precio?.toFixed(2) || '0.00'}`,
            icon: Package,
            route: '/almacen',
          });
        }
      });

      setResults(allResults.slice(0, 10)); // Limitar a 10 resultados
    } catch (error) {
      console.error('Error en búsqueda global:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');
    navigate(result.route);
    // Scroll al elemento después de navegar (opcional, puede fallar si el elemento no existe)
    setTimeout(() => {
      try {
        const element = document.querySelector(`[data-id="${result.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500');
          }, 3000);
        }
      } catch (error) {
        // Ignorar errores de scroll
        console.log('No se pudo hacer scroll al elemento');
      }
    }, 100);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar en toda la aplicación..."
          className="input input-bordered w-64 pl-10 pr-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2 text-sm text-gray-600">Buscando...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No se encontraron resultados para "{query}"
            </div>
          ) : (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((result, idx) => {
                const Icon = result.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                    data-id={result.id}
                  >
                    <div className="mt-1">
                      <Icon size={18} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{result.title}</p>
                      <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;


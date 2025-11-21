import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Columns, Download } from 'lucide-react';
import DynamicForm from '../components/DynamicForm';
import ColumnSelector from '../components/ColumnSelector';
import { getPacientes, addPaciente, updatePaciente, deletePaciente, getCamposDinamicos } from '../services/dbService';
import { exportarPacientes } from '../utils/excelExporter';

function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnSelectorPosition, setColumnSelectorPosition] = useState({ top: 0, left: 0 });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [camposDinamicos, setCamposDinamicos] = useState([]);
  const [columnasVisibles, setColumnasVisibles] = useState(['id', 'nombre', 'dni', 'telefono', 'acciones']);
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    telefono: '',
  });

  // Campos base del formulario
  const camposBase = [
    { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
    { name: 'dni', nombre_campo: 'DNI', tipo: 'text', required: false },
    { name: 'telefono', nombre_campo: 'Teléfono', tipo: 'text', required: false },
  ];

  useEffect(() => {
    loadPacientes();
    loadCamposDinamicos();
    loadColumnasConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCamposDinamicos = async () => {
    try {
      const campos = await getCamposDinamicos('pacientes');
      setCamposDinamicos(campos || []);
    } catch (error) {
      console.error('Error al cargar campos dinámicos:', error);
    }
  };

  const loadColumnasConfig = () => {
    try {
      const saved = localStorage.getItem(`columnas_visibles_pacientes`);
      if (saved) {
        const columnas = JSON.parse(saved);
        // Asegurar que "acciones" esté al final
        const columnasOrdenadas = [...columnas];
        const accionesIndex = columnasOrdenadas.indexOf('acciones');
        if (accionesIndex !== -1 && accionesIndex !== columnasOrdenadas.length - 1) {
          columnasOrdenadas.splice(accionesIndex, 1);
          columnasOrdenadas.push('acciones');
        }
        setColumnasVisibles(columnasOrdenadas);
      }
    } catch (error) {
      console.error('Error al cargar configuración de columnas:', error);
    }
  };

  const saveColumnasConfig = (columnas) => {
    try {
      // Asegurar que "acciones" esté al final antes de guardar
      const columnasFinales = [...columnas];
      const accionesIndex = columnasFinales.indexOf('acciones');
      if (accionesIndex !== -1 && accionesIndex !== columnasFinales.length - 1) {
        columnasFinales.splice(accionesIndex, 1);
        columnasFinales.push('acciones');
      }
      localStorage.setItem(`columnas_visibles_pacientes`, JSON.stringify(columnasFinales));
      setColumnasVisibles(columnasFinales);
    } catch (error) {
      console.error('Error al guardar configuración de columnas:', error);
    }
  };

  const loadPacientes = async () => {
    try {
      setLoading(true);
      const data = await getPacientes();
      console.log('Pacientes cargados:', data); // Debug
      setPacientes(data || []);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      alert('Error al cargar pacientes');
      setPacientes([]); // Asegurar que el estado sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('FormData antes de procesar:', formData); // Debug
      
      // Separar campos base de campos dinámicos
      // Extraer campos base explícitamente
      // Buscar 'nombre' en formData (puede estar como 'nombre' o 'Nombre' dependiendo de cómo se cargó)
      const nombre = formData.nombre || formData.Nombre || '';
      const dni = formData.dni || formData.DNI || '';
      const telefono = formData.telefono || formData.Teléfono || '';
      
      console.log('FormData completo:', formData); // Debug
      console.log('Valores extraídos - nombre:', nombre, 'dni:', dni, 'telefono:', telefono); // Debug
      
      // Todos los demás campos son dinámicos (excluir campos base en cualquier formato)
      const camposBaseKeys = ['nombre', 'Nombre', 'dni', 'DNI', 'telefono', 'Teléfono'];
      const datosExtra = Object.keys(formData).reduce((acc, key) => {
        if (!camposBaseKeys.includes(key)) {
          const value = formData[key];
          // Solo agregar si tiene valor
          if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
          }
        }
        return acc;
      }, {});
      
      // Validar que el nombre no esté vacío (verificar antes de trim)
      const nombreTrimmed = nombre ? nombre.trim() : '';
      if (!nombreTrimmed) {
        alert('El nombre es requerido');
        return;
      }

      // Validar DNI único (se validará en el backend también)
      if (dni && dni.trim()) {
        const pacienteConMismoDNI = pacientes.find(p => 
          p.dni && p.dni.trim() === dni.trim() && (!editingId || p.id !== editingId)
        );
        if (pacienteConMismoDNI) {
          alert('Ya existe un paciente con este DNI');
          return;
        }
      }
      
      // Filtrar campos dinámicos vacíos (no guardar strings vacíos, null, undefined)
      const datosExtraFiltrados = Object.keys(datosExtra).reduce((acc, key) => {
        const value = datosExtra[key];
        // Solo guardar valores que no estén vacíos
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

      const pacienteData = {
        nombre: nombreTrimmed,
        dni: dni ? dni.trim() : null,
        telefono: telefono ? telefono.trim() : null,
        datos_extra: datosExtraFiltrados,
      };

      let result;
      if (editingId) {
        result = await updatePaciente(editingId, pacienteData);
        console.log('Paciente actualizado:', result); // Debug
      } else {
        result = await addPaciente(pacienteData);
        console.log('Paciente agregado:', result); // Debug
      }

      // Cerrar modal primero
      handleCloseModal();
      
      // Pequeño delay para asegurar que el modal se cierre antes de recargar
      setTimeout(async () => {
        await loadPacientes();
      }, 100);
    } catch (error) {
      console.error('Error al guardar paciente:', error);
      alert('Error al guardar paciente: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (paciente) => {
    setEditingId(paciente.id);
    setFormData({
      nombre: paciente.nombre || '',
      dni: paciente.dni || '',
      telefono: paciente.telefono || '',
      ...paciente.datos_extra,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este paciente?')) return;

    try {
      await deletePaciente(id);
      await loadPacientes();
    } catch (error) {
      console.error('Error al eliminar paciente:', error);
      alert('Error al eliminar paciente');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      nombre: '',
      dni: '',
      telefono: '',
    });
  };

  const filteredPacientes = pacientes.filter((paciente) => {
    // Si no hay término de búsqueda, mostrar todos los pacientes
    if (!searchTerm || searchTerm.trim() === '') {
      return true;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const nombre = (paciente.nombre || '').toLowerCase();
    const dni = (paciente.dni || '').toString();
    const telefono = (paciente.telefono || '').toString();
    
    // Buscar también en campos dinámicos
    const datosExtra = paciente.datos_extra || {};
    const camposExtra = Object.values(datosExtra).join(' ').toLowerCase();
    
    return nombre.includes(searchLower) || 
           dni.includes(searchTerm) || 
           telefono.includes(searchTerm) ||
           camposExtra.includes(searchLower);
  });

  // Obtener todas las columnas disponibles (base + dinámicas)
  const getColumnasDisponibles = () => {
    const columnasBase = [
      { key: 'id', label: 'ID', required: true },
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'dni', label: 'DNI', required: false },
      { key: 'telefono', label: 'Teléfono', required: false },
    ];

    // Claves de campos base para evitar duplicados
    const keysBase = ['id', 'nombre', 'dni', 'telefono'];
    
    // Filtrar campos dinámicos: excluir los que son campos base
    // Comparar por 'name' normalizado (si existe) o por 'nombre_campo' normalizado
    const columnasDinamicas = camposDinamicos
      .filter(campo => {
        const campoKey = campo.name || campo.nombre_campo?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
        return campoKey && !keysBase.includes(campoKey);
      })
      .map(campo => ({
        key: campo.name || campo.nombre_campo?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_') || campo.nombre_campo,
        label: campo.nombre_campo || campo.name,
        required: false,
      }));

    // Agregar columna de acciones (siempre visible)
    return [...columnasBase, ...columnasDinamicas, { key: 'acciones', label: 'Acciones', required: true }];
  };

  const columnasDisponibles = getColumnasDisponibles();

  // Obtener el valor de una columna (base o dinámica)
  const getValorColumna = (paciente, columnaKey) => {
    if (columnaKey === 'id') return paciente.id;
    if (columnaKey === 'nombre') return paciente.nombre || '(Sin nombre)';
    if (columnaKey === 'dni') return paciente.dni || '-';
    if (columnaKey === 'telefono') return paciente.telefono || '-';
    if (columnaKey === 'acciones') return null; // Se renderiza aparte
    
    // Buscar en campos dinámicos
    // Primero buscar por la clave exacta
    const datosExtra = paciente.datos_extra || {};
    if (datosExtra[columnaKey] !== undefined) {
      return datosExtra[columnaKey] || '-';
    }
    
    // Si no se encuentra, buscar por nombre_campo normalizado
    // Esto es para compatibilidad con campos que pueden tener diferentes formatos
    const campoDinamico = camposDinamicos.find(c => {
      const campoKey = c.name || c.nombre_campo?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      return campoKey === columnaKey;
    });
    
    if (campoDinamico) {
      // Buscar en datos_extra usando el nombre_campo original o el name
      const keyEnDatosExtra = campoDinamico.name || campoDinamico.nombre_campo;
      if (keyEnDatosExtra && datosExtra[keyEnDatosExtra] !== undefined) {
        return datosExtra[keyEnDatosExtra] || '-';
      }
    }
    
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Pacientes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarPacientes(filteredPacientes)}
            className="btn btn-outline btn-primary gap-2"
            type="button"
            title="Exportar pacientes a Excel"
          >
            <Download size={18} />
            Exportar
          </button>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setColumnSelectorPosition({
                top: rect.bottom + 5,
                left: rect.right - 320,
              });
              setShowColumnSelector(true);
            }}
            className="btn btn-outline gap-2"
            type="button"
          >
            <Columns size={18} />
            Columnas
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary gap-2"
            type="button"
          >
            <Plus size={20} />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o teléfono..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de pacientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando pacientes...</div>
        ) : filteredPacientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay pacientes registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columnasVisibles.map((columnaKey) => {
                    const columna = columnasDisponibles.find(c => c.key === columnaKey);
                    if (!columna) return null;
                    return <th key={columnaKey}>{columna.label}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-gray-50">
                    {columnasVisibles.map((columnaKey) => {
                      if (columnaKey === 'acciones') {
                        return (
                          <td key={columnaKey}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(paciente)}
                                className="btn btn-sm btn-ghost gap-1"
                                type="button"
                              >
                                <Edit size={16} />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(paciente.id)}
                                className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                                type="button"
                              >
                                <Trash2 size={16} />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        );
                      }
                      const valor = getValorColumna(paciente, columnaKey);
                      return (
                        <td key={columnaKey} className={columnaKey === 'nombre' ? 'font-medium' : ''}>
                          {valor}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Paciente' : 'Nuevo Paciente'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <DynamicForm
                entidad="pacientes"
                formData={formData}
                onChange={setFormData}
                camposBase={camposBase}
              />

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={handleCloseModal}></div>
        </div>
      )}

      {/* Selector de columnas */}
      {showColumnSelector && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/20"
            onClick={() => setShowColumnSelector(false)}
          />
          {/* Selector de columnas con z-index muy alto */}
          <div 
            className="fixed z-[9999]" 
            style={{ 
              top: `${Math.max(10, Math.min(columnSelectorPosition.top, window.innerHeight - 420))}px`, 
              left: `${Math.max(10, Math.min(columnSelectorPosition.left, window.innerWidth - 340))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ColumnSelector
              entidad="pacientes"
              columnasDisponibles={columnasDisponibles}
              columnasVisibles={columnasVisibles}
              onChange={saveColumnasConfig}
              onClose={() => setShowColumnSelector(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default Pacientes;


import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Save, GitBranch, X } from 'lucide-react';
import DraggableFieldList from '../components/DraggableFieldList';
import FormPreview from '../components/FormPreview';
import IconSelector from '../components/IconSelector';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';
import {
  getCamposDinamicos,
  addCampoDinamico,
  updateCampoDinamico,
  deleteCampoDinamico,
  updateOrdenCampos,
  initCamposBase,
} from '../services/dbService';
import {
  getRelaciones,
  getRelacionesEntidad,
  addRelacion,
  updateRelacion,
  deleteRelacion,
} from '../services/dbService';

function Configuracion() {
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('campos'); // 'campos' o 'relaciones'
  const [campos, setCampos] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showModalRelacion, setShowModalRelacion] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [iconSelectorPosition, setIconSelectorPosition] = useState({ top: 0, left: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editingRelacionId, setEditingRelacionId] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [formData, setFormData] = useState({
    entidad: 'pacientes',
    nombre_campo: '',
    tipo: 'text',
    requerido: false,
    orden: 0,
    icono: '',
    ancho: 100,
    es_campo_base: false,
    opciones: '', // JSON string o array de strings para select
  });
  const [opcionesArray, setOpcionesArray] = useState([]); // Array temporal para editar opciones
  const [relacionData, setRelacionData] = useState({
    entidad_origen: 'pacientes',
    entidad_destino: 'historial',
    tipo_relacion: 'one-to-many',
    nombre_relacion: '',
    descripcion: '',
    activo: true,
  });

  const tiposCampo = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Fecha' },
    { value: 'textarea', label: 'Área de texto' },
    { value: 'select', label: 'Selector de opciones' },
  ];

  const tiposRelacion = [
    { value: 'one-to-many', label: 'Uno a Muchos (1:N)' },
    { value: 'many-to-many', label: 'Muchos a Muchos (N:N)' },
    { value: 'one-to-one', label: 'Uno a Uno (1:1)' },
  ];

  const entidades = [
    { value: 'pacientes', label: 'Pacientes' },
    { value: 'odontologos', label: 'Odontólogos' },
    { value: 'tratamientos', label: 'Tratamientos' },
    { value: 'historial', label: 'Historias Clínicas' },
    { value: 'citas', label: 'Citas' },
    { value: 'facturas', label: 'Facturas' },
  ];

  const [entidadSeleccionada, setEntidadSeleccionada] = useState('pacientes');

  // Campos base por entidad
  const getCamposBase = (entidad) => {
    const camposBaseMap = {
      pacientes: [
        { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
        { name: 'dni', nombre_campo: 'DNI', tipo: 'text', required: false },
        { name: 'telefono', nombre_campo: 'Teléfono', tipo: 'text', required: false },
      ],
      odontologos: [
        { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
        { name: 'dni', nombre_campo: 'DNI', tipo: 'text', required: false },
        { name: 'telefono', nombre_campo: 'Teléfono', tipo: 'text', required: false },
        { name: 'email', nombre_campo: 'Email', tipo: 'email', required: false },
        { name: 'especialidad', nombre_campo: 'Especialidad', tipo: 'text', required: false },
        { name: 'matricula', nombre_campo: 'Matrícula', tipo: 'text', required: false },
      ],
      tratamientos: [
        { name: 'codigo', nombre_campo: 'Código', tipo: 'text', required: false },
        { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
        { name: 'descripcion', nombre_campo: 'Descripción', tipo: 'textarea', required: false },
        { name: 'precio', nombre_campo: 'Precio', tipo: 'number', required: true },
        { name: 'duracion_minutos', nombre_campo: 'Duración (minutos)', tipo: 'number', required: false },
      ],
    };
    return camposBaseMap[entidad] || [];
  };

  useEffect(() => {
    if (activeTab === 'campos') {
      loadCampos();
    } else {
      loadRelaciones();
    }
  }, [entidadSeleccionada, activeTab]);

  const loadCampos = async () => {
    try {
      setLoading(true);
      // Inicializar campos base si no existen
      await initCamposBase(entidadSeleccionada);
      
      // Cargar TODOS los campos (base + dinámicos) desde la base de datos
      const data = await getCamposDinamicos(entidadSeleccionada);
      // Ordenar por orden y luego por nombre
      const camposOrdenados = data.sort((a, b) => {
        if (a.orden !== b.orden) return (a.orden || 0) - (b.orden || 0);
        return (a.nombre_campo || '').localeCompare(b.nombre_campo || '');
      });
      setCampos(camposOrdenados);
    } catch (error) {
      console.error('Error al cargar campos:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los campos dinámicos.'));
    } finally {
      setLoading(false);
    }
  };

  const loadRelaciones = async () => {
    try {
      setLoading(true);
      const data = await getRelaciones();
      setRelaciones(data);
    } catch (error) {
      console.error('Error al cargar relaciones:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar las relaciones.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (camposReordenados) => {
    try {
      // Crear una nueva copia del array para asegurar que React detecte el cambio
      const nuevosCampos = camposReordenados.map((campo, index) => ({
        ...campo,
        orden: index + 1,
      }));
      
      // Actualizar el estado local primero para que la UI se actualice inmediatamente
      setCampos([...nuevosCampos]);
      
      // Actualizar el orden en la base de datos en segundo plano
      await updateOrdenCampos(nuevosCampos);
    } catch (error) {
      console.error('Error al reordenar campos:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el nuevo orden.'));
      // Recargar campos en caso de error
      await loadCampos();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Si no tiene orden, asignar el siguiente disponible
      if (!formData.orden || formData.orden === 0) {
        const maxOrden = campos.length > 0 
          ? Math.max(...campos.map(c => c.orden || 0))
          : 0;
        formData.orden = maxOrden + 1;
      }

      // Si es tipo select, convertir opcionesArray a JSON
      const dataToSave = { ...formData };
      if (formData.tipo === 'select') {
        const opcionesFiltradas = opcionesArray.filter(op => op.trim() !== '');
        if (opcionesFiltradas.length === 0) {
          toast.warning('Debes agregar al menos una opción para el selector.');
          return;
        }
        dataToSave.opciones = JSON.stringify(opcionesFiltradas);
        console.log('Guardando opciones:', dataToSave.opciones);
      } else {
        dataToSave.opciones = null;
      }

      console.log('Datos a guardar:', dataToSave);

      if (editingId) {
        await updateCampoDinamico(editingId, dataToSave);
      } else {
        await addCampoDinamico(dataToSave);
      }

      await loadCampos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar campo:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el campo dinámico.'));
    }
  };

  const handleSubmitRelacion = async (e) => {
    e.preventDefault();
    
    try {
      if (editingRelacionId) {
        await updateRelacion(editingRelacionId, relacionData);
      } else {
        await addRelacion(relacionData);
      }

      await loadRelaciones();
      handleCloseModalRelacion();
    } catch (error) {
      console.error('Error al guardar relación:', error);
      toast.error(humanizeError(error, 'No se pudo guardar la relación.'));
    }
  };

  const handleEdit = (campo) => {
    setEditingId(campo.id);
    let opcionesParsed = [];
    try {
      if (campo.opciones) {
        opcionesParsed = typeof campo.opciones === 'string' 
          ? JSON.parse(campo.opciones) 
          : campo.opciones;
        // Asegurar que es un array
        if (!Array.isArray(opcionesParsed)) {
          opcionesParsed = [];
        }
      }
    } catch (e) {
      opcionesParsed = [];
    }
    // Si es tipo select y no hay opciones, agregar una opción vacía para empezar
    if (campo.tipo === 'select' && opcionesParsed.length === 0) {
      opcionesParsed = [''];
    }
    setOpcionesArray(opcionesParsed);
    setFormData({
      entidad: campo.entidad || entidadSeleccionada,
      nombre_campo: campo.nombre_campo || '',
      tipo: campo.tipo || 'text',
      requerido: campo.requerido === 1,
      orden: campo.orden || 0,
      icono: campo.icono || '',
      ancho: campo.ancho || 100,
      es_campo_base: campo.es_campo_base === 1,
      opciones: campo.opciones || '',
    });
    setShowModal(true);
  };

  const handleEditRelacion = (relacion) => {
    setEditingRelacionId(relacion.id);
    setRelacionData({
      entidad_origen: relacion.entidad_origen,
      entidad_destino: relacion.entidad_destino,
      tipo_relacion: relacion.tipo_relacion,
      nombre_relacion: relacion.nombre_relacion,
      descripcion: relacion.descripcion || '',
      activo: relacion.activo === 1,
    });
    setShowModalRelacion(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar campo dinámico',
      message:
        'Vas a eliminar este campo de la configuración. Los datos guardados en registros existentes ' +
        'no se eliminan, pero el campo deja de mostrarse en formularios.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteCampoDinamico(id);
      toast.success('Campo eliminado.');
      await loadCampos();
    } catch (error) {
      console.error('Error al eliminar campo:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el campo.'));
    }
  };

  const handleDeleteRelacion = async (id) => {
    const ok = await confirm({
      title: 'Eliminar relación',
      message: 'Vas a eliminar esta relación entre entidades. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteRelacion(id);
      toast.success('Relación eliminada.');
      await loadRelaciones();
    } catch (error) {
      console.error('Error al eliminar relación:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar la relación.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setOpcionesArray([]);
    setFormData({
      entidad: entidadSeleccionada,
      nombre_campo: '',
      tipo: 'text',
      requerido: false,
      orden: 0,
      icono: '',
      ancho: 100,
      es_campo_base: false,
      opciones: '',
    });
  };

  const handleCloseModalRelacion = () => {
    setShowModalRelacion(false);
    setEditingRelacionId(null);
    setRelacionData({
      entidad_origen: 'pacientes',
      entidad_destino: 'historial',
      tipo_relacion: 'one-to-many',
      nombre_relacion: '',
      descripcion: '',
      activo: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-gray-600 mt-1">
            Administra campos personalizados y relaciones entre entidades
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-white p-1">
        <button
          className={`tab ${activeTab === 'campos' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('campos')}
        >
          Campos Dinámicos
        </button>
        <button
          className={`tab ${activeTab === 'relaciones' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('relaciones')}
        >
          Relaciones entre Entidades
        </button>
      </div>

      {activeTab === 'campos' ? (
        <>
          {/* Selector de entidad */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="form-control flex-1 max-w-xs">
                <label className="label">
                  <span className="label-text font-medium">Seleccionar Módulo</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={entidadSeleccionada}
                  onChange={(e) => {
                    setEntidadSeleccionada(e.target.value);
                    setFormData({ ...formData, entidad: e.target.value });
                  }}
                >
                  {entidades.filter(e => ['pacientes', 'odontologos', 'tratamientos', 'historial'].includes(e.value)).map((ent) => (
                    <option key={ent.value} value={ent.value}>
                      {ent.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary gap-2"
              >
                <Plus size={20} />
                Nuevo Campo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de campos con drag and drop */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Campos Configurados</h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn btn-sm btn-ghost gap-1"
                >
                  <Eye size={16} />
                  {showPreview ? 'Ocultar' : 'Mostrar'} Preview
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {loading ? (
                  <div className="text-center py-8">Cargando campos...</div>
                ) : campos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay campos personalizados. Crea uno nuevo para comenzar.
                  </div>
                ) : (
                  <DraggableFieldList
                    campos={campos}
                    onReorder={handleReorder}
                    onPreview={handleEdit}
                  />
                )}
              </div>
            </div>

            {/* Previsualización */}
            {showPreview && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Previsualización</h2>
                <FormPreview
                  entidad={entidadSeleccionada}
                  camposBase={[]}
                  camposDinamicos={campos}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Relaciones entre entidades */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Relaciones entre Entidades</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configura cómo se relacionan las diferentes entidades del sistema
                </p>
              </div>
              <button
                onClick={() => setShowModalRelacion(true)}
                className="btn btn-primary gap-2"
              >
                <GitBranch size={20} />
                Nueva Relación
              </button>
            </div>

            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>
                Las relaciones definen cómo se conectan las entidades. Por ejemplo: 
                "Pacientes" tiene muchas "Historias Clínicas" (one-to-many).
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando relaciones...</div>
            ) : relaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay relaciones configuradas. Crea una nueva relación para comenzar.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {relaciones.map((relacion) => (
                  <div
                    key={relacion.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {entidades.find(e => e.value === relacion.entidad_origen)?.label} 
                        {' → '}
                        {entidades.find(e => e.value === relacion.entidad_destino)?.label}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="badge badge-outline mr-2">
                          {tiposRelacion.find(t => t.value === relacion.tipo_relacion)?.label}
                        </span>
                        {relacion.nombre_relacion}
                        {relacion.descripcion && ` - ${relacion.descripcion}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRelacion(relacion)}
                        className="btn btn-sm btn-ghost gap-1"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteRelacion(relacion.id)}
                        className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de formulario de campo */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Campo' : 'Nuevo Campo Dinámico'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Entidad</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.entidad}
                  onChange={(e) => setFormData({ ...formData, entidad: e.target.value })}
                  disabled={!!editingId}
                >
                  {entidades.filter(e => ['pacientes', 'odontologos', 'tratamientos', 'historial'].includes(e.value)).map((ent) => (
                    <option key={ent.value} value={ent.value}>
                      {ent.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre del Campo *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Ej: Dirección, Fecha de Nacimiento, etc."
                  value={formData.nombre_campo}
                  onChange={(e) => setFormData({ ...formData, nombre_campo: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Tipo *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.tipo}
                    onChange={(e) => {
                      setFormData({ ...formData, tipo: e.target.value });
                      // Si cambia a select y no hay opciones, agregar una opción vacía
                      if (e.target.value === 'select' && opcionesArray.length === 0) {
                        setOpcionesArray(['']);
                      } else if (e.target.value !== 'select') {
                        // Si cambia a un tipo que no es select, limpiar opciones
                        setOpcionesArray([]);
                      }
                    }}
                    required
                  >
                    {tiposCampo.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Orden</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="Se asignará automáticamente"
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">
                      Déjalo en 0 para asignar automáticamente al final
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Icono (lucide-react)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className="input input-bordered w-full pr-10"
                        placeholder="Ej: User, Mail, Phone, etc."
                        value={formData.icono}
                        onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                        readOnly
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          const viewportWidth = window.innerWidth;
                          const viewportHeight = window.innerHeight;
                          
                          // Calcular posición para que no se salga de la pantalla
                          const selectorWidth = 400;
                          const selectorHeight = 400;
                          let left = rect.left;
                          let top = rect.bottom + 10;
                          
                          // Ajustar si se sale por la derecha
                          if (left + selectorWidth > viewportWidth - 10) {
                            left = viewportWidth - selectorWidth - 10;
                          }
                          
                          // Ajustar si se sale por la izquierda
                          if (left < 10) {
                            left = 10;
                          }
                          
                          // Ajustar si se sale por abajo
                          if (top + selectorHeight > viewportHeight - 10) {
                            top = rect.top - selectorHeight - 10;
                          }
                          
                          // Ajustar si se sale por arriba
                          if (top < 10) {
                            top = 10;
                          }
                          
                          setIconSelectorPosition({ top, left });
                          setShowIconSelector(true);
                        }}
                      />
                      {formData.icono && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, icono: '' });
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                          title="Eliminar icono"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        
                        // Calcular posición centrada en la pantalla
                        const selectorWidth = 400;
                        const selectorHeight = 400;
                        let left = rect.left - (selectorWidth / 2) + (rect.width / 2);
                        let top = rect.bottom + 10;
                        
                        // Ajustar si se sale por la izquierda
                        if (left < 10) {
                          left = 10;
                        }
                        
                        // Ajustar si se sale por la derecha
                        if (left + selectorWidth > viewportWidth - 10) {
                          left = viewportWidth - selectorWidth - 10;
                        }
                        
                        // Ajustar si se sale por abajo
                        if (top + selectorHeight > viewportHeight - 10) {
                          top = rect.top - selectorHeight - 10;
                        }
                        
                        // Ajustar si se sale por arriba
                        if (top < 10) {
                          top = 10;
                        }
                        
                        setIconSelectorPosition({ top, left });
                        setShowIconSelector(true);
                      }}
                      className="btn btn-primary gap-2"
                    >
                      <Eye size={16} />
                      Seleccionar
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-gray-500">
                      Haz clic en el campo o en "Seleccionar" para elegir un icono
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ancho del Campo (%)</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.ancho}
                    onChange={(e) => setFormData({ ...formData, ancho: parseInt(e.target.value) || 100 })}
                  >
                    <option value="100">100% (Ancho completo)</option>
                    <option value="50">50% (Mitad)</option>
                    <option value="33">33% (Un tercio)</option>
                    <option value="25">25% (Un cuarto)</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-medium">Campo Requerido</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={formData.requerido}
                    onChange={(e) => setFormData({ ...formData, requerido: e.target.checked })}
                  />
                </label>
              </div>

              {/* Opciones para tipo select */}
              {formData.tipo === 'select' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Opciones del Selector *</span>
                    <span className="label-text-alt text-gray-500">
                      Agrega las opciones que aparecerán en el selector (una por línea)
                    </span>
                  </label>
                  <div className="space-y-2">
                    {opcionesArray.map((opcion, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          placeholder={`Opción ${index + 1}`}
                          value={opcion}
                          onChange={(e) => {
                            const nuevasOpciones = [...opcionesArray];
                            nuevasOpciones[index] = e.target.value;
                            setOpcionesArray(nuevasOpciones);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setOpcionesArray(opcionesArray.filter((_, i) => i !== index));
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOpcionesArray([...opcionesArray, ''])}
                      className="btn btn-outline btn-sm w-full gap-2"
                    >
                      <Plus size={16} />
                      Agregar Opción
                    </button>
                  </div>
                  {opcionesArray.length === 0 && (
                    <div className="alert alert-warning mt-2">
                      <span className="text-sm">Debes agregar al menos una opción para el selector</span>
                    </div>
                  )}
                </div>
              )}

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

      {/* Selector de iconos - Renderizar sobre el modal */}
      {showIconSelector && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
            onClick={() => setShowIconSelector(false)}
          />
          {/* Selector de iconos con z-index muy alto para aparecer sobre el modal */}
          <div 
            className="fixed z-[9999]" 
            style={{ 
              top: `${Math.max(10, Math.min(iconSelectorPosition.top, window.innerHeight - 420))}px`, 
              left: `${Math.max(10, Math.min(iconSelectorPosition.left, window.innerWidth - 420))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconSelector
              value={formData.icono}
              onChange={(icono) => {
                setFormData({ ...formData, icono });
                setShowIconSelector(false);
              }}
              onClose={() => setShowIconSelector(false)}
            />
          </div>
        </>
      )}

      {/* Modal de relación */}
      {showModalRelacion && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingRelacionId ? 'Editar Relación' : 'Nueva Relación entre Entidades'}
            </h3>
            
            <form onSubmit={handleSubmitRelacion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Entidad Origen *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={relacionData.entidad_origen}
                    onChange={(e) => setRelacionData({ ...relacionData, entidad_origen: e.target.value })}
                    disabled={!!editingRelacionId}
                    required
                  >
                    {entidades.map((ent) => (
                      <option key={ent.value} value={ent.value}>
                        {ent.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Entidad Destino *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={relacionData.entidad_destino}
                    onChange={(e) => setRelacionData({ ...relacionData, entidad_destino: e.target.value })}
                    disabled={!!editingRelacionId}
                    required
                  >
                    {entidades.map((ent) => (
                      <option key={ent.value} value={ent.value}>
                        {ent.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Tipo de Relación *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={relacionData.tipo_relacion}
                  onChange={(e) => setRelacionData({ ...relacionData, tipo_relacion: e.target.value })}
                  required
                >
                  {tiposRelacion.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-gray-500">
                    Ejemplo: Pacientes → Historias Clínicas = "Uno a Muchos" (un paciente tiene muchas historias)
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre de la Relación *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Ej: historias_clinicas, citas_paciente, etc."
                  value={relacionData.nombre_relacion}
                  onChange={(e) => setRelacionData({ ...relacionData, nombre_relacion: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Descripción</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={relacionData.descripcion}
                  onChange={(e) => setRelacionData({ ...relacionData, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Descripción opcional de la relación"
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-medium">Activa</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={relacionData.activo}
                    onChange={(e) => setRelacionData({ ...relacionData, activo: e.target.checked })}
                  />
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModalRelacion}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRelacionId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={handleCloseModalRelacion}></div>
        </div>
      )}
    </div>
  );
}

export default Configuracion;

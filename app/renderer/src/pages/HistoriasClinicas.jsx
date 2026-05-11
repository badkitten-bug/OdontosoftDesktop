import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, Calendar, Eye, Search, FileText, Upload, Image, X, Printer } from 'lucide-react';
import { getPacientes, getPaciente } from '../services/dbService';
import { getHistorial, addHistorial, deleteHistorial } from '../services/dbService';
import { getCamposDinamicos, initCamposBase } from '../services/dbService';
import { getArchivosHistorial, addArchivoHistorial, deleteArchivoHistorial, getRutaArchivo } from '../services/dbService';
import { generarPDFHistoriaClinica } from '../utils/pdfGenerator';
import Odontograma from '../components/Odontograma';
import DynamicForm from '../components/DynamicForm';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function HistoriasClinicas() {
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [pacientes, setPacientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEntrada, setViewingEntrada] = useState(null);
  const [showOdontogramaModal, setShowOdontogramaModal] = useState(false);
  const [odontogramaData, setOdontogramaData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [camposDinamicos, setCamposDinamicos] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [archivosViewing, setArchivosViewing] = useState([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    odontograma_data: null,
    datos_extra: {},
    id_cita: null,
    id_odontologo: null,
  });

  useEffect(() => {
    loadPacientes();
    initCamposBaseIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-llenado desde botón "Consulta" en Citas
  useEffect(() => {
    const fc = location.state?.fromCita;
    if (!fc) return;
    setSelectedPaciente(fc.id_paciente);
    setFormData(prev => ({
      ...prev,
      fecha: fc.fecha || prev.fecha,
      id_cita: fc.id_cita,
      id_odontologo: fc.id_odontologo,
    }));
    setShowModal(true);
    window.history.replaceState({}, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (selectedPaciente) {
      loadHistorial(selectedPaciente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaciente]);

  useEffect(() => {
    loadCamposDinamicos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initCamposBaseIfNeeded = async () => {
    try {
      await initCamposBase('historial');
    } catch (error) {
      console.error('Error al inicializar campos base:', error);
    }
  };

  const loadCamposDinamicos = async () => {
    try {
      const campos = await getCamposDinamicos('historial');
      setCamposDinamicos(campos);
    } catch (error) {
      console.error('Error al cargar campos dinámicos:', error);
    }
  };

  const loadPacientes = async () => {
    try {
      setLoading(true);
      const data = await getPacientes();
      setPacientes(data);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los pacientes.'));
    } finally {
      setLoading(false);
    }
  };

  const loadHistorial = async (idPaciente) => {
    try {
      setLoading(true);
      const data = await getHistorial(idPaciente);
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error(humanizeError(error, 'No se pudo cargar el historial.'));
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pacientes por búsqueda
  const pacientesFiltrados = pacientes.filter((paciente) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nombre = (paciente.nombre || '').toLowerCase();
    const dni = (paciente.dni || '').toLowerCase();
    const numeroHistoria = paciente.id?.toString() || '';
    return nombre.includes(query) || dni.includes(query) || numeroHistoria.includes(query);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPaciente) {
      toast.warning('Selecciona un paciente.');
      return;
    }

    try {
      await addHistorial({
        id_paciente: selectedPaciente,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        odontograma_data: formData.odontograma_data,
        datos_extra: formData.datos_extra,
        id_odontologo: formData.id_odontologo || null,
        id_cita: formData.id_cita || null,
      });

      await loadHistorial(selectedPaciente);
      handleCloseModal();
      
      // Mostrar mensaje para subir archivos después
      if (archivos.length > 0) {
        toast.success('Historial guardado. Puedes agregar archivos desde la vista completa.');
      }
    } catch (error) {
      console.error('Error al guardar historial:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el historial.'));
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message:
        'Vas a eliminar esta entrada del historial. También se borrarán los archivos adjuntos relacionados. ' +
        'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteHistorial(id);
      toast.success('Entrada eliminada.');
      await loadHistorial(selectedPaciente);
    } catch (error) {
      console.error('Error al eliminar historial:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar la entrada.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowViewModal(false);
    setShowOdontogramaModal(false);
    setFormData({
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      odontograma_data: null,
      datos_extra: {},
      id_cita: null,
      id_odontologo: null,
    });
    setOdontogramaData(null);
    setViewingEntrada(null);
  };

  const handleOdontogramaChange = (data) => {
    setOdontogramaData(data);
    setFormData({ ...formData, odontograma_data: data });
  };

  const handleVerOdontograma = (entrada) => {
    setOdontogramaData(entrada.odontograma_data);
    setShowOdontogramaModal(true);
  };

  const handleVerEntrada = async (entrada) => {
    setViewingEntrada(entrada);
    setShowViewModal(true);
    try {
      const archs = await getArchivosHistorial(entrada.id);
      setArchivosViewing(archs);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
    }
  };

  const handleImprimirHistoria = async (entrada) => {
    try {
      const paciente = pacienteSeleccionado || await getPaciente(entrada.id_paciente);
      const doc = generarPDFHistoriaClinica(entrada, paciente);
      doc.save(`HistoriaClinica_${paciente?.nombre || 'N/A'}_${new Date(entrada.fecha).toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error(humanizeError(error, 'No se pudo generar el PDF.'));
    }
  };

  const handleDynamicFormChange = (data) => {
    setFormData({ ...formData, datos_extra: data });
  };

  const handleFileChange = async (e, idHistorial) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubiendoArchivo(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        const tipo = file.type.startsWith('image/') ? 'imagen' : 
                    file.name.toLowerCase().endsWith('.pdf') ? 'documento' :
                    file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/i) ? 'radiografia' : 'otro';
        
        await addArchivoHistorial({
          id_historial: idHistorial,
          nombre_archivo: file.name,
          contenido_base64: base64,
          tipo: tipo,
          descripcion: '',
        });
        
        await loadArchivos(idHistorial);
        setSubiendoArchivo(false);
        e.target.value = ''; // Reset input
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error al subir archivo:', error);
      toast.error(humanizeError(error, 'No se pudo subir el archivo.'));
      setSubiendoArchivo(false);
    }
  };

  const loadArchivos = async (idHistorial) => {
    try {
      const archs = await getArchivosHistorial(idHistorial);
      setArchivos(archs);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
    }
  };

  const handleDeleteArchivo = async (id) => {
    const archivo = archivos.find(a => a.id === id) || archivosViewing.find(a => a.id === id);
    const detalle = archivo?.nombre_archivo || 'este archivo';
    const ok = await confirm({
      title: 'Eliminar archivo',
      message: `Vas a eliminar "${detalle}". El archivo se borra del disco. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deleteArchivoHistorial(id);
      toast.success('Archivo eliminado.');
      if (viewingEntrada) {
        await loadArchivos(viewingEntrada.id);
        const archs = await getArchivosHistorial(viewingEntrada.id);
        setArchivosViewing(archs);
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el archivo.'));
    }
  };

  const handleViewArchivo = async (archivo) => {
    try {
      const ruta = await getRutaArchivo(archivo.id);
      // En Electron, podemos abrir el archivo con el sistema operativo
      if (window.electronAPI?.openFile) {
        window.electronAPI.openFile(ruta.ruta_archivo);
      } else {
        // Fallback: mostrar en nueva ventana si es imagen
        if (archivo.tipo === 'imagen' || archivo.tipo === 'radiografia') {
          window.open(ruta.ruta_archivo, '_blank');
        }
      }
    } catch (error) {
      console.error('Error al abrir archivo:', error);
      toast.error(humanizeError(error, 'No se pudo abrir el archivo.'));
    }
  };

  const pacienteSeleccionado = pacientes.find((p) => p.id === selectedPaciente);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Historias Clínicas</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
          disabled={!selectedPaciente}
        >
          <Plus size={20} />
          Nueva Entrada
        </button>
      </div>

      {/* Búsqueda y selector de paciente */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="form-control">
          <label htmlFor="search-paciente" className="label">
            <span className="label-text font-medium">Buscar Paciente</span>
            <span className="label-text-alt text-gray-500">Por DNI, Nombre o Número de Historia</span>
          </label>
          <div className="relative">
            <input
              id="search-paciente"
              type="text"
              className="input input-bordered w-full pl-10"
              placeholder="Buscar por DNI, nombre o número de historia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>
        
        {searchQuery && (
          <div className="mt-2">
            <label htmlFor="select-paciente-search" className="label">
              <span className="label-text font-medium">Seleccionar Paciente</span>
            </label>
            <select
              id="select-paciente-search"
              className="select select-bordered w-full"
              value={selectedPaciente || ''}
              onChange={(e) => {
                setSelectedPaciente(e.target.value ? parseInt(e.target.value) : null);
                setSearchQuery('');
              }}
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientesFiltrados.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nombre} {paciente.dni ? `(DNI: ${paciente.dni})` : ''} - Historia #{paciente.id}
                </option>
              ))}
            </select>
            {pacientesFiltrados.length === 0 && (
              <div className="text-sm text-gray-500 mt-2">No se encontraron pacientes</div>
            )}
          </div>
        )}

        {!searchQuery && (
          <div className="mt-2">
            <label htmlFor="select-paciente" className="label">
              <span className="label-text font-medium">Seleccionar Paciente</span>
            </label>
            <select
              id="select-paciente"
              className="select select-bordered w-full"
              value={selectedPaciente || ''}
              onChange={(e) => setSelectedPaciente(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nombre} {paciente.dni ? `(DNI: ${paciente.dni})` : ''} - Historia #{paciente.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Historial del paciente */}
      {selectedPaciente ? (
        <div className="space-y-4">
          {/* Información del paciente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                Historial de {pacienteSeleccionado?.nombre}
              </h2>
              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                {pacienteSeleccionado?.dni && (
                  <span>DNI: {pacienteSeleccionado.dni}</span>
                )}
                <span>Número de Historia: #{pacienteSeleccionado?.id}</span>
              </div>
            </div>

          {loading ? (
            <div className="text-center py-8">Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros en el historial de este paciente
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {historial.map((entrada) => (
                <div key={entrada.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar size={16} />
                        <span>{new Date(entrada.fecha).toLocaleDateString('es-ES')}</span>
                        {entrada.odontologo_nombre && (
                          <span className="text-xs text-indigo-700 font-medium">Dr/a. {entrada.odontologo_nombre}</span>
                        )}
                        {entrada.id_cita && (
                          <span className="badge badge-secondary badge-sm">Cita #{entrada.id_cita}</span>
                        )}
                        {entrada.odontograma_data && (
                          <span className="badge badge-info badge-sm">Con Odontograma</span>
                        )}
                        {entrada.datos_extra && Object.keys(entrada.datos_extra).length > 0 && (
                          <span className="badge badge-success badge-sm">Con Datos de Salud</span>
                        )}
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap mb-2">{entrada.descripcion}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerEntrada(entrada)}
                          className="btn btn-sm btn-outline btn-primary gap-2"
                        >
                          <FileText size={14} />
                          Ver Completo
                        </button>
                        {entrada.odontograma_data && entrada.odontograma_data !== null && Object.keys(entrada.odontograma_data).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleVerOdontograma(entrada)}
                            className="btn btn-sm btn-outline btn-info gap-2"
                          >
                            <Eye size={14} />
                            Ver Odontograma
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(entrada.id)}
                      className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 ml-4"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Vista de evolución del odontograma */}
          {historial.some(e => e.odontograma_data && e.odontograma_data !== null && Object.keys(e.odontograma_data).length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">
                  Evolución del Odontograma
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Visualiza la evolución del tratamiento dental a lo largo del tiempo
                </p>
              </div>
              <div className="p-4">
                <div className="space-y-6">
                  {historial
                    .filter(e => e.odontograma_data && e.odontograma_data !== null && Object.keys(e.odontograma_data).length > 0)
                    .map((entrada) => (
                      <div key={entrada.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-600" />
                            <span className="font-semibold text-gray-800">
                              {new Date(entrada.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVerEntrada(entrada)}
                            className="btn btn-sm btn-outline btn-primary gap-2"
                          >
                            <FileText size={14} />
                            Ver Historia Completa
                          </button>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <Odontograma
                            data={entrada.odontograma_data}
                            onChange={null}
                            readOnly={true}
                          />
                        </div>
                        {entrada.descripcion && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Nota:</span> {entrada.descripcion}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <p>Busca y selecciona un paciente para ver su historial clínico</p>
        </div>
      )}

      {/* Modal de nueva entrada */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Nueva Entrada al Historial</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label htmlFor="paciente-disabled" className="label">
                  <span className="label-text font-medium">Paciente</span>
                </label>
                <input
                  id="paciente-disabled"
                  type="text"
                  className="input input-bordered w-full"
                  value={pacienteSeleccionado?.nombre || ''}
                  disabled
                />
              </div>

              <div className="form-control">
                <label htmlFor="fecha-historial" className="label">
                  <span className="label-text font-medium">Fecha *</span>
                </label>
                <input
                  id="fecha-historial"
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              {/* Campos dinámicos de salud */}
              <div className="form-control">
                <div className="label">
                  <span className="label-text font-medium">Datos de Salud</span>
                  <span className="label-text-alt text-gray-500">(Opcional)</span>
                </div>
                <DynamicForm
                  entidad="historial"
                  formData={formData.datos_extra}
                  onChange={handleDynamicFormChange}
                  skipLoad={false}
                />
              </div>

              <div className="form-control">
                <label htmlFor="descripcion-historial" className="label">
                  <span className="label-text font-medium">Descripción *</span>
                </label>
                <textarea
                  id="descripcion-historial"
                  className="textarea textarea-bordered w-full"
                  placeholder="Ingresa la descripción de la consulta o tratamiento..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                  rows={4}
                />
              </div>

              {/* Odontograma */}
              <div className="form-control">
                <div className="label">
                  <span className="label-text font-medium">Odontograma</span>
                  <span className="label-text-alt text-gray-500">(Opcional)</span>
                </div>
                <div className="border border-gray-200 rounded-lg p-2">
                  <Odontograma
                    data={formData.odontograma_data}
                    onChange={handleOdontogramaChange}
                    readOnly={false}
                  />
                </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            onClick={handleCloseModal}
            aria-label="Cerrar modal"
          ></button>
        </div>
      )}

      {/* Modal para ver entrada completa */}
      {showViewModal && viewingEntrada && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              Historia Clínica - {new Date(viewingEntrada.fecha).toLocaleDateString('es-ES')}
            </h3>
            
            <div className="space-y-4">
              {/* Información del paciente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Paciente</h4>
                <p className="text-gray-700">{pacienteSeleccionado?.nombre}</p>
                {pacienteSeleccionado?.dni && (
                  <p className="text-sm text-gray-600">DNI: {pacienteSeleccionado.dni}</p>
                )}
                <p className="text-sm text-gray-600">Número de Historia: #{pacienteSeleccionado?.id}</p>
              </div>

              {/* Datos de salud */}
              {viewingEntrada.datos_extra && Object.keys(viewingEntrada.datos_extra).length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Datos de Salud</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(viewingEntrada.datos_extra).map(([key, value]) => {
                      const campo = camposDinamicos.find(c => c.name === key || c.nombre_campo === key);
                      const label = campo?.nombre_campo || key;
                      if (!value || value === '') return null;
                      return (
                        <div key={key}>
                          <span className="text-sm font-medium text-gray-600">{label}:</span>
                          <p className="text-gray-800">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Descripción</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{viewingEntrada.descripcion}</p>
              </div>

              {/* Odontograma */}
              {viewingEntrada.odontograma_data && Object.keys(viewingEntrada.odontograma_data).length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Odontograma</h4>
                  <div className="border border-gray-200 rounded-lg p-2 bg-white">
                    <Odontograma
                      data={viewingEntrada.odontograma_data}
                      onChange={null}
                      readOnly={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm">No hay odontograma registrado para esta consulta</p>
                </div>
              )}

              {/* Archivos adjuntos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Archivos Adjuntos</h4>
                  <label className="btn btn-sm btn-outline btn-primary gap-2">
                    <Upload size={14} />
                    Subir Archivo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, viewingEntrada.id)}
                      disabled={subiendoArchivo}
                    />
                  </label>
                </div>
                {archivosViewing.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-sm">No hay archivos adjuntos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {archivosViewing.map((archivo) => (
                      <div
                        key={archivo.id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {archivo.tipo === 'imagen' || archivo.tipo === 'radiografia' ? (
                              <Image size={18} className="text-blue-600" />
                            ) : (
                              <FileText size={18} className="text-gray-600" />
                            )}
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                              {archivo.nombre_archivo}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteArchivo(archivo.id)}
                            className="btn btn-xs btn-ghost text-red-600"
                            title="Eliminar archivo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewArchivo(archivo)}
                          className="btn btn-xs btn-outline btn-primary w-full"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {subiendoArchivo && (
                  <div className="mt-2 text-center">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="ml-2 text-sm text-gray-600">Subiendo archivo...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action mt-4">
              <button
                type="button"
                onClick={() => handleImprimirHistoria(viewingEntrada)}
                className="btn btn-outline btn-primary gap-2"
              >
                <Printer size={16} />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="btn btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            onClick={() => setShowViewModal(false)}
            aria-label="Cerrar modal"
          ></button>
        </div>
      )}

      {/* Modal para ver odontograma */}
      {showOdontogramaModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl w-full">
            <h3 className="font-bold text-lg mb-4">Odontograma</h3>
            <div className="max-h-[80vh] overflow-y-auto">
              <Odontograma
                data={odontogramaData}
                onChange={null}
                readOnly={true}
              />
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowOdontogramaModal(false)}
                className="btn btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            onClick={() => setShowOdontogramaModal(false)}
            aria-label="Cerrar modal"
          ></button>
        </div>
      )}
    </div>
  );
}

export default HistoriasClinicas;

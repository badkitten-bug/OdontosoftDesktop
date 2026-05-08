import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, FileText, PlusCircle, X, Printer } from 'lucide-react';
import { getPrescripcionesPaciente, getPrescripcion, addPrescripcion, updatePrescripcion, deletePrescripcion } from '../services/dbService';
import { getPacientes, getPaciente } from '../services/dbService';
import { getOdontologosActivos, getOdontologo } from '../services/dbService';
import { getCitas } from '../services/dbService';
import { generarPDFPrescripcion } from '../utils/pdfGenerator';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function Prescripciones() {
  const confirm = useConfirm();
  const toast = useToast();
  const [prescripciones, setPrescripciones] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pacienteFiltro, setPacienteFiltro] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [medicamentos, setMedicamentos] = useState([{ nombre: '', dosis: '', frecuencia: '', duracion: '' }]);
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_cita: '',
    id_odontologo: '',
    instrucciones: '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
  });

  useEffect(() => {
    loadPacientes();
    loadOdontologos();
    loadCitas();
  }, []);

  useEffect(() => {
    if (pacienteFiltro) {
      loadPrescripciones();
    } else {
      setPrescripciones([]);
    }
  }, [pacienteFiltro]);

  const loadPacientes = async () => {
    try {
      const data = await getPacientes();
      setPacientes(data);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  const loadOdontologos = async () => {
    try {
      const data = await getOdontologosActivos();
      setOdontologos(data);
    } catch (error) {
      console.error('Error al cargar odontólogos:', error);
    }
  };

  const loadCitas = async () => {
    try {
      const data = await getCitas({});
      setCitas(data);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    }
  };

  const loadPrescripciones = async () => {
    try {
      setLoading(true);
      const data = await getPrescripcionesPaciente(parseInt(pacienteFiltro), false);
      setPrescripciones(data);
    } catch (error) {
      console.error('Error al cargar prescripciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const medicamentosFiltrados = medicamentos.filter(m => m.nombre.trim() !== '');
      if (medicamentosFiltrados.length === 0) {
        toast.warning('Debes agregar al menos un medicamento.');
        return;
      }

      const dataToSave = {
        ...formData,
        medicamentos: medicamentosFiltrados,
      };

      if (editingId) {
        await updatePrescripcion(editingId, dataToSave);
        toast.success('Prescripción actualizada.');
      } else {
        await addPrescripcion(dataToSave);
        toast.success('Prescripción creada.');
      }
      await loadPrescripciones();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar prescripción:', error);
      toast.error(humanizeError(error, 'No se pudo guardar la prescripción.'));
    }
  };

  const handleEdit = (prescripcion) => {
    setEditingId(prescripcion.id);
    try {
      const meds = typeof prescripcion.medicamentos === 'string' 
        ? JSON.parse(prescripcion.medicamentos) 
        : prescripcion.medicamentos;
      setMedicamentos(Array.isArray(meds) && meds.length > 0 ? meds : [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }]);
    } catch (e) {
      setMedicamentos([{ nombre: '', dosis: '', frecuencia: '', duracion: '' }]);
    }
    setFormData({
      id_paciente: prescripcion.id_paciente,
      id_cita: prescripcion.id_cita || '',
      id_odontologo: prescripcion.id_odontologo,
      instrucciones: prescripcion.instrucciones || '',
      fecha: prescripcion.fecha,
      fecha_vencimiento: prescripcion.fecha_vencimiento || '',
    });
    setPacienteFiltro(prescripcion.id_paciente.toString());
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar prescripción',
      message: 'Vas a eliminar esta prescripción. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deletePrescripcion(id);
      toast.success('Prescripción eliminada.');
      await loadPrescripciones();
    } catch (error) {
      console.error('Error al eliminar prescripción:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar la prescripción.'));
    }
  };

  const handleAddMedicamento = () => {
    setMedicamentos([...medicamentos, { nombre: '', dosis: '', frecuencia: '', duracion: '' }]);
  };

  const handleRemoveMedicamento = (index) => {
    setMedicamentos(medicamentos.filter((_, i) => i !== index));
  };

  const handleMedicamentoChange = (index, field, value) => {
    const nuevos = [...medicamentos];
    nuevos[index][field] = value;
    setMedicamentos(nuevos);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setMedicamentos([{ nombre: '', dosis: '', frecuencia: '', duracion: '' }]);
    setFormData({
      id_paciente: pacienteFiltro || '',
      id_cita: '',
      id_odontologo: '',
      instrucciones: '',
      fecha: new Date().toISOString().split('T')[0],
      fecha_vencimiento: '',
    });
  };

  const filteredPrescripciones = prescripciones.filter((presc) => {
    try {
      const meds = typeof presc.medicamentos === 'string' ? JSON.parse(presc.medicamentos) : presc.medicamentos;
      const medicamentosStr = Array.isArray(meds) ? meds.map(m => m.nombre || '').join(' ') : '';
      return medicamentosStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        presc.instrucciones?.toLowerCase().includes(searchTerm.toLowerCase());
    } catch {
      return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Prescripciones</h1>
          <p className="text-gray-600 mt-1">Gestiona recetas médicas para pacientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
          disabled={!pacienteFiltro}
        >
          <Plus size={20} />
          Nueva Prescripción
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Paciente *</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={pacienteFiltro}
              onChange={(e) => {
                setPacienteFiltro(e.target.value);
                setFormData({ ...formData, id_paciente: e.target.value });
              }}
              required
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Buscar</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por medicamento o instrucciones..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de prescripciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando prescripciones...</div>
        ) : !pacienteFiltro ? (
          <div className="text-center py-8 text-gray-500">
            Selecciona un paciente para ver sus prescripciones
          </div>
        ) : filteredPrescripciones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay prescripciones para este paciente
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPrescripciones.map((presc) => {
              let medicamentosParsed = [];
              try {
                medicamentosParsed = typeof presc.medicamentos === 'string' 
                  ? JSON.parse(presc.medicamentos) 
                  : presc.medicamentos;
                if (!Array.isArray(medicamentosParsed)) medicamentosParsed = [];
              } catch (e) {
                medicamentosParsed = [];
              }

              return (
                <div key={presc.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={20} className="text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-800">
                            Fecha: {new Date(presc.fecha).toLocaleDateString('es-ES')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Odontólogo: {presc.odontologo_nombre}
                          </p>
                        </div>
                        {presc.activa === 1 && (
                          <span className="badge badge-success">Activa</span>
                        )}
                        {presc.fecha_vencimiento && new Date(presc.fecha_vencimiento) < new Date() && (
                          <span className="badge badge-error">Vencida</span>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="font-medium text-sm text-gray-700 mb-2">Medicamentos:</p>
                        <div className="space-y-1">
                          {medicamentosParsed.map((med, idx) => (
                            <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                              <span className="font-medium">{med.nombre}</span>
                              {med.dosis && <span> - {med.dosis}</span>}
                              {med.frecuencia && <span> - {med.frecuencia}</span>}
                              {med.duracion && <span> - {med.duracion}</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {presc.instrucciones && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Instrucciones:</span> {presc.instrucciones}
                        </p>
                      )}

                      {presc.fecha_vencimiento && (
                        <p className="text-xs text-gray-500">
                          Vence: {new Date(presc.fecha_vencimiento).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleImprimirPrescripcion(presc)}
                        className="btn btn-sm btn-ghost gap-1"
                        title="Imprimir prescripción"
                      >
                        <Printer size={16} />
                        Imprimir
                      </button>
                      <button
                        onClick={() => handleEdit(presc)}
                        className="btn btn-sm btn-ghost gap-1"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(presc.id)}
                        className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Prescripción' : 'Nueva Prescripción'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Odontólogo *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.id_odontologo}
                    onChange={(e) => setFormData({ ...formData, id_odontologo: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">-- Selecciona un odontólogo --</option>
                    {odontologos.map((odontologo) => (
                      <option key={odontologo.id} value={odontologo.id}>
                        {odontologo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Cita (Opcional)</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.id_cita}
                    onChange={(e) => setFormData({ ...formData, id_cita: e.target.value || '' })}
                  >
                    <option value="">-- Sin cita asociada --</option>
                    {citas
                      .filter(c => c.id_paciente === parseInt(formData.id_paciente))
                      .map((cita) => (
                        <option key={cita.id} value={cita.id}>
                          {cita.fecha} - {cita.hora_inicio}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha de Vencimiento</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Medicamentos *</span>
                </label>
                <div className="space-y-3">
                  {medicamentos.map((med, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">Medicamento {index + 1}</span>
                        {medicamentos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicamento(index)}
                            className="btn btn-xs btn-ghost text-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          placeholder="Nombre del medicamento *"
                          value={med.nombre}
                          onChange={(e) => handleMedicamentoChange(index, 'nombre', e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          placeholder="Dosis (ej: 500mg)"
                          value={med.dosis}
                          onChange={(e) => handleMedicamentoChange(index, 'dosis', e.target.value)}
                        />
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          placeholder="Frecuencia (ej: Cada 8 horas)"
                          value={med.frecuencia}
                          onChange={(e) => handleMedicamentoChange(index, 'frecuencia', e.target.value)}
                        />
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          placeholder="Duración (ej: 7 días)"
                          value={med.duracion}
                          onChange={(e) => handleMedicamentoChange(index, 'duracion', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddMedicamento}
                    className="btn btn-sm btn-outline btn-primary w-full gap-2"
                  >
                    <PlusCircle size={16} />
                    Agregar Medicamento
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Instrucciones Generales</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.instrucciones}
                  onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                  rows={3}
                  placeholder="Instrucciones adicionales para el paciente..."
                />
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
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={handleCloseModal}></div>
        </div>
      )}
    </div>
  );
}

export default Prescripciones;


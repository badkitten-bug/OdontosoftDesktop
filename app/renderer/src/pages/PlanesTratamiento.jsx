import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Calendar, CheckCircle, Download } from 'lucide-react';
import { getTodosPlanes, getPlanesPaciente, getPlan, addPlanTratamiento, updatePlanTratamiento, deletePlanTratamiento, addCitaPlan, marcarCitaPlanCompletada } from '../services/dbService';
import { getPacientes, getPaciente } from '../services/dbService';
import { getTratamientosActivos } from '../services/dbService';
import { getCitas } from '../services/dbService';
import { getConfiguracionClinica } from '../services/dbService';
import { generarPDFPresupuesto } from '../utils/pdfGenerator';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function PlanesTratamiento() {
  const confirm = useConfirm();
  const toast = useToast();
  const [planes, setPlanes] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCitasModal, setShowCitasModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pacienteFiltro, setPacienteFiltro] = useState('');
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_tratamiento: '',
    nombre: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin_estimada: '',
    observaciones: '',
  });

  useEffect(() => {
    loadPacientes();
    loadTratamientos();
    loadPlanes();
  }, []);

  useEffect(() => {
    if (planSeleccionado) {
      loadPlanCompleto();
    }
  }, [planSeleccionado]);

  const loadPacientes = async () => {
    try {
      const data = await getPacientes();
      setPacientes(data);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  const loadTratamientos = async () => {
    try {
      const data = await getTratamientosActivos();
      setTratamientos(data);
    } catch (error) {
      console.error('Error al cargar tratamientos:', error);
    }
  };

  const loadPlanes = async () => {
    try {
      setLoading(true);
      if (pacienteFiltro) {
        const data = await getPlanesPaciente(parseInt(pacienteFiltro, 10));
        setPlanes(data);
      } else {
        const data = await getTodosPlanes();
        setPlanes(data);
      }
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanCompleto = async () => {
    if (!planSeleccionado) return;
    try {
      const plan = await getPlan(planSeleccionado.id);
      if (plan) {
        setPlanSeleccionado(plan);
      }
    } catch (error) {
      console.error('Error al cargar plan completo:', error);
    }
  };

  const loadCitasDisponibles = async () => {
    try {
      const data = await getCitas({});
      setCitas(data.filter(c => c.estado !== 'cancelada' && !planSeleccionado?.citas?.some(cp => cp.id_cita === c.id)));
    } catch (error) {
      console.error('Error al cargar citas:', error);
    }
  };

  useEffect(() => {
    loadPlanes();
  }, [pacienteFiltro]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updatePlanTratamiento(editingId, formData);
        toast.success('Plan actualizado.');
      } else {
        await addPlanTratamiento(formData);
        toast.success('Plan creado.');
      }
      await loadPlanes();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar plan:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el plan.'));
    }
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setFormData({
      id_paciente: plan.id_paciente,
      id_tratamiento: plan.id_tratamiento,
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      fecha_inicio: plan.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin_estimada: plan.fecha_fin_estimada || '',
      observaciones: plan.observaciones || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const plan = planes.find(p => p.id === id);
    const nombreSeguro = plan?.nombre || 'este plan';
    const ok = await confirm({
      title: 'Eliminar plan de tratamiento',
      message: `Vas a eliminar "${nombreSeguro}". Las citas vinculadas se desvincularán del plan. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deletePlanTratamiento(id);
      toast.success('Plan eliminado.');
      await loadPlanes();
    } catch (error) {
      console.error('Error al eliminar plan:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el plan.'));
    }
  };

  const handleAbrirCitas = (plan) => {
    setPlanSeleccionado(plan);
    loadCitasDisponibles();
    setShowCitasModal(true);
  };

  const handleAgregarCita = async (cita) => {
    try {
      const orden = (planSeleccionado?.citas?.length || 0) + 1;
      await addCitaPlan({
        id_plan: planSeleccionado.id,
        id_cita: cita.id,
        orden,
      });
      await loadPlanCompleto();
      await loadCitasDisponibles();
    } catch (error) {
      console.error('Error al agregar cita al plan:', error);
      toast.error(humanizeError(error, 'No se pudo agregar la cita al plan.'));
    }
  };

  const handleMarcarCompletada = async (idCitaPlan) => {
    try {
      await marcarCitaPlanCompletada(idCitaPlan);
      await loadPlanCompleto();
    } catch (error) {
      console.error('Error al marcar cita como completada:', error);
      toast.error(humanizeError(error, 'No se pudo marcar la cita como completada.'));
    }
  };

  const handlePresupuestoPDF = async (plan) => {
    try {
      const [planCompleto, pacienteData, config] = await Promise.all([
        getPlan(plan.id),
        getPaciente(plan.id_paciente),
        getConfiguracionClinica(),
      ]);
      const planConPrecio = { ...planCompleto, tratamiento_precio: plan.tratamiento_precio };
      const doc = generarPDFPresupuesto(planConPrecio, pacienteData, config);
      const nombre = (pacienteData?.nombre || 'Paciente').replace(/\s+/g, '_');
      doc.save(`Presupuesto_${nombre}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      toast.error(humanizeError(error, 'No se pudo generar el presupuesto.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      id_paciente: '',
      id_tratamiento: '',
      nombre: '',
      descripcion: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin_estimada: '',
      observaciones: '',
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo':
        return 'badge-success';
      case 'completado':
        return 'badge-info';
      case 'cancelado':
        return 'badge-error';
      case 'pausado':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const filteredPlanes = planes.filter((plan) => {
    const matchSearch = plan.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.tratamiento_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Planes de Tratamiento</h1>
          <p className="text-gray-600 mt-1">Gestiona planes de tratamiento de múltiples citas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus size={20} />
          Nuevo Plan
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Filtrar por Paciente</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={pacienteFiltro}
              onChange={(e) => setPacienteFiltro(e.target.value)}
            >
              <option value="">Todos los pacientes</option>
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
                placeholder="Buscar por nombre, tratamiento o paciente..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de planes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando planes...</div>
        ) : filteredPlanes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {pacienteFiltro ? 'No hay planes para este paciente' : 'Aún no hay planes de tratamiento registrados'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPlanes.map((plan) => (
              <div key={plan.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">{plan.nombre}</h3>
                      <span className={`badge ${getEstadoColor(plan.estado)}`}>
                        {plan.estado}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <span className="font-medium">Paciente:</span> {plan.paciente_nombre || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Tratamiento:</span> {plan.tratamiento_nombre || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Inicio:</span> {new Date(plan.fecha_inicio).toLocaleDateString('es-ES')}
                      </div>
                      {plan.fecha_fin_estimada && (
                        <div>
                          <span className="font-medium">Fin Estimado:</span> {new Date(plan.fecha_fin_estimada).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                    {plan.descripcion && (
                      <p className="text-sm text-gray-600 mb-2">{plan.descripcion}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handlePresupuestoPDF(plan)}
                      className="btn btn-sm btn-ghost gap-1"
                      title="Descargar presupuesto PDF"
                    >
                      <Download size={16} />
                      Presupuesto
                    </button>
                    <button
                      onClick={() => handleAbrirCitas(plan)}
                      className="btn btn-sm btn-ghost gap-1"
                      title="Gestionar citas del plan"
                    >
                      <Calendar size={16} />
                      Citas
                    </button>
                    <button
                      onClick={() => handleEdit(plan)}
                      className="btn btn-sm btn-ghost gap-1"
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Plan de Tratamiento' : 'Nuevo Plan de Tratamiento'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Paciente *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.id_paciente}
                    onChange={(e) => setFormData({ ...formData, id_paciente: parseInt(e.target.value) })}
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
                    <span className="label-text font-medium">Tratamiento *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.id_tratamiento}
                    onChange={(e) => setFormData({ ...formData, id_tratamiento: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">-- Selecciona un tratamiento --</option>
                    {tratamientos.map((tratamiento) => (
                      <option key={tratamiento.id} value={tratamiento.id}>
                        {tratamiento.nombre} - S/ {tratamiento.precio.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre del Plan *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Brackets - Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha de Inicio *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha Fin Estimada</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.fecha_fin_estimada}
                    onChange={(e) => setFormData({ ...formData, fecha_fin_estimada: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Descripción</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción del plan de tratamiento..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Observaciones</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Observaciones adicionales..."
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

      {/* Modal de citas del plan */}
      {showCitasModal && planSeleccionado && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              Citas del Plan: {planSeleccionado.nombre}
            </h3>

            {/* Citas del plan */}
            {planSeleccionado.citas && planSeleccionado.citas.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Citas del Plan</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {planSeleccionado.citas
                    .sort((a, b) => a.orden - b.orden)
                    .map((citaPlan) => (
                      <div
                        key={citaPlan.id}
                        className={`p-3 rounded-lg border ${
                          citaPlan.completada ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">#{citaPlan.orden}</span>
                            <div>
                              <p className="font-medium">
                                {citaPlan.cita_fecha} - {citaPlan.hora_inicio} a {citaPlan.hora_fin}
                              </p>
                              <p className="text-sm text-gray-600">
                                {citaPlan.odontologo_nombre} - {citaPlan.cita_estado}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {citaPlan.completada ? (
                              <span className="badge badge-success">Completada</span>
                            ) : (
                              <button
                                onClick={() => handleMarcarCompletada(citaPlan.id)}
                                className="btn btn-xs btn-outline btn-success"
                              >
                                <CheckCircle size={14} />
                                Marcar Completada
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Agregar citas */}
            <div>
              <h4 className="font-semibold mb-3">Agregar Cita al Plan</h4>
              <div className="max-h-64 overflow-y-auto">
                {citas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay citas disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {citas
                      .filter(c => c.id_paciente === planSeleccionado.id_paciente)
                      .map((cita) => (
                        <div
                          key={cita.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              {cita.fecha} - {cita.hora_inicio} a {cita.hora_fin}
                            </p>
                            <p className="text-sm text-gray-600">
                              {cita.paciente_nombre} - {cita.odontologo_nombre}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAgregarCita(cita)}
                            className="btn btn-xs btn-primary"
                          >
                            Agregar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowCitasModal(false);
                  setPlanSeleccionado(null);
                }}
                className="btn btn-ghost"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowCitasModal(false);
              setPlanSeleccionado(null);
            }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default PlanesTratamiento;


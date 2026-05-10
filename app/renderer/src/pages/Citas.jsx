import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Calendar, Clock, User, UserCog, CheckCircle, XCircle, Download, AlertCircle, List } from 'lucide-react';
import { getCitas, getCitasPorFecha, addCita, updateCita, deleteCita, verificarDisponibilidad } from '../services/dbService';
import { getPacientes } from '../services/dbService';
import { getOdontologosActivos } from '../services/dbService';
import { getTratamientosActivos, getTratamientosCita, addTratamientoCita, deleteTratamientoCita } from '../services/dbService';
import { formatMoneda } from '../utils/formatters';
import { exportarCitas } from '../utils/excelExporter';
import EmptyState from '../components/EmptyState';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function Citas() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTratamientosModal, setShowTratamientosModal] = useState(false);
  const [citaConTratamientos, setCitaConTratamientos] = useState(null);
  const [tratamientosCita, setTratamientosCita] = useState([]);
  const [tratamientoForm, setTratamientoForm] = useState({ id_tratamiento: '', cantidad: 1, precio_unitario: '' });
  const [editingId, setEditingId] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_odontologo: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '10:00',
    estado: 'programada',
    motivo: '',
    observaciones: '',
  });

  const estados = [
    { value: 'programada', label: 'Programada', color: 'badge-info' },
    { value: 'confirmada', label: 'Confirmada', color: 'badge-success' },
    { value: 'en_proceso', label: 'En Proceso', color: 'badge-warning' },
    { value: 'completada', label: 'Completada', color: 'badge-success' },
    { value: 'cancelada', label: 'Cancelada', color: 'badge-error' },
  ];

  useEffect(() => {
    loadPacientes();
    loadOdontologos();
    loadTratamientos();
    loadCitas();
  }, [fechaSeleccionada]);

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

  const loadTratamientos = async () => {
    try {
      const data = await getTratamientosActivos();
      setTratamientos(data);
    } catch (error) {
      console.error('Error al cargar tratamientos:', error);
    }
  };

  const loadCitas = async () => {
    try {
      setLoading(true);
      const data = await getCitasPorFecha(fechaSeleccionada);
      setCitas(data);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar las citas.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Verificar disponibilidad
      const disponibilidad = await verificarDisponibilidad(
        formData.id_odontologo,
        formData.fecha,
        formData.hora_inicio,
        formData.hora_fin
      );

      if (!disponibilidad.disponible && !editingId) {
        toast.warning(`No disponible: ${disponibilidad.razon || 'El horario está ocupado'}`);
        return;
      }

      if (editingId) {
        await updateCita(editingId, formData);
        toast.success('Cita actualizada.');
      } else {
        await addCita(formData);
        toast.success('Cita agendada.');
      }

      await loadCitas();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar cita:', error);
      toast.error(humanizeError(error, 'No se pudo guardar la cita.'));
    }
  };

  const handleEdit = (cita) => {
    setEditingId(cita.id);
    setFormData({
      id_paciente: cita.id_paciente,
      id_odontologo: cita.id_odontologo,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      estado: cita.estado,
      asistio: cita.asistio !== null ? (cita.asistio === 1) : null,
      motivo: cita.motivo || '',
      observaciones: cita.observaciones || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const cita = citas.find(c => c.id === id);
    const detalle = cita
      ? `${cita.paciente_nombre || 'Paciente'} — ${cita.fecha} ${cita.hora_inicio}`
      : 'esta cita';
    const ok = await confirm({
      title: 'Eliminar cita',
      message: `Vas a eliminar la cita de ${detalle}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteCita(id);
      toast.success('Cita eliminada.');
      await loadCitas();
    } catch (error) {
      console.error('Error al eliminar cita:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar la cita.'));
    }
  };

  const handleMarcarAsistencia = async (id, asistio) => {
    try {
      await updateCita(id, { asistio });
      await loadCitas();
    } catch (error) {
      console.error('Error al marcar asistencia:', error);
      toast.error(humanizeError(error, 'No se pudo marcar asistencia.'));
    }
  };

  const handleAbrirTratamientos = async (cita) => {
    setCitaConTratamientos(cita);
    try {
      const data = await getTratamientosCita(cita.id);
      setTratamientosCita(data);
    } catch (error) {
      console.error('Error al cargar tratamientos de la cita:', error);
      toast.error('No se pudieron cargar los tratamientos.');
    }
    setShowTratamientosModal(true);
  };

  const handleCerrarTratamientos = () => {
    setShowTratamientosModal(false);
    setCitaConTratamientos(null);
    setTratamientosCita([]);
    setTratamientoForm({ id_tratamiento: '', cantidad: 1, precio_unitario: '' });
  };

  const handleAddTratamientoCita = async (e) => {
    e.preventDefault();
    try {
      await addTratamientoCita({
        id_cita: citaConTratamientos.id,
        id_tratamiento: parseInt(tratamientoForm.id_tratamiento, 10),
        cantidad: parseInt(tratamientoForm.cantidad, 10) || 1,
        precio_unitario: parseFloat(tratamientoForm.precio_unitario) || 0,
      });
      const data = await getTratamientosCita(citaConTratamientos.id);
      setTratamientosCita(data);
      setTratamientoForm({ id_tratamiento: '', cantidad: 1, precio_unitario: '' });
      toast.success('Tratamiento agregado.');
    } catch (error) {
      console.error('Error al agregar tratamiento:', error);
      toast.error(humanizeError(error, 'No se pudo agregar el tratamiento.'));
    }
  };

  const handleDeleteTratamientoCita = async (id) => {
    try {
      await deleteTratamientoCita(id);
      const data = await getTratamientosCita(citaConTratamientos.id);
      setTratamientosCita(data);
    } catch (error) {
      console.error('Error al eliminar tratamiento:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el tratamiento.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      id_paciente: '',
      id_odontologo: '',
      fecha: fechaSeleccionada,
      hora_inicio: '09:00',
      hora_fin: '10:00',
      estado: 'programada',
      motivo: '',
      observaciones: '',
    });
  };

  const filteredCitas = citas.filter(c => {
    const fechaCita = new Date(c.fecha);
    const fechaSeleccionadaDate = new Date(fechaSeleccionada);
    return fechaCita.toISOString().split('T')[0] === fechaSeleccionadaDate.toISOString().split('T')[0];
  });

  const citasOrdenadas = [...filteredCitas].sort((a, b) => {
    if (a.hora_inicio < b.hora_inicio) return -1;
    if (a.hora_inicio > b.hora_inicio) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Citas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCitas(filteredCitas)}
            className="btn btn-outline btn-primary gap-2"
            type="button"
            title="Exportar citas a Excel"
          >
            <Download size={18} />
            Exportar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary gap-2"
            type="button"
            disabled={odontologos.length === 0 || pacientes.length === 0}
          >
            <Plus size={20} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Avisos de prerrequisitos */}
      {!loading && odontologos.length === 0 && (
        <div className="alert alert-warning shadow-sm">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Primero necesitas registrar un odontólogo</p>
            <p className="text-xs">Sin odontólogos no es posible agendar citas.</p>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/odontologos')}>
            Ir a Odontólogos
          </button>
        </div>
      )}
      {!loading && odontologos.length > 0 && pacientes.length === 0 && (
        <div className="alert alert-warning shadow-sm">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Primero registra un paciente</p>
            <p className="text-xs">Sin pacientes no es posible agendar citas.</p>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/pacientes')}>
            Ir a Pacientes
          </button>
        </div>
      )}

      {/* Selector de fecha */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Fecha</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full max-w-xs"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de citas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando citas...</div>
        ) : citasOrdenadas.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin citas para esta fecha"
            description="No hay citas programadas para el día seleccionado. Agenda una nueva o cambia de fecha."
            actionLabel="Nueva cita"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {citasOrdenadas.map((cita) => {
              const estadoInfo = estados.find((e) => e.value === cita.estado) || estados[0];
              return (
                <div key={cita.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock size={18} className="text-gray-500" />
                        <span className="font-semibold text-lg">
                          {cita.hora_inicio} - {cita.hora_fin}
                        </span>
                        <span className={`badge ${estadoInfo.color}`}>
                          {estadoInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>{cita.paciente_nombre}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCog size={16} />
                          <span>{cita.odontologo_nombre}</span>
                        </div>
                      </div>
                      {cita.motivo && (
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Motivo:</strong> {cita.motivo}
                        </p>
                      )}
                      {cita.observaciones && (
                        <p className="text-sm text-gray-600 mt-1">
                          {cita.observaciones}
                        </p>
                      )}
                      {cita.asistio !== null && (
                        <div className="mt-2">
                          <span className={`badge ${cita.asistio === 1 ? 'badge-success' : 'badge-error'}`}>
                            {cita.asistio === 1 ? '✓ Asistió' : '✗ No Asistió'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {cita.estado === 'completada' && cita.asistio === null && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMarcarAsistencia(cita.id, true)}
                            className="btn btn-xs btn-success gap-1"
                            title="Marcar como asistió"
                          >
                            <CheckCircle size={14} />
                            Asistió
                          </button>
                          <button
                            onClick={() => handleMarcarAsistencia(cita.id, false)}
                            className="btn btn-xs btn-error gap-1"
                            title="Marcar como no asistió"
                          >
                            <XCircle size={14} />
                            No Asistió
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAbrirTratamientos(cita)}
                          className="btn btn-sm btn-ghost gap-1 text-blue-600"
                          title="Ver/agregar tratamientos de esta cita"
                        >
                          <List size={16} />
                          Tratamientos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(cita)}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cita.id)}
                          className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
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
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Cita' : 'Nueva Cita'}
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
                        {paciente.nombre} {paciente.dni ? `(DNI: ${paciente.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

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
                        {odontologo.nombre} {odontologo.especialidad ? `(${odontologo.especialidad})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                    <span className="label-text font-medium">Hora Inicio *</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Hora Fin *</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Estado</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    {estados.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.estado === 'completada' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Asistencia</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={formData.asistio === null ? '' : (formData.asistio ? '1' : '0')}
                      onChange={(e) => setFormData({ ...formData, asistio: e.target.value === '' ? null : (e.target.value === '1') })}
                    >
                      <option value="">No registrado</option>
                      <option value="1">Asistió</option>
                      <option value="0">No Asistió</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Motivo</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Motivo de la consulta"
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
                  rows={3}
                  placeholder="Observaciones adicionales"
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

      {/* Modal de tratamientos de la cita */}
      {showTratamientosModal && citaConTratamientos && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-1">Tratamientos de la cita</h3>
            <p className="text-sm text-gray-500 mb-4">
              {citaConTratamientos.paciente_nombre} — {citaConTratamientos.fecha} {citaConTratamientos.hora_inicio}
            </p>

            {/* Lista de tratamientos actuales */}
            {tratamientosCita.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">Sin tratamientos registrados. Agrega el primero.</p>
            ) : (
              <div className="mb-4 overflow-x-auto">
                <table className="table w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                      <th>Tratamiento</th>
                      <th className="text-center">Cant.</th>
                      <th className="text-right">Precio U.</th>
                      <th className="text-right">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tratamientosCita.map((t) => (
                      <tr key={t.id}>
                        <td className="font-medium">{t.nombre}</td>
                        <td className="text-center">{t.cantidad}</td>
                        <td className="text-right">{formatMoneda(t.precio_unitario)}</td>
                        <td className="text-right font-semibold">
                          {formatMoneda(t.cantidad * t.precio_unitario - (t.descuento || 0))}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteTratamientoCita(t.id)}
                            className="btn btn-xs btn-ghost text-red-500 hover:text-red-700"
                            title="Quitar tratamiento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="text-right font-semibold text-gray-700 pt-2">Total cita:</td>
                      <td className="text-right font-bold text-blue-700 pt-2">
                        {formatMoneda(tratamientosCita.reduce((sum, t) => sum + t.cantidad * t.precio_unitario - (t.descuento || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Formulario para agregar tratamiento */}
            <div className="border-t border-gray-200 pt-4">
              <p className="font-medium text-sm mb-3 text-gray-700">Agregar tratamiento</p>
              <form onSubmit={handleAddTratamientoCita} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="form-control md:col-span-1">
                    <select
                      className="select select-bordered select-sm w-full"
                      value={tratamientoForm.id_tratamiento}
                      onChange={(e) => {
                        const t = tratamientos.find((x) => String(x.id) === e.target.value);
                        setTratamientoForm({
                          ...tratamientoForm,
                          id_tratamiento: e.target.value,
                          precio_unitario: t ? t.precio.toString() : '',
                        });
                      }}
                      required
                    >
                      <option value="">Seleccionar tratamiento...</option>
                      {tratamientos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} — {formatMoneda(t.precio)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <input
                      type="number"
                      min="1"
                      className="input input-bordered input-sm w-full"
                      placeholder="Cantidad"
                      value={tratamientoForm.cantidad}
                      onChange={(e) => setTratamientoForm({ ...tratamientoForm, cantidad: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input input-bordered input-sm w-full"
                      placeholder="Precio unitario"
                      value={tratamientoForm.precio_unitario}
                      onChange={(e) => setTratamientoForm({ ...tratamientoForm, precio_unitario: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary btn-sm gap-1">
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </form>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={handleCerrarTratamientos}>
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCerrarTratamientos}></div>
        </div>
      )}
    </div>
  );
}

export default Citas;


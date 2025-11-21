import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getOdontologosActivos } from '../services/dbService';
import { getHorarios, addHorario, updateHorario, deleteHorario } from '../services/dbService';

const diasSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

function Horarios() {
  const [searchParams] = useSearchParams();
  const odontologoIdParam = searchParams.get('odontologo');

  const [odontologos, setOdontologos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOdontologo, setSelectedOdontologo] = useState(odontologoIdParam ? parseInt(odontologoIdParam) : null);
  const [formData, setFormData] = useState({
    id_odontologo: selectedOdontologo || '',
    dia_semana: 1,
    hora_inicio: '09:00',
    hora_fin: '18:00',
    activo: true,
  });

  useEffect(() => {
    loadOdontologos();
  }, []);

  useEffect(() => {
    if (selectedOdontologo) {
      loadHorarios();
    } else {
      setHorarios([]);
    }
  }, [selectedOdontologo]);

  const loadOdontologos = async () => {
    try {
      const data = await getOdontologosActivos();
      setOdontologos(data);
    } catch (error) {
      console.error('Error al cargar odontólogos:', error);
    }
  };

  const loadHorarios = async () => {
    if (!selectedOdontologo) return;
    
    try {
      setLoading(true);
      const data = await getHorarios(selectedOdontologo);
      setHorarios(data);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      alert('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateHorario(editingId, formData);
      } else {
        await addHorario(formData);
      }

      await loadHorarios();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar horario:', error);
      alert('Error al guardar horario');
    }
  };

  const handleEdit = (horario) => {
    setEditingId(horario.id);
    setFormData({
      id_odontologo: horario.id_odontologo,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      activo: horario.activo === 1,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;

    try {
      await deleteHorario(id);
      await loadHorarios();
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      alert('Error al eliminar horario');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      id_odontologo: selectedOdontologo || '',
      dia_semana: 1,
      hora_inicio: '09:00',
      hora_fin: '18:00',
      activo: true,
    });
  };

  const horariosPorDia = diasSemana.map((dia) => ({
    ...dia,
    horarios: horarios.filter((h) => h.dia_semana === dia.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Horarios de Disponibilidad</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
          disabled={!selectedOdontologo}
        >
          <Plus size={20} />
          Nuevo Horario
        </button>
      </div>

      {/* Selector de odontólogo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Seleccionar Odontólogo</span>
          </label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={selectedOdontologo || ''}
            onChange={(e) => {
              const id = e.target.value ? parseInt(e.target.value) : null;
              setSelectedOdontologo(id);
              setFormData({ ...formData, id_odontologo: id || '' });
            }}
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

      {/* Horarios por día */}
      {selectedOdontologo ? (
        loading ? (
          <div className="text-center py-8">Cargando horarios...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {horariosPorDia.map((dia) => (
              <div key={dia.value} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-lg mb-3">{dia.label}</h3>
                {dia.horarios.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin horarios</p>
                ) : (
                  <div className="space-y-2">
                    {dia.horarios.map((horario) => (
                      <div
                        key={horario.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {horario.hora_inicio} - {horario.hora_fin}
                          </span>
                          {horario.activo === 0 && (
                            <span className="ml-2 text-xs text-gray-500">(Inactivo)</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(horario)}
                            className="btn btn-xs btn-ghost"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(horario.id)}
                            className="btn btn-xs btn-ghost text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
          <p>Selecciona un odontólogo para ver y gestionar sus horarios</p>
        </div>
      )}

      {/* Modal de formulario */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Horario' : 'Nuevo Horario'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Día de la Semana *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.dia_semana}
                  onChange={(e) => setFormData({ ...formData, dia_semana: parseInt(e.target.value) })}
                  required
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-medium">Activo</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                </label>
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

export default Horarios;


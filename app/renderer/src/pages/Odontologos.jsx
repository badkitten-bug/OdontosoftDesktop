import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Calendar, UserCog } from 'lucide-react';
import DynamicForm from '../components/DynamicForm';
import EmptyState from '../components/EmptyState';
import { getOdontologos, addOdontologo, updateOdontologo, deleteOdontologo } from '../services/dbService';
import { Link } from 'react-router-dom';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function Odontologos() {
  const confirm = useConfirm();
  const toast = useToast();
  const [odontologos, setOdontologos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    especialidad: '',
    matricula: '',
    activo: true,
    datos_extra: {},
  });

  const camposBase = [
    { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
    { name: 'dni', nombre_campo: 'DNI', tipo: 'text', required: false },
    { name: 'telefono', nombre_campo: 'Teléfono', tipo: 'text', required: false },
    { name: 'email', nombre_campo: 'Email', tipo: 'email', required: false },
    { name: 'especialidad', nombre_campo: 'Especialidad', tipo: 'text', required: false },
    { name: 'matricula', nombre_campo: 'Matrícula', tipo: 'text', required: false },
  ];

  useEffect(() => {
    loadOdontologos();
  }, []);

  const loadOdontologos = async () => {
    try {
      setLoading(true);
      const data = await getOdontologos();
      setOdontologos(data);
    } catch (error) {
      console.error('Error al cargar odontólogos:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los odontólogos.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { nombre, dni, telefono, email, especialidad, matricula, activo, datos_extra, ...datosExtra } = formData;
      
      // Filtrar campos dinámicos vacíos (no guardar strings vacíos, null, undefined)
      const datosExtraFiltrados = Object.keys(datosExtra).reduce((acc, key) => {
        const value = datosExtra[key];
        // Solo guardar valores que no estén vacíos
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const odontologoData = {
        nombre,
        dni,
        telefono,
        email,
        especialidad,
        matricula,
        activo,
        datos_extra: datosExtraFiltrados,
      };

      if (editingId) {
        await updateOdontologo(editingId, odontologoData);
        toast.success('Odontólogo actualizado.');
      } else {
        await addOdontologo(odontologoData);
        toast.success('Odontólogo registrado.');
      }

      await loadOdontologos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar odontólogo:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el odontólogo.'));
    }
  };

  const handleEdit = (odontologo) => {
    setEditingId(odontologo.id);
    setFormData({
      nombre: odontologo.nombre || '',
      dni: odontologo.dni || '',
      telefono: odontologo.telefono || '',
      email: odontologo.email || '',
      especialidad: odontologo.especialidad || '',
      matricula: odontologo.matricula || '',
      activo: odontologo.activo !== false,
      ...odontologo.datos_extra,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const odontologo = odontologos.find(o => o.id === id);
    const nombreSeguro = odontologo?.nombre || 'este odontólogo';
    const ok = await confirm({
      title: 'Eliminar odontólogo',
      message:
        `Vas a eliminar a "${nombreSeguro}". Esto también eliminará sus horarios y citas asociadas. ` +
        `Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteOdontologo(id);
      toast.success('Odontólogo eliminado.');
      await loadOdontologos();
    } catch (error) {
      console.error('Error al eliminar odontólogo:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el odontólogo.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      nombre: '',
      dni: '',
      telefono: '',
      email: '',
      especialidad: '',
      matricula: '',
      activo: true,
      datos_extra: {},
    });
  };

  const filteredOdontologos = odontologos.filter((odontologo) =>
    odontologo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (odontologo.dni && odontologo.dni.includes(searchTerm)) ||
    (odontologo.especialidad && odontologo.especialidad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Odontólogos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus size={20} />
          Nuevo Odontólogo
        </button>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o especialidad..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de odontólogos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando odontólogos...</div>
        ) : filteredOdontologos.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="Aún no hay odontólogos"
            description="Registra a tu primer odontólogo. Después podrás definir sus horarios y agendar citas."
            actionLabel="Registrar odontólogo"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Matrícula</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOdontologos.map((odontologo) => (
                  <tr key={odontologo.id} className="hover:bg-gray-50">
                    <td>{odontologo.id}</td>
                    <td className="font-medium">{odontologo.nombre}</td>
                    <td>{odontologo.especialidad || '-'}</td>
                    <td>{odontologo.matricula || '-'}</td>
                    <td>{odontologo.telefono || '-'}</td>
                    <td>
                      {odontologo.activo ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-error">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/horarios?odontologo=${odontologo.id}`}
                          className="btn btn-sm btn-ghost gap-1"
                          title="Ver horarios"
                        >
                          <Calendar size={16} />
                          Horarios
                        </Link>
                        <button
                          onClick={() => handleEdit(odontologo)}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(odontologo.id)}
                          className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    </td>
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
              {editingId ? 'Editar Odontólogo' : 'Nuevo Odontólogo'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <DynamicForm
                entidad="odontologos"
                formData={formData}
                onChange={setFormData}
                camposBase={camposBase}
              />

              <div className="form-control mt-4">
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

export default Odontologos;


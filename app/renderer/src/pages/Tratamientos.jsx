import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, DollarSign, Clock } from 'lucide-react';
import DynamicForm from '../components/DynamicForm';
import { getTratamientos, addTratamiento, updateTratamiento, deleteTratamiento } from '../services/dbService';

function Tratamientos() {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0.0,
    duracion_minutos: 30,
    activo: true,
    datos_extra: {},
  });

  const camposBase = [
    { name: 'codigo', nombre_campo: 'Código', tipo: 'text', required: false },
    { name: 'nombre', nombre_campo: 'Nombre', tipo: 'text', required: true },
    { name: 'descripcion', nombre_campo: 'Descripción', tipo: 'textarea', required: false },
    { name: 'precio', nombre_campo: 'Precio', tipo: 'number', required: true },
    { name: 'duracion_minutos', nombre_campo: 'Duración (minutos)', tipo: 'number', required: false },
  ];

  useEffect(() => {
    loadTratamientos();
  }, []);

  const loadTratamientos = async () => {
    try {
      setLoading(true);
      const data = await getTratamientos();
      setTratamientos(data);
    } catch (error) {
      console.error('Error al cargar tratamientos:', error);
      alert('Error al cargar tratamientos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { codigo, nombre, descripcion, precio, duracion_minutos, activo, datos_extra, ...datosExtra } = formData;
      
      // Filtrar campos dinámicos vacíos (no guardar strings vacíos, null, undefined)
      const datosExtraFiltrados = Object.keys(datosExtra).reduce((acc, key) => {
        const value = datosExtra[key];
        // Solo guardar valores que no estén vacíos
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const tratamientoData = {
        codigo,
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0.0,
        duracion_minutos: parseInt(duracion_minutos) || 30,
        activo,
        datos_extra: datosExtraFiltrados,
      };

      if (editingId) {
        await updateTratamiento(editingId, tratamientoData);
      } else {
        await addTratamiento(tratamientoData);
      }

      await loadTratamientos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar tratamiento:', error);
      alert('Error al guardar tratamiento');
    }
  };

  const handleEdit = (tratamiento) => {
    setEditingId(tratamiento.id);
    setFormData({
      codigo: tratamiento.codigo || '',
      nombre: tratamiento.nombre || '',
      descripcion: tratamiento.descripcion || '',
      precio: tratamiento.precio || 0.0,
      duracion_minutos: tratamiento.duracion_minutos || 30,
      activo: tratamiento.activo !== false,
      ...tratamiento.datos_extra,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este tratamiento?')) return;

    try {
      await deleteTratamiento(id);
      await loadTratamientos();
    } catch (error) {
      console.error('Error al eliminar tratamiento:', error);
      alert('Error al eliminar tratamiento');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio: 0.0,
      duracion_minutos: 30,
      activo: true,
      datos_extra: {},
    });
  };

  const filteredTratamientos = tratamientos.filter((tratamiento) =>
    tratamiento.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tratamiento.codigo && tratamiento.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Tratamientos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus size={20} />
          Nuevo Tratamiento
        </button>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar tratamiento..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de tratamientos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando tratamientos...</div>
        ) : filteredTratamientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay tratamientos registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTratamientos.map((tratamiento) => (
                  <tr key={tratamiento.id} className="hover:bg-gray-50">
                    <td>{tratamiento.codigo || '-'}</td>
                    <td className="font-medium">{tratamiento.nombre}</td>
                    <td className="text-sm text-gray-600">
                      {tratamiento.descripcion || '-'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} className="text-gray-500" />
                        <span className="font-semibold">
                          S/ {tratamiento.precio.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-500" />
                        <span>{tratamiento.duracion_minutos} min</span>
                      </div>
                    </td>
                    <td>
                      {tratamiento.activo ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-error">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(tratamiento)}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(tratamiento.id)}
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
              {editingId ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <DynamicForm
                entidad="tratamientos"
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

export default Tratamientos;


import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, User, Lock, Shield } from 'lucide-react';
import { getUsuarios, addUsuario, updateUsuario, deleteUsuario } from '../services/dbService';
import { getOdontologos } from '../services/dbService';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [odontologos, setOdontologos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    email: '',
    rol: 'recepcionista',
    id_odontologo: '',
  });

  useEffect(() => {
    loadUsuarios();
    loadOdontologos();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadOdontologos = async () => {
    try {
      const data = await getOdontologos();
      setOdontologos(data);
    } catch (error) {
      console.error('Error al cargar odontólogos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUsuario(editingId, formData);
      } else {
        if (!formData.password) {
          alert('La contraseña es requerida para nuevos usuarios');
          return;
        }
        await addUsuario(formData);
      }
      await loadUsuarios();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert('Error al guardar usuario: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (usuario) => {
    setEditingId(usuario.id);
    setFormData({
      username: usuario.username || '',
      password: '', // No mostrar contraseña
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      rol: usuario.rol || 'recepcionista',
      id_odontologo: usuario.id_odontologo || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await deleteUsuario(id);
      await loadUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      username: '',
      password: '',
      nombre: '',
      email: '',
      rol: 'recepcionista',
      id_odontologo: '',
    });
  };

  const getRolIcon = (rol) => {
    switch (rol) {
      case 'admin':
        return <Shield size={16} className="text-red-600" />;
      case 'odontologo':
        return <User size={16} className="text-blue-600" />;
      default:
        return <User size={16} className="text-gray-600" />;
    }
  };

  const getRolLabel = (rol) => {
    switch (rol) {
      case 'admin':
        return 'Administrador';
      case 'odontologo':
        return 'Odontólogo';
      case 'recepcionista':
        return 'Recepcionista';
      default:
        return rol;
    }
  };

  const filteredUsuarios = usuarios.filter((usuario) =>
    usuario.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-600 mt-1">Gestiona usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary gap-2"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar usuario..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando usuarios...</div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay usuarios registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Odontólogo</th>
                  <th>Estado</th>
                  <th>Último Login</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td>
                      <div className="flex items-center gap-2">
                        {getRolIcon(usuario.rol)}
                        <span className="font-medium">{usuario.username}</span>
                      </div>
                    </td>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.email || '-'}</td>
                    <td>
                      <span className="badge badge-outline">
                        {getRolLabel(usuario.rol)}
                      </span>
                    </td>
                    <td>{usuario.odontologo_nombre || '-'}</td>
                    <td>
                      <span className={`badge ${usuario.activo === 1 ? 'badge-success' : 'badge-error'}`}>
                        {usuario.activo === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {usuario.last_login 
                        ? new Date(usuario.last_login).toLocaleDateString('es-ES')
                        : 'Nunca'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
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
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre de Usuario *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={!!editingId}
                />
                {editingId && (
                  <label className="label">
                    <span className="label-text-alt text-gray-500">El nombre de usuario no se puede cambiar</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Contraseña {editingId ? '(dejar vacío para no cambiar)' : '*'}
                  </span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre Completo *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Rol *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value, id_odontologo: e.target.value !== 'odontologo' ? '' : formData.id_odontologo })}
                    required
                  >
                    <option value="recepcionista">Recepcionista</option>
                    <option value="odontologo">Odontólogo</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {formData.rol === 'odontologo' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Odontólogo</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={formData.id_odontologo}
                      onChange={(e) => setFormData({ ...formData, id_odontologo: e.target.value || '' })}
                    >
                      <option value="">-- Selecciona un odontólogo --</option>
                      {odontologos.map((odontologo) => (
                        <option key={odontologo.id} value={odontologo.id}>
                          {odontologo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

export default Usuarios;


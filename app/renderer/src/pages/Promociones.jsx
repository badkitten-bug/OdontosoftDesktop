import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Tag, Ticket, Calendar } from 'lucide-react';
import { getPromociones, addPromocion, updatePromocion, deletePromocion, getCupones, addCupon, deleteCupon } from '../services/dbService';
import { getTratamientosActivos } from '../services/dbService';

function Promociones() {
  const [promociones, setPromociones] = useState([]);
  const [cupones, setCupones] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPromocionModal, setShowPromocionModal] = useState(false);
  const [showCuponModal, setShowCuponModal] = useState(false);
  const [editingPromocionId, setEditingPromocionId] = useState(null);
  const [editingCuponId, setEditingCuponId] = useState(null);
  const [activeTab, setActiveTab] = useState('promociones');
  const [searchTerm, setSearchTerm] = useState('');
  const [promocionData, setPromocionData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'descuento_porcentaje',
    valor: 0,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    aplica_a: 'todos',
    id_entidad: '',
  });
  const [cuponData, setCuponData] = useState({
    codigo: '',
    id_promocion: '',
    descuento_porcentaje: '',
    descuento_fijo: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    usos_maximos: 1,
  });

  useEffect(() => {
    loadPromociones();
    loadCupones();
    loadTratamientos();
  }, []);

  const loadPromociones = async () => {
    try {
      setLoading(true);
      const data = await getPromociones(false);
      setPromociones(data);
    } catch (error) {
      console.error('Error al cargar promociones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCupones = async () => {
    try {
      const data = await getCupones(false);
      setCupones(data);
    } catch (error) {
      console.error('Error al cargar cupones:', error);
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

  const handleSubmitPromocion = async (e) => {
    e.preventDefault();
    try {
      if (editingPromocionId) {
        await updatePromocion(editingPromocionId, promocionData);
      } else {
        await addPromocion(promocionData);
      }
      await loadPromociones();
      handleClosePromocionModal();
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      alert('Error al guardar promoción: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleSubmitCupon = async (e) => {
    e.preventDefault();
    try {
      if (!cuponData.descuento_porcentaje && !cuponData.descuento_fijo) {
        alert('Debes especificar un descuento (porcentaje o fijo)');
        return;
      }
      await addCupon(cuponData);
      await loadCupones();
      handleCloseCuponModal();
    } catch (error) {
      console.error('Error al guardar cupón:', error);
      alert('Error al guardar cupón: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEditPromocion = (promocion) => {
    setEditingPromocionId(promocion.id);
    setPromocionData({
      nombre: promocion.nombre || '',
      descripcion: promocion.descripcion || '',
      tipo: promocion.tipo || 'descuento_porcentaje',
      valor: promocion.valor || 0,
      fecha_inicio: promocion.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: promocion.fecha_fin || '',
      aplica_a: promocion.aplica_a || 'todos',
      id_entidad: promocion.id_entidad || '',
      activa: promocion.activa === 1,
    });
    setShowPromocionModal(true);
  };

  const handleDeletePromocion = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
    try {
      await deletePromocion(id);
      await loadPromociones();
    } catch (error) {
      console.error('Error al eliminar promoción:', error);
      alert('Error al eliminar promoción');
    }
  };

  const handleDeleteCupon = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return;
    try {
      await deleteCupon(id);
      await loadCupones();
    } catch (error) {
      console.error('Error al eliminar cupón:', error);
      alert('Error al eliminar cupón');
    }
  };

  const handleClosePromocionModal = () => {
    setShowPromocionModal(false);
    setEditingPromocionId(null);
    setPromocionData({
      nombre: '',
      descripcion: '',
      tipo: 'descuento_porcentaje',
      valor: 0,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      aplica_a: 'todos',
      id_entidad: '',
    });
  };

  const handleCloseCuponModal = () => {
    setShowCuponModal(false);
    setEditingCuponId(null);
    setCuponData({
      codigo: '',
      id_promocion: '',
      descuento_porcentaje: '',
      descuento_fijo: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      usos_maximos: 1,
    });
  };

  const esActiva = (fechaInicio, fechaFin) => {
    const hoy = new Date().toISOString().split('T')[0];
    return fechaInicio <= hoy && fechaFin >= hoy;
  };

  const filteredPromociones = promociones.filter((prom) =>
    prom.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prom.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCupones = cupones.filter((cupon) =>
    cupon.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cupon.promocion_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Promociones y Cupones</h1>
          <p className="text-gray-600 mt-1">Gestiona promociones y cupones de descuento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCuponModal(true)}
            className="btn btn-outline btn-primary gap-2"
          >
            <Ticket size={20} />
            Nuevo Cupón
          </button>
          <button
            onClick={() => setShowPromocionModal(true)}
            className="btn btn-primary gap-2"
          >
            <Plus size={20} />
            Nueva Promoción
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-white p-1">
        <button
          className={`tab ${activeTab === 'promociones' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('promociones')}
        >
          <Tag size={18} className="mr-2" />
          Promociones
        </button>
        <button
          className={`tab ${activeTab === 'cupones' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('cupones')}
        >
          <Ticket size={18} className="mr-2" />
          Cupones
        </button>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Buscar ${activeTab}...`}
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Promociones */}
      {activeTab === 'promociones' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-8">Cargando promociones...</div>
          ) : filteredPromociones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay promociones registradas
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPromociones.map((prom) => {
                const activa = esActiva(prom.fecha_inicio, prom.fecha_fin) && prom.activa === 1;
                return (
                  <div key={prom.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-800">{prom.nombre}</h3>
                          {activa && <span className="badge badge-success">Activa</span>}
                          {!activa && <span className="badge badge-ghost">Inactiva</span>}
                        </div>
                        {prom.descripcion && (
                          <p className="text-sm text-gray-600 mb-2">{prom.descripcion}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Tipo:</span>{' '}
                            {prom.tipo === 'descuento_porcentaje' ? 'Descuento %' :
                             prom.tipo === 'descuento_fijo' ? 'Descuento Fijo' : 'Paquete'}
                          </div>
                          <div>
                            <span className="font-medium">Valor:</span>{' '}
                            {prom.tipo === 'descuento_porcentaje' ? `${prom.valor}%` : `S/ ${prom.valor.toFixed(2)}`}
                          </div>
                          <div>
                            <span className="font-medium">Aplica a:</span> {prom.aplica_a}
                          </div>
                          <div>
                            <span className="font-medium">Vigencia:</span>{' '}
                            {new Date(prom.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(prom.fecha_fin).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditPromocion(prom)}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePromocion(prom.id)}
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
      )}

      {/* Lista de Cupones */}
      {activeTab === 'cupones' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-8">Cargando cupones...</div>
          ) : filteredCupones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay cupones registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th>Código</th>
                    <th>Promoción</th>
                    <th>Descuento</th>
                    <th>Usos</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCupones.map((cupon) => {
                    const activo = esActiva(cupon.fecha_inicio, cupon.fecha_fin) && cupon.activo === 1;
                    const agotado = cupon.usos_maximos > 0 && cupon.usos_actuales >= cupon.usos_maximos;
                    return (
                      <tr key={cupon.id} className="hover:bg-gray-50">
                        <td>
                          <span className="font-mono font-bold text-blue-600">{cupon.codigo}</span>
                        </td>
                        <td>{cupon.promocion_nombre || '-'}</td>
                        <td>
                          {cupon.descuento_porcentaje 
                            ? `${cupon.descuento_porcentaje}%`
                            : `S/ ${cupon.descuento_fijo?.toFixed(2) || '0.00'}`}
                        </td>
                        <td>
                          {cupon.usos_maximos > 0 
                            ? `${cupon.usos_actuales} / ${cupon.usos_maximos}`
                            : `${cupon.usos_actuales} / ∞`}
                        </td>
                        <td className="text-sm">
                          {new Date(cupon.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(cupon.fecha_fin).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          {agotado ? (
                            <span className="badge badge-error">Agotado</span>
                          ) : activo ? (
                            <span className="badge badge-success">Activo</span>
                          ) : (
                            <span className="badge badge-ghost">Inactivo</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteCupon(cupon.id)}
                            className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Promoción */}
      {showPromocionModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingPromocionId ? 'Editar Promoción' : 'Nueva Promoción'}
            </h3>
            
            <form onSubmit={handleSubmitPromocion} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={promocionData.nombre}
                  onChange={(e) => setPromocionData({ ...promocionData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Descripción</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={promocionData.descripcion}
                  onChange={(e) => setPromocionData({ ...promocionData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Tipo *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={promocionData.tipo}
                    onChange={(e) => setPromocionData({ ...promocionData, tipo: e.target.value })}
                    required
                  >
                    <option value="descuento_porcentaje">Descuento Porcentaje</option>
                    <option value="descuento_fijo">Descuento Fijo</option>
                    <option value="paquete">Paquete</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Valor * ({promocionData.tipo === 'descuento_porcentaje' ? '%' : 'S/'})
                    </span>
                  </label>
                  <input
                    type="number"
                    step={promocionData.tipo === 'descuento_porcentaje' ? '1' : '0.01'}
                    className="input input-bordered w-full"
                    value={promocionData.valor}
                    onChange={(e) => setPromocionData({ ...promocionData, valor: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    max={promocionData.tipo === 'descuento_porcentaje' ? '100' : undefined}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Aplica a *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={promocionData.aplica_a}
                    onChange={(e) => setPromocionData({ ...promocionData, aplica_a: e.target.value, id_entidad: e.target.value !== 'tratamiento' ? '' : promocionData.id_entidad })}
                    required
                  >
                    <option value="todos">Todos</option>
                    <option value="tratamiento">Tratamiento Específico</option>
                    <option value="producto">Producto Específico</option>
                    <option value="factura">Factura</option>
                  </select>
                </div>

                {promocionData.aplica_a === 'tratamiento' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Tratamiento</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={promocionData.id_entidad}
                      onChange={(e) => setPromocionData({ ...promocionData, id_entidad: e.target.value })}
                    >
                      <option value="">-- Selecciona un tratamiento --</option>
                      {tratamientos.map((tratamiento) => (
                        <option key={tratamiento.id} value={tratamiento.id}>
                          {tratamiento.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha Inicio *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={promocionData.fecha_inicio}
                    onChange={(e) => setPromocionData({ ...promocionData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha Fin *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={promocionData.fecha_fin}
                    onChange={(e) => setPromocionData({ ...promocionData, fecha_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleClosePromocionModal}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPromocionId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={handleClosePromocionModal}></div>
        </div>
      )}

      {/* Modal de Cupón */}
      {showCuponModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nuevo Cupón</h3>
            
            <form onSubmit={handleSubmitCupon} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Código *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full font-mono"
                  value={cuponData.codigo}
                  onChange={(e) => setCuponData({ ...cuponData, codigo: e.target.value.toUpperCase() })}
                  placeholder="EJEMPLO2024"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Promoción (Opcional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={cuponData.id_promocion}
                  onChange={(e) => setCuponData({ ...cuponData, id_promocion: e.target.value || '' })}
                >
                  <option value="">-- Sin promoción asociada --</option>
                  {promociones.map((prom) => (
                    <option key={prom.id} value={prom.id}>
                      {prom.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Descuento %</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="input input-bordered w-full"
                    value={cuponData.descuento_porcentaje}
                    onChange={(e) => setCuponData({ ...cuponData, descuento_porcentaje: e.target.value, descuento_fijo: '' })}
                    min="0"
                    max="100"
                    placeholder="Ej: 10"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Descuento Fijo (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={cuponData.descuento_fijo}
                    onChange={(e) => setCuponData({ ...cuponData, descuento_fijo: e.target.value, descuento_porcentaje: '' })}
                    min="0"
                    placeholder="Ej: 50.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha Inicio *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={cuponData.fecha_inicio}
                    onChange={(e) => setCuponData({ ...cuponData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Fecha Fin *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={cuponData.fecha_fin}
                    onChange={(e) => setCuponData({ ...cuponData, fecha_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Usos Máximos</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={cuponData.usos_maximos}
                  onChange={(e) => setCuponData({ ...cuponData, usos_maximos: parseInt(e.target.value) || 1 })}
                  min="1"
                />
                <label className="label">
                  <span className="label-text-alt text-gray-500">0 = ilimitado</span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseCuponModal}
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
          <div className="modal-backdrop" onClick={handleCloseCuponModal}></div>
        </div>
      )}
    </div>
  );
}

export default Promociones;


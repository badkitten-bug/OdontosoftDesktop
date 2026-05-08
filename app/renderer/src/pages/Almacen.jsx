import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, TrendingUp, TrendingDown, AlertCircle, Download } from 'lucide-react';
import { getProductos, addProducto, updateProducto, deleteProducto, getMovimientosProducto, addMovimientoInventario, getProductosStockBajo } from '../services/dbService';
import { exportarProductos } from '../utils/excelExporter';
import EmptyState from '../components/EmptyState';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function Almacen() {
  const confirm = useConfirm();
  const toast = useToast();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    stock: 0,
    stock_minimo: 0,
    precio: 0.0,
    descripcion: '',
  });
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'entrada',
    cantidad: 0,
    motivo: '',
  });

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los productos.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateProducto(editingId, formData);
        toast.success('Producto actualizado.');
      } else {
        await addProducto(formData);
        toast.success('Producto registrado.');
      }

      await loadProductos();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error(humanizeError(error, 'No se pudo guardar el producto.'));
    }
  };

  const handleEdit = (producto) => {
    setEditingId(producto.id);
    setFormData({
      nombre: producto.nombre || '',
      stock: producto.stock || 0,
      stock_minimo: producto.stock_minimo || 0,
      precio: producto.precio || 0.0,
      descripcion: producto.descripcion || '',
    });
    setShowModal(true);
  };

  const handleAbrirMovimiento = async (producto) => {
    setProductoSeleccionado(producto);
    try {
      const movs = await getMovimientosProducto(producto.id);
      setMovimientos(movs);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
    setShowMovimientoModal(true);
  };

  const handleAgregarMovimiento = async (e) => {
    e.preventDefault();
    try {
      await addMovimientoInventario({
        id_producto: productoSeleccionado.id,
        tipo: movimientoData.tipo,
        cantidad: movimientoData.cantidad,
        motivo: movimientoData.motivo,
        usuario: 'Admin',
      });
      await loadProductos();
      await handleAbrirMovimiento(productoSeleccionado);
      setMovimientoData({ tipo: 'entrada', cantidad: 0, motivo: '' });
      toast.success('Movimiento registrado.');
    } catch (error) {
      console.error('Error al agregar movimiento:', error);
      toast.error(humanizeError(error, 'No se pudo agregar el movimiento.'));
    }
  };

  const handleDelete = async (id) => {
    const producto = productos.find(p => p.id === id);
    const nombreSeguro = producto?.nombre || 'este producto';
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `Vas a eliminar "${nombreSeguro}" del inventario. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;

    try {
      await deleteProducto(id);
      toast.success('Producto eliminado.');
      await loadProductos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el producto.'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      nombre: '',
      stock: 0,
      stock_minimo: 0,
      precio: 0.0,
      descripcion: '',
    });
  };

  const filteredProductos = productos.filter((producto) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return true;
    }
    const searchLower = searchTerm.toLowerCase();
    return (
      producto.nombre?.toLowerCase().includes(searchLower) ||
      producto.descripcion?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Almacén</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarProductos(filteredProductos)}
            className="btn btn-outline btn-primary gap-2"
            type="button"
            title="Exportar productos a Excel"
          >
            <Download size={18} />
            Exportar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary gap-2"
            type="button"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="form-control">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando productos...</div>
        ) : filteredProductos.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aún no tienes productos en almacén"
            description="Registra tus insumos y materiales. El sistema te avisará cuando el stock baje."
            actionLabel="Agregar primer producto"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Stock</th>
                  <th>Stock Mínimo</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.map((producto) => {
                  const stockBajo = producto.stock_minimo > 0 && producto.stock <= producto.stock_minimo;
                  return (
                    <tr key={producto.id} className={`hover:bg-gray-50 ${stockBajo ? 'bg-orange-50' : ''}`}>
                      <td>{producto.id}</td>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {producto.nombre}
                          {stockBajo && <AlertCircle size={16} className="text-orange-600" />}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${producto.stock > 0 ? (stockBajo ? 'badge-warning' : 'badge-success') : 'badge-error'}`}>
                          {producto.stock}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-gray-600">
                          {producto.stock_minimo || 0}
                        </span>
                      </td>
                      <td>S/ {producto.precio.toFixed(2)}</td>
                      <td className="text-sm text-gray-600">
                        {producto.descripcion || '-'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAbrirMovimiento(producto)}
                            className="btn btn-sm btn-ghost gap-1"
                            title="Ver movimientos"
                          >
                            <Package size={16} />
                            Movimientos
                          </button>
                          <button
                            onClick={() => handleEdit(producto)}
                            className="btn btn-sm btn-ghost gap-1"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id)}
                            className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Stock</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Stock Mínimo</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Precio</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0.0 })}
                    min="0"
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

      {/* Modal de movimientos */}
      {showMovimientoModal && productoSeleccionado && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              Movimientos de Inventario - {productoSeleccionado.nombre}
            </h3>

            {/* Formulario de nuevo movimiento */}
            <form onSubmit={handleAgregarMovimiento} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-4 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Tipo *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={movimientoData.tipo}
                    onChange={(e) => setMovimientoData({ ...movimientoData, tipo: e.target.value })}
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Cantidad *</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={movimientoData.cantidad}
                    onChange={(e) => setMovimientoData({ ...movimientoData, cantidad: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>

                <div className="form-control col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Motivo</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={movimientoData.motivo}
                    onChange={(e) => setMovimientoData({ ...movimientoData, motivo: e.target.value })}
                    placeholder="Ej: Compra, Venta, Ajuste de inventario..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <button type="submit" className="btn btn-primary btn-sm">
                  Agregar Movimiento
                </button>
              </div>
            </form>

            {/* Historial de movimientos */}
            <div className="max-h-96 overflow-y-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock Anterior</th>
                    <th>Stock Nuevo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr key={mov.id}>
                      <td className="text-sm">
                        {new Date(mov.created_at).toLocaleString('es-ES')}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${
                          mov.tipo === 'entrada' ? 'badge-success' :
                          mov.tipo === 'salida' ? 'badge-error' :
                          'badge-warning'
                        }`}>
                          {mov.tipo === 'entrada' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {mov.tipo}
                        </span>
                      </td>
                      <td>{mov.cantidad}</td>
                      <td>{mov.stock_anterior}</td>
                      <td className="font-medium">{mov.stock_nuevo}</td>
                      <td className="text-sm text-gray-600">{mov.motivo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => {
                  setShowMovimientoModal(false);
                  setProductoSeleccionado(null);
                  setMovimientos([]);
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
              setShowMovimientoModal(false);
              setProductoSeleccionado(null);
              setMovimientos([]);
            }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default Almacen;


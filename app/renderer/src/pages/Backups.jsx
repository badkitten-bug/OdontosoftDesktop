import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, FileArchive, Calendar } from 'lucide-react';
import { getBackups, crearBackup, restaurarBackup, deleteBackup } from '../services/dbService';
import EmptyState from '../components/EmptyState';
import { humanizeError } from '../utils/humanizeError';
import { useConfirm, useToast } from '../context/UIContext';

function Backups() {
  const confirm = useConfirm();
  const toast = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [backupData, setBackupData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const data = await getBackups();
      setBackups(data);
    } catch (error) {
      console.error('Error al cargar backups:', error);
      toast.error(humanizeError(error, 'No se pudieron cargar los backups.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCrearBackup = async (e) => {
    e.preventDefault();
    try {
      setCreando(true);
      await crearBackup(backupData.nombre || null, backupData.descripcion || null);
      await loadBackups();
      setShowCrearModal(false);
      setBackupData({ nombre: '', descripcion: '' });
      toast.success('Backup creado.');
    } catch (error) {
      console.error('Error al crear backup:', error);
      toast.error(humanizeError(error, 'No se pudo crear el backup.'));
    } finally {
      setCreando(false);
    }
  };

  const handleRestaurar = async (id) => {
    const ok = await confirm({
      title: 'Restaurar backup',
      message:
        'Vas a restaurar este backup. Esto REEMPLAZARÁ todos los datos actuales con los del backup. ' +
        'La aplicación se recargará al terminar. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, restaurar',
    });
    if (!ok) return;

    try {
      const resultado = await restaurarBackup(id);
      if (resultado?.success) {
        toast.success('Backup restaurado. La aplicación se recargará.');
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      toast.error(humanizeError(error, 'No se pudo restaurar el backup.'));
    }
  };

  const handleDelete = async (id) => {
    const backup = backups.find(b => b.id === id);
    const detalle = backup?.nombre_archivo || 'este backup';
    const ok = await confirm({
      title: 'Eliminar backup',
      message: `Vas a eliminar el archivo "${detalle}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await deleteBackup(id);
      toast.success('Backup eliminado.');
      await loadBackups();
    } catch (error) {
      console.error('Error al eliminar backup:', error);
      toast.error(humanizeError(error, 'No se pudo eliminar el backup.'));
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Backups</h1>
          <p className="text-gray-600 mt-1">Gestiona backups y restauraciones de la base de datos</p>
        </div>
        <button
          onClick={() => setShowCrearModal(true)}
          className="btn btn-primary gap-2"
        >
          <Download size={20} />
          Crear Backup
        </button>
      </div>

      {/* Información */}
      <div className="alert alert-info">
        <FileArchive size={20} />
        <div>
          <h3 className="font-bold">Información sobre Backups</h3>
          <div className="text-sm">
            Los backups se guardan automáticamente en la carpeta de datos de la aplicación.
            Se recomienda crear backups regulares antes de actualizaciones importantes.
          </div>
        </div>
      </div>

      {/* Lista de backups */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Cargando backups...</div>
        ) : backups.length === 0 ? (
          <EmptyState
            icon={FileArchive}
            title="Aún no hay backups"
            description="La app crea uno automático cada vez que cierras sesión, pero también puedes crear uno manual ahora antes de un cambio importante."
            actionLabel="Crear backup ahora"
            onAction={() => setShowCrearModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Fecha de Creación</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="font-medium">{backup.nombre_archivo}</td>
                    <td>
                      <span className={`badge ${backup.tipo === 'automatico' ? 'badge-info' : 'badge-success'}`}>
                        {backup.tipo === 'automatico' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td>{formatBytes(backup.tamano)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm">
                          {new Date(backup.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {backup.descripcion || '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestaurar(backup.id)}
                          className="btn btn-sm btn-outline btn-primary gap-1"
                          title="Restaurar backup"
                        >
                          <Upload size={14} />
                          Restaurar
                        </button>
                        <button
                          onClick={() => handleDelete(backup.id)}
                          className="btn btn-sm btn-ghost text-red-600 hover:text-red-700 gap-1"
                          title="Eliminar backup"
                        >
                          <Trash2 size={14} />
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

      {/* Modal de crear backup */}
      {showCrearModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Crear Backup</h3>
            
            <form onSubmit={handleCrearBackup} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Nombre (Opcional)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={backupData.nombre}
                  onChange={(e) => setBackupData({ ...backupData, nombre: e.target.value })}
                  placeholder="Dejar vacío para nombre automático"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Descripción (Opcional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={backupData.descripcion}
                  onChange={(e) => setBackupData({ ...backupData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Ej: Backup antes de actualización importante..."
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => {
                    setShowCrearModal(false);
                    setBackupData({ nombre: '', descripcion: '' });
                  }}
                  className="btn btn-ghost"
                  disabled={creando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creando}>
                  {creando ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Crear Backup
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              if (!creando) {
                setShowCrearModal(false);
                setBackupData({ nombre: '', descripcion: '' });
              }
            }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default Backups;


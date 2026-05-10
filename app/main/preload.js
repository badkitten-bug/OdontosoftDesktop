const { contextBridge, ipcRenderer } = require('electron');

// El sessionId vive solo dentro del preload (no es accesible desde DevTools del renderer
// porque está en otro contexto JS). Se setea tras login y se limpia tras logout.
let _sessionId = null;

const noauth = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const auth = (channel) => (...args) => ipcRenderer.invoke(channel, _sessionId, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  // Manejo de sesión (preload-side)
  setSessionId: (id) => { _sessionId = id || null; },
  clearSessionId: () => { _sessionId = null; },

  // Autenticación
  login: noauth('login'),
  logout: auth('logout'),
  whoami: auth('whoami'),
  existenUsuarios: noauth('existen-usuarios'),
  getUsuariosPublicos: noauth('get-usuarios-publicos'),
  getOnboardingStatus: auth('get-onboarding-status'),
  crearPrimerAdmin: noauth('crear-primer-admin'),
  recuperarPassword: noauth('recuperar-password'),

  // Pacientes
  getPacientes: noauth('get-pacientes'),
  getPaciente: noauth('get-paciente'),
  addPaciente: noauth('add-paciente'),
  updatePaciente: noauth('update-paciente'),
  deletePaciente: noauth('delete-paciente'),

  // Productos
  getProductos: noauth('get-productos'),
  getProducto: noauth('get-producto'),
  addProducto: noauth('add-producto'),
  updateProducto: noauth('update-producto'),
  deleteProducto: noauth('delete-producto'),

  // Configuración (Campos dinámicos)
  getCamposDinamicos: noauth('get-campos-dinamicos'),
  addCampoDinamico: auth('add-campo-dinamico'),
  updateCampoDinamico: auth('update-campo-dinamico'),
  deleteCampoDinamico: auth('delete-campo-dinamico'),
  updateOrdenCampos: auth('update-orden-campos'),
  initCamposBase: auth('init-campos-base'),

  // Historial
  getHistorial: noauth('get-historial'),
  addHistorial: noauth('add-historial'),
  deleteHistorial: noauth('delete-historial'),

  // Odontólogos
  getOdontologos: noauth('get-odontologos'),
  getOdontologosActivos: noauth('get-odontologos-activos'),
  getOdontologo: noauth('get-odontologo'),
  addOdontologo: noauth('add-odontologo'),
  updateOdontologo: noauth('update-odontologo'),
  deleteOdontologo: noauth('delete-odontologo'),

  // Horarios
  getHorarios: noauth('get-horarios'),
  getHorariosActivos: noauth('get-horarios-activos'),
  addHorario: noauth('add-horario'),
  updateHorario: noauth('update-horario'),
  deleteHorario: noauth('delete-horario'),
  verificarDisponibilidad: noauth('verificar-disponibilidad'),

  // Citas
  getCitas: noauth('get-citas'),
  getCita: noauth('get-cita'),
  getCitasPorFecha: noauth('get-citas-por-fecha'),
  addCita: noauth('add-cita'),
  updateCita: noauth('update-cita'),
  deleteCita: noauth('delete-cita'),

  // Tratamientos
  getTratamientosPopulares: noauth('get-tratamientos-populares'),
  getTratamientos: noauth('get-tratamientos'),
  getTratamientosActivos: noauth('get-tratamientos-activos'),
  getTratamiento: noauth('get-tratamiento'),
  addTratamiento: noauth('add-tratamiento'),
  updateTratamiento: noauth('update-tratamiento'),
  deleteTratamiento: noauth('delete-tratamiento'),
  getTratamientosCita: noauth('get-tratamientos-cita'),
  addTratamientoCita: noauth('add-tratamiento-cita'),
  deleteTratamientoCita: noauth('delete-tratamiento-cita'),

  // Facturas y Pagos
  getFacturas: noauth('get-facturas'),
  getFactura: noauth('get-factura'),
  crearFactura: noauth('crear-factura'),
  crearFacturaDirecta: noauth('crear-factura-directa'),
  crearFacturaDesdeCita: noauth('crear-factura-desde-cita'),
  getPagosFactura: noauth('get-pagos-factura'),
  addPago: noauth('add-pago'),
  updatePago: noauth('update-pago'),
  deletePago: noauth('delete-pago'),

  // Relaciones entre entidades
  getRelaciones: noauth('get-relaciones'),
  getRelacionesEntidad: noauth('get-relaciones-entidad'),
  addRelacion: noauth('add-relacion'),
  updateRelacion: noauth('update-relacion'),
  deleteRelacion: noauth('delete-relacion'),

  // Recordatorios
  getRecordatorios: noauth('get-recordatorios'),
  getRecordatoriosNoVistos: noauth('get-recordatorios-no-vistos'),
  addRecordatorio: noauth('add-recordatorio'),
  marcarRecordatorioVisto: noauth('marcar-recordatorio-visto'),
  deleteRecordatorio: noauth('delete-recordatorio'),
  generarRecordatoriosCitas: noauth('generar-recordatorios-citas'),
  generarRecordatoriosPagos: noauth('generar-recordatorios-pagos'),

  // Movimientos de Inventario
  getMovimientosProducto: noauth('get-movimientos-producto'),
  getMovimientos: noauth('get-movimientos'),
  addMovimientoInventario: noauth('add-movimiento-inventario'),
  getProductosStockBajo: noauth('get-productos-stock-bajo'),

  // Planes de Tratamiento
  getTodosPlanes: noauth('get-todos-planes'),
  getPlanesPaciente: noauth('get-planes-paciente'),
  getPlan: noauth('get-plan'),
  addPlanTratamiento: noauth('add-plan-tratamiento'),
  addCitaPlan: noauth('add-cita-plan'),
  marcarCitaPlanCompletada: noauth('marcar-cita-plan-completada'),
  updatePlanTratamiento: noauth('update-plan-tratamiento'),
  deletePlanTratamiento: noauth('delete-plan-tratamiento'),

  // Prescripciones
  getPrescripcionesPaciente: noauth('get-prescripciones-paciente'),
  getPrescripcion: noauth('get-prescripcion'),
  addPrescripcion: noauth('add-prescripcion'),
  updatePrescripcion: noauth('update-prescripcion'),
  deletePrescripcion: noauth('delete-prescripcion'),

  // Archivos
  getArchivosHistorial: noauth('get-archivos-historial'),
  getArchivo: noauth('get-archivo'),
  addArchivoHistorial: noauth('add-archivo-historial'),
  deleteArchivoHistorial: noauth('delete-archivo-historial'),
  getRutaArchivo: noauth('get-ruta-archivo'),

  // Usuarios y Permisos (admin)
  getUsuarios: auth('get-usuarios'),
  getUsuario: auth('get-usuario'),
  addUsuario: auth('add-usuario'),
  updateUsuario: auth('update-usuario'),
  deleteUsuario: auth('delete-usuario'),
  getPermisosRol: auth('get-permisos-rol'),
  verificarPermiso: auth('verificar-permiso'),

  // Promociones y Cupones
  getPromociones: noauth('get-promociones'),
  getPromocion: noauth('get-promocion'),
  addPromocion: noauth('add-promocion'),
  updatePromocion: noauth('update-promocion'),
  deletePromocion: noauth('delete-promocion'),
  getCupones: noauth('get-cupones'),
  validarCupon: noauth('validar-cupon'),
  usarCupon: noauth('usar-cupon'),
  addCupon: noauth('add-cupon'),
  deleteCupon: noauth('delete-cupon'),

  // Backups y Exportación (admin)
  crearBackup: auth('crear-backup'),
  getBackups: auth('get-backups'),
  restaurarBackup: auth('restaurar-backup'),
  deleteBackup: auth('delete-backup'),
  exportarCSV: auth('exportar-csv'),

  // Configuración de la clínica
  getConfiguracionClinica: noauth('get-configuracion-clinica'),
  setConfiguracionClinica: auth('set-configuracion-clinica'),
  marcarSetupCompletado: auth('marcar-setup-completado'),
  getEstadoSetup: auth('get-estado-setup'),

  // Licencia
  getLicencia: auth('get-licencia'),
  activarLicencia: auth('activar-licencia'),
  desactivarLicencia: auth('desactivar-licencia'),

  // Diagnóstico y actualizaciones
  exportarDiagnostico: auth('exportar-diagnostico'),
  buscarActualizaciones: auth('buscar-actualizaciones'),
  instalarActualizacion: auth('instalar-actualizacion'),
  onUpdateStatus: (cb) => {
    const channel = 'update-status';
    const listener = (_event, payload) => cb?.(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});

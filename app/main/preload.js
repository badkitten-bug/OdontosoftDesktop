const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Pacientes
  getPacientes: () => ipcRenderer.invoke('get-pacientes'),
  getPaciente: (id) => ipcRenderer.invoke('get-paciente', id),
  addPaciente: (data) => ipcRenderer.invoke('add-paciente', data),
  updatePaciente: (id, data) => ipcRenderer.invoke('update-paciente', id, data),
  deletePaciente: (id) => ipcRenderer.invoke('delete-paciente', id),

  // Productos
  getProductos: () => ipcRenderer.invoke('get-productos'),
  getProducto: (id) => ipcRenderer.invoke('get-producto', id),
  addProducto: (data) => ipcRenderer.invoke('add-producto', data),
  updateProducto: (id, data) => ipcRenderer.invoke('update-producto', id, data),
  deleteProducto: (id) => ipcRenderer.invoke('delete-producto', id),

  // Configuración (Campos dinámicos)
  getCamposDinamicos: (entidad) => ipcRenderer.invoke('get-campos-dinamicos', entidad),
  addCampoDinamico: (data) => ipcRenderer.invoke('add-campo-dinamico', data),
  updateCampoDinamico: (id, data) => ipcRenderer.invoke('update-campo-dinamico', id, data),
  deleteCampoDinamico: (id) => ipcRenderer.invoke('delete-campo-dinamico', id),
  updateOrdenCampos: (campos) => ipcRenderer.invoke('update-orden-campos', campos),
  initCamposBase: (entidad) => ipcRenderer.invoke('init-campos-base', entidad),

  // Historial
  getHistorial: (idPaciente) => ipcRenderer.invoke('get-historial', idPaciente),
  addHistorial: (data) => ipcRenderer.invoke('add-historial', data),
  deleteHistorial: (id) => ipcRenderer.invoke('delete-historial', id),

  // Odontólogos
  getOdontologos: () => ipcRenderer.invoke('get-odontologos'),
  getOdontologosActivos: () => ipcRenderer.invoke('get-odontologos-activos'),
  getOdontologo: (id) => ipcRenderer.invoke('get-odontologo', id),
  addOdontologo: (data) => ipcRenderer.invoke('add-odontologo', data),
  updateOdontologo: (id, data) => ipcRenderer.invoke('update-odontologo', id, data),
  deleteOdontologo: (id) => ipcRenderer.invoke('delete-odontologo', id),

  // Horarios
  getHorarios: (idOdontologo) => ipcRenderer.invoke('get-horarios', idOdontologo),
  getHorariosActivos: (idOdontologo) => ipcRenderer.invoke('get-horarios-activos', idOdontologo),
  addHorario: (data) => ipcRenderer.invoke('add-horario', data),
  updateHorario: (id, data) => ipcRenderer.invoke('update-horario', id, data),
  deleteHorario: (id) => ipcRenderer.invoke('delete-horario', id),
  verificarDisponibilidad: (idOdontologo, fecha, horaInicio, horaFin) =>
    ipcRenderer.invoke('verificar-disponibilidad', idOdontologo, fecha, horaInicio, horaFin),

  // Citas
  getCitas: (filtros) => ipcRenderer.invoke('get-citas', filtros),
  getCita: (id) => ipcRenderer.invoke('get-cita', id),
  getCitasPorFecha: (fecha) => ipcRenderer.invoke('get-citas-por-fecha', fecha),
  addCita: (data) => ipcRenderer.invoke('add-cita', data),
  updateCita: (id, data) => ipcRenderer.invoke('update-cita', id, data),
  deleteCita: (id) => ipcRenderer.invoke('delete-cita', id),

  // Tratamientos
  getTratamientos: () => ipcRenderer.invoke('get-tratamientos'),
  getTratamientosActivos: () => ipcRenderer.invoke('get-tratamientos-activos'),
  getTratamiento: (id) => ipcRenderer.invoke('get-tratamiento', id),
  addTratamiento: (data) => ipcRenderer.invoke('add-tratamiento', data),
  updateTratamiento: (id, data) => ipcRenderer.invoke('update-tratamiento', id, data),
  deleteTratamiento: (id) => ipcRenderer.invoke('delete-tratamiento', id),
  getTratamientosCita: (idCita) => ipcRenderer.invoke('get-tratamientos-cita', idCita),
  addTratamientoCita: (data) => ipcRenderer.invoke('add-tratamiento-cita', data),
  deleteTratamientoCita: (id) => ipcRenderer.invoke('delete-tratamiento-cita', id),

  // Facturas y Pagos
  getFacturas: (filtros) => ipcRenderer.invoke('get-facturas', filtros),
  getFactura: (id) => ipcRenderer.invoke('get-factura', id),
  crearFactura: (data) => ipcRenderer.invoke('crear-factura', data),
  crearFacturaDirecta: (data) => ipcRenderer.invoke('crear-factura-directa', data),
  crearFacturaDesdeCita: (idCita) => ipcRenderer.invoke('crear-factura-desde-cita', idCita),
  getPagosFactura: (idFactura) => ipcRenderer.invoke('get-pagos-factura', idFactura),
  addPago: (data) => ipcRenderer.invoke('add-pago', data),
  updatePago: (id, data) => ipcRenderer.invoke('update-pago', id, data),
  deletePago: (id) => ipcRenderer.invoke('delete-pago', id),

  // Relaciones entre entidades
  getRelaciones: () => ipcRenderer.invoke('get-relaciones'),
  getRelacionesEntidad: (entidad) => ipcRenderer.invoke('get-relaciones-entidad', entidad),
  addRelacion: (data) => ipcRenderer.invoke('add-relacion', data),
  updateRelacion: (id, data) => ipcRenderer.invoke('update-relacion', id, data),
  deleteRelacion: (id) => ipcRenderer.invoke('delete-relacion', id),

  // Recordatorios
  getRecordatorios: (filtros) => ipcRenderer.invoke('get-recordatorios', filtros),
  getRecordatoriosNoVistos: () => ipcRenderer.invoke('get-recordatorios-no-vistos'),
  addRecordatorio: (data) => ipcRenderer.invoke('add-recordatorio', data),
  marcarRecordatorioVisto: (id) => ipcRenderer.invoke('marcar-recordatorio-visto', id),
  deleteRecordatorio: (id) => ipcRenderer.invoke('delete-recordatorio', id),
  generarRecordatoriosCitas: () => ipcRenderer.invoke('generar-recordatorios-citas'),
  generarRecordatoriosPagos: () => ipcRenderer.invoke('generar-recordatorios-pagos'),

  // Movimientos de Inventario
  getMovimientosProducto: (idProducto, filtros) => ipcRenderer.invoke('get-movimientos-producto', idProducto, filtros),
  getMovimientos: (filtros) => ipcRenderer.invoke('get-movimientos', filtros),
  addMovimientoInventario: (data) => ipcRenderer.invoke('add-movimiento-inventario', data),
  getProductosStockBajo: () => ipcRenderer.invoke('get-productos-stock-bajo'),

  // Planes de Tratamiento
  getPlanesPaciente: (idPaciente) => ipcRenderer.invoke('get-planes-paciente', idPaciente),
  getPlan: (id) => ipcRenderer.invoke('get-plan', id),
  addPlanTratamiento: (data) => ipcRenderer.invoke('add-plan-tratamiento', data),
  addCitaPlan: (data) => ipcRenderer.invoke('add-cita-plan', data),
  marcarCitaPlanCompletada: (id) => ipcRenderer.invoke('marcar-cita-plan-completada', id),
  updatePlanTratamiento: (id, data) => ipcRenderer.invoke('update-plan-tratamiento', id, data),
  deletePlanTratamiento: (id) => ipcRenderer.invoke('delete-plan-tratamiento', id),

  // Prescripciones
  getPrescripcionesPaciente: (idPaciente, soloActivas) => ipcRenderer.invoke('get-prescripciones-paciente', idPaciente, soloActivas),
  getPrescripcion: (id) => ipcRenderer.invoke('get-prescripcion', id),
  addPrescripcion: (data) => ipcRenderer.invoke('add-prescripcion', data),
  updatePrescripcion: (id, data) => ipcRenderer.invoke('update-prescripcion', id, data),
  deletePrescripcion: (id) => ipcRenderer.invoke('delete-prescripcion', id),

  // Archivos
  getArchivosHistorial: (idHistorial) => ipcRenderer.invoke('get-archivos-historial', idHistorial),
  getArchivo: (id) => ipcRenderer.invoke('get-archivo', id),
  addArchivoHistorial: (data) => ipcRenderer.invoke('add-archivo-historial', data),
  deleteArchivoHistorial: (id) => ipcRenderer.invoke('delete-archivo-historial', id),
  getRutaArchivo: (id) => ipcRenderer.invoke('get-ruta-archivo', id),

  // Usuarios y Permisos
  getUsuarios: () => ipcRenderer.invoke('get-usuarios'),
  getUsuario: (id) => ipcRenderer.invoke('get-usuario', id),
  login: (username, password) => ipcRenderer.invoke('login', username, password),
  addUsuario: (data) => ipcRenderer.invoke('add-usuario', data),
  updateUsuario: (id, data) => ipcRenderer.invoke('update-usuario', id, data),
  deleteUsuario: (id) => ipcRenderer.invoke('delete-usuario', id),
  getPermisosRol: (rol) => ipcRenderer.invoke('get-permisos-rol', rol),
  verificarPermiso: (rol, modulo, permiso) => ipcRenderer.invoke('verificar-permiso', rol, modulo, permiso),

  // Promociones y Cupones
  getPromociones: (soloActivas) => ipcRenderer.invoke('get-promociones', soloActivas),
  getPromocion: (id) => ipcRenderer.invoke('get-promocion', id),
  addPromocion: (data) => ipcRenderer.invoke('add-promocion', data),
  updatePromocion: (id, data) => ipcRenderer.invoke('update-promocion', id, data),
  deletePromocion: (id) => ipcRenderer.invoke('delete-promocion', id),
  getCupones: (soloActivos) => ipcRenderer.invoke('get-cupones', soloActivos),
  validarCupon: (codigo) => ipcRenderer.invoke('validar-cupon', codigo),
  usarCupon: (codigo) => ipcRenderer.invoke('usar-cupon', codigo),
  addCupon: (data) => ipcRenderer.invoke('add-cupon', data),
  deleteCupon: (id) => ipcRenderer.invoke('delete-cupon', id),

  // Backups y Exportación
  crearBackup: (nombre, descripcion) => ipcRenderer.invoke('crear-backup', nombre, descripcion),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  restaurarBackup: (id) => ipcRenderer.invoke('restaurar-backup', id),
  deleteBackup: (id) => ipcRenderer.invoke('delete-backup', id),
  exportarCSV: (tabla, rutaDestino) => ipcRenderer.invoke('exportar-csv', tabla, rutaDestino),
});


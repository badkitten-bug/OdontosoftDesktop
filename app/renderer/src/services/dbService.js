/**
 * Servicio para comunicación con el backend Electron a través de IPC
 */

// Verificar que electronAPI está disponible
if (!window.electronAPI) {
  console.warn('electronAPI no está disponible. Asegúrate de ejecutar la app en Electron.');
}

// Pacientes
export const getPacientes = () => window.electronAPI?.getPacientes() || Promise.resolve([]);
export const getPaciente = (id) => window.electronAPI?.getPaciente(id) || Promise.resolve(null);
export const addPaciente = (data) => window.electronAPI?.addPaciente(data) || Promise.resolve({});
export const updatePaciente = (id, data) => window.electronAPI?.updatePaciente(id, data) || Promise.resolve({});
export const deletePaciente = (id) => window.electronAPI?.deletePaciente(id) || Promise.resolve({});

// Productos
export const getProductos = () => window.electronAPI?.getProductos() || Promise.resolve([]);
export const getProducto = (id) => window.electronAPI?.getProducto(id) || Promise.resolve(null);
export const addProducto = (data) => window.electronAPI?.addProducto(data) || Promise.resolve({});
export const updateProducto = (id, data) => window.electronAPI?.updateProducto(id, data) || Promise.resolve({});
export const deleteProducto = (id) => window.electronAPI?.deleteProducto(id) || Promise.resolve({});

// Configuración (Campos dinámicos)
export const getCamposDinamicos = (entidad) => 
  window.electronAPI?.getCamposDinamicos(entidad) || Promise.resolve([]);
export const addCampoDinamico = (data) => 
  window.electronAPI?.addCampoDinamico(data) || Promise.resolve({});
export const updateCampoDinamico = (id, data) => 
  window.electronAPI?.updateCampoDinamico(id, data) || Promise.resolve({});
export const deleteCampoDinamico = (id) => 
  window.electronAPI?.deleteCampoDinamico(id) || Promise.resolve({});
export const updateOrdenCampos = (campos) => 
  window.electronAPI?.updateOrdenCampos(campos) || Promise.resolve({});
export const initCamposBase = (entidad) => 
  window.electronAPI?.initCamposBase(entidad) || Promise.resolve({});

// Relaciones entre entidades
export const getRelaciones = () => window.electronAPI?.getRelaciones() || Promise.resolve([]);
export const getRelacionesEntidad = (entidad) => 
  window.electronAPI?.getRelacionesEntidad(entidad) || Promise.resolve([]);
export const addRelacion = (data) => window.electronAPI?.addRelacion(data) || Promise.resolve({});
export const updateRelacion = (id, data) => 
  window.electronAPI?.updateRelacion(id, data) || Promise.resolve({});
export const deleteRelacion = (id) => window.electronAPI?.deleteRelacion(id) || Promise.resolve({});

// Historial
export const getHistorial = (idPaciente) => 
  window.electronAPI?.getHistorial(idPaciente) || Promise.resolve([]);
export const addHistorial = (data) => 
  window.electronAPI?.addHistorial(data) || Promise.resolve({});
export const deleteHistorial = (id) => 
  window.electronAPI?.deleteHistorial(id) || Promise.resolve({});

// Odontólogos
export const getOdontologos = () => window.electronAPI?.getOdontologos() || Promise.resolve([]);
export const getOdontologosActivos = () => window.electronAPI?.getOdontologosActivos() || Promise.resolve([]);
export const getOdontologo = (id) => window.electronAPI?.getOdontologo(id) || Promise.resolve(null);
export const addOdontologo = (data) => window.electronAPI?.addOdontologo(data) || Promise.resolve({});
export const updateOdontologo = (id, data) => window.electronAPI?.updateOdontologo(id, data) || Promise.resolve({});
export const deleteOdontologo = (id) => window.electronAPI?.deleteOdontologo(id) || Promise.resolve({});

// Horarios
export const getHorarios = (idOdontologo) => window.electronAPI?.getHorarios(idOdontologo) || Promise.resolve([]);
export const getHorariosActivos = (idOdontologo) => window.electronAPI?.getHorariosActivos(idOdontologo) || Promise.resolve([]);
export const addHorario = (data) => window.electronAPI?.addHorario(data) || Promise.resolve({});
export const updateHorario = (id, data) => window.electronAPI?.updateHorario(id, data) || Promise.resolve({});
export const deleteHorario = (id) => window.electronAPI?.deleteHorario(id) || Promise.resolve({});
export const verificarDisponibilidad = (idOdontologo, fecha, horaInicio, horaFin) =>
  window.electronAPI?.verificarDisponibilidad(idOdontologo, fecha, horaInicio, horaFin) || Promise.resolve({ disponible: false });

// Citas
export const getCitas = (filtros) => window.electronAPI?.getCitas(filtros) || Promise.resolve([]);
export const getCita = (id) => window.electronAPI?.getCita(id) || Promise.resolve(null);
export const getCitasPorFecha = (fecha) => window.electronAPI?.getCitasPorFecha(fecha) || Promise.resolve([]);
export const addCita = (data) => window.electronAPI?.addCita(data) || Promise.resolve({});
export const updateCita = (id, data) => window.electronAPI?.updateCita(id, data) || Promise.resolve({});
export const deleteCita = (id) => window.electronAPI?.deleteCita(id) || Promise.resolve({});

// Tratamientos
export const getTratamientosPopulares = (filtros = {}) => window.electronAPI?.getTratamientosPopulares(filtros) || Promise.resolve([]);
export const getTratamientos = () => window.electronAPI?.getTratamientos() || Promise.resolve([]);
export const getTratamientosActivos = () => window.electronAPI?.getTratamientosActivos() || Promise.resolve([]);
export const getTratamiento = (id) => window.electronAPI?.getTratamiento(id) || Promise.resolve(null);
export const addTratamiento = (data) => window.electronAPI?.addTratamiento(data) || Promise.resolve({});
export const updateTratamiento = (id, data) => window.electronAPI?.updateTratamiento(id, data) || Promise.resolve({});
export const deleteTratamiento = (id) => window.electronAPI?.deleteTratamiento(id) || Promise.resolve({});
export const getTratamientosCita = (idCita) => window.electronAPI?.getTratamientosCita(idCita) || Promise.resolve([]);
export const addTratamientoCita = (data) => window.electronAPI?.addTratamientoCita(data) || Promise.resolve({});
export const deleteTratamientoCita = (id) => window.electronAPI?.deleteTratamientoCita(id) || Promise.resolve({});

// Facturas y Pagos
export const getFacturas = (filtros) => {
  if (!window.electronAPI?.getFacturas) {
    console.error('electronAPI.getFacturas no está disponible');
    return Promise.resolve([]);
  }
  return window.electronAPI.getFacturas(filtros);
};
export const getFactura = (id) => {
  if (!window.electronAPI?.getFactura) {
    console.error('electronAPI.getFactura no está disponible');
    return Promise.resolve(null);
  }
  return window.electronAPI.getFactura(id);
};
export const crearFactura = (data) => {
  if (!window.electronAPI?.crearFactura) {
    console.error('electronAPI.crearFactura no está disponible. Verifica que el preload.js esté cargado correctamente.');
    return Promise.reject(new Error('electronAPI.crearFactura no está disponible. Por favor, reinicia la aplicación.'));
  }
  return window.electronAPI.crearFactura(data);
};
export const crearFacturaDesdeCita = (idCita) => {
  if (!window.electronAPI?.crearFacturaDesdeCita) {
    console.error('electronAPI.crearFacturaDesdeCita no está disponible');
    return Promise.reject(new Error('electronAPI.crearFacturaDesdeCita no está disponible'));
  }
  return window.electronAPI.crearFacturaDesdeCita(idCita);
};
export const getPagosFactura = (idFactura) => {
  if (!window.electronAPI?.getPagosFactura) {
    console.error('electronAPI.getPagosFactura no está disponible');
    return Promise.resolve([]);
  }
  return window.electronAPI.getPagosFactura(idFactura);
};
export const addPago = (data) => {
  if (!window.electronAPI?.addPago) {
    console.error('electronAPI.addPago no está disponible');
    return Promise.reject(new Error('electronAPI.addPago no está disponible'));
  }
  return window.electronAPI.addPago(data);
};
export const updatePago = (id, data) => {
  if (!window.electronAPI?.updatePago) {
    console.error('electronAPI.updatePago no está disponible');
    return Promise.reject(new Error('electronAPI.updatePago no está disponible'));
  }
  return window.electronAPI.updatePago(id, data);
};
export const deletePago = (id) => {
  if (!window.electronAPI?.deletePago) {
    console.error('electronAPI.deletePago no está disponible');
    return Promise.reject(new Error('electronAPI.deletePago no está disponible'));
  }
  return window.electronAPI.deletePago(id);
};
export const crearFacturaDirecta = (data) => window.electronAPI?.crearFacturaDirecta(data) || Promise.resolve({});

// Recordatorios
export const getRecordatorios = (filtros) => window.electronAPI?.getRecordatorios(filtros) || Promise.resolve([]);
export const getRecordatoriosNoVistos = () => window.electronAPI?.getRecordatoriosNoVistos() || Promise.resolve([]);
export const addRecordatorio = (data) => window.electronAPI?.addRecordatorio(data) || Promise.resolve({});
export const marcarRecordatorioVisto = (id) => window.electronAPI?.marcarRecordatorioVisto(id) || Promise.resolve({});
export const deleteRecordatorio = (id) => window.electronAPI?.deleteRecordatorio(id) || Promise.resolve({});
export const generarRecordatoriosCitas = () => window.electronAPI?.generarRecordatoriosCitas() || Promise.resolve({});
export const generarRecordatoriosPagos = () => window.electronAPI?.generarRecordatoriosPagos() || Promise.resolve({});

// Movimientos de Inventario
export const getMovimientosProducto = (idProducto, filtros) => window.electronAPI?.getMovimientosProducto(idProducto, filtros) || Promise.resolve([]);
export const getMovimientos = (filtros) => window.electronAPI?.getMovimientos(filtros) || Promise.resolve([]);
export const addMovimientoInventario = (data) => window.electronAPI?.addMovimientoInventario(data) || Promise.resolve({});
export const getProductosStockBajo = () => window.electronAPI?.getProductosStockBajo() || Promise.resolve([]);

// Planes de Tratamiento
export const getTodosPlanes = () => window.electronAPI?.getTodosPlanes() || Promise.resolve([]);
export const getPlanesPaciente = (idPaciente) => window.electronAPI?.getPlanesPaciente(idPaciente) || Promise.resolve([]);
export const getPlan = (id) => window.electronAPI?.getPlan(id) || Promise.resolve(null);
export const addPlanTratamiento = (data) => window.electronAPI?.addPlanTratamiento(data) || Promise.resolve({});
export const addCitaPlan = (data) => window.electronAPI?.addCitaPlan(data) || Promise.resolve({});
export const marcarCitaPlanCompletada = (id) => window.electronAPI?.marcarCitaPlanCompletada(id) || Promise.resolve({});
export const updatePlanTratamiento = (id, data) => window.electronAPI?.updatePlanTratamiento(id, data) || Promise.resolve({});
export const deletePlanTratamiento = (id) => window.electronAPI?.deletePlanTratamiento(id) || Promise.resolve({});

// Prescripciones
export const getPrescripcionesPaciente = (idPaciente, soloActivas) => window.electronAPI?.getPrescripcionesPaciente(idPaciente, soloActivas) || Promise.resolve([]);
export const getPrescripcion = (id) => window.electronAPI?.getPrescripcion(id) || Promise.resolve(null);
export const addPrescripcion = (data) => window.electronAPI?.addPrescripcion(data) || Promise.resolve({});
export const updatePrescripcion = (id, data) => window.electronAPI?.updatePrescripcion(id, data) || Promise.resolve({});
export const deletePrescripcion = (id) => window.electronAPI?.deletePrescripcion(id) || Promise.resolve({});

// Archivos
export const getArchivosHistorial = (idHistorial) => window.electronAPI?.getArchivosHistorial(idHistorial) || Promise.resolve([]);
export const getArchivo = (id) => window.electronAPI?.getArchivo(id) || Promise.resolve(null);
export const addArchivoHistorial = (data) => window.electronAPI?.addArchivoHistorial(data) || Promise.resolve({});
export const deleteArchivoHistorial = (id) => window.electronAPI?.deleteArchivoHistorial(id) || Promise.resolve({});
export const getRutaArchivo = (id) => window.electronAPI?.getRutaArchivo(id) || Promise.resolve(null);

// Sesión
export const setSessionId = (id) => window.electronAPI?.setSessionId(id);
export const clearSessionId = () => window.electronAPI?.clearSessionId();
export const whoami = () => window.electronAPI?.whoami() || Promise.resolve({ autenticado: false });
export const existenUsuarios = () => window.electronAPI?.existenUsuarios() || Promise.resolve({ existen: false, total: 0 });
export const getUsuariosPublicos = () => window.electronAPI?.getUsuariosPublicos() || Promise.resolve({ ok: false, usuarios: [] });
export const getOnboardingStatus = () => window.electronAPI?.getOnboardingStatus() || Promise.resolve(null);
export const crearPrimerAdmin = (data) => window.electronAPI?.crearPrimerAdmin(data) || Promise.resolve({ success: false });
export const recuperarPassword = (data) => window.electronAPI?.recuperarPassword(data) || Promise.resolve({ success: false });
export const logout = () => window.electronAPI?.logout() || Promise.resolve({ success: true });

// Usuarios y Permisos
export const getUsuarios = () => window.electronAPI?.getUsuarios() || Promise.resolve([]);
export const getUsuario = (id) => window.electronAPI?.getUsuario(id) || Promise.resolve(null);
export const login = (username, password) => window.electronAPI?.login(username, password) || Promise.resolve({ success: false });
export const addUsuario = (data) => window.electronAPI?.addUsuario(data) || Promise.resolve({});
export const updateUsuario = (id, data) => window.electronAPI?.updateUsuario(id, data) || Promise.resolve({});
export const deleteUsuario = (id) => window.electronAPI?.deleteUsuario(id) || Promise.resolve({});
export const getPermisosRol = (rol) => window.electronAPI?.getPermisosRol(rol) || Promise.resolve([]);
export const verificarPermiso = (rol, modulo, permiso) => window.electronAPI?.verificarPermiso(rol, modulo, permiso) || Promise.resolve({ tienePermiso: false });

// Promociones y Cupones
export const getPromociones = (soloActivas) => window.electronAPI?.getPromociones(soloActivas) || Promise.resolve([]);
export const getPromocion = (id) => window.electronAPI?.getPromocion(id) || Promise.resolve(null);
export const addPromocion = (data) => window.electronAPI?.addPromocion(data) || Promise.resolve({});
export const updatePromocion = (id, data) => window.electronAPI?.updatePromocion(id, data) || Promise.resolve({});
export const deletePromocion = (id) => window.electronAPI?.deletePromocion(id) || Promise.resolve({});
export const getCupones = (soloActivos) => window.electronAPI?.getCupones(soloActivos) || Promise.resolve([]);
export const validarCupon = (codigo) => window.electronAPI?.validarCupon(codigo) || Promise.resolve({ valido: false });
export const usarCupon = (codigo) => window.electronAPI?.usarCupon(codigo) || Promise.resolve({});
export const addCupon = (data) => window.electronAPI?.addCupon(data) || Promise.resolve({});
export const deleteCupon = (id) => window.electronAPI?.deleteCupon(id) || Promise.resolve({});

// Backups y Exportación
export const crearBackup = (nombre, descripcion) => window.electronAPI?.crearBackup(nombre, descripcion) || Promise.resolve({});
export const getBackups = () => window.electronAPI?.getBackups() || Promise.resolve([]);
export const restaurarBackup = (id) => window.electronAPI?.restaurarBackup(id) || Promise.resolve({});
export const deleteBackup = (id) => window.electronAPI?.deleteBackup(id) || Promise.resolve({});
export const exportarCSV = (tabla, rutaDestino) => window.electronAPI?.exportarCSV(tabla, rutaDestino) || Promise.resolve({});

// Configuración de la clínica
export const getConfiguracionClinica = () => window.electronAPI?.getConfiguracionClinica() || Promise.resolve(null);
export const setConfiguracionClinica = (data) => window.electronAPI?.setConfiguracionClinica(data) || Promise.resolve({});
export const marcarSetupCompletado = () => window.electronAPI?.marcarSetupCompletado() || Promise.resolve({});
export const getEstadoSetup = () => window.electronAPI?.getEstadoSetup() || Promise.resolve({ setupCompletado: false });

// Licencia
export const getLicencia = () => window.electronAPI?.getLicencia() || Promise.resolve({ tipo: 'demo' });
export const activarLicencia = (clave) => window.electronAPI?.activarLicencia(clave) || Promise.resolve({ success: false });
export const desactivarLicencia = () => window.electronAPI?.desactivarLicencia() || Promise.resolve({ success: false });

// Diagnóstico y actualizaciones
export const exportarDiagnostico = () => window.electronAPI?.exportarDiagnostico() || Promise.resolve({ success: false });
export const buscarActualizaciones = () => window.electronAPI?.buscarActualizaciones() || Promise.resolve({ success: false });
export const instalarActualizacion = () => window.electronAPI?.instalarActualizacion() || Promise.resolve({ success: false });
export const onUpdateStatus = (cb) => window.electronAPI?.onUpdateStatus?.(cb) || (() => {});


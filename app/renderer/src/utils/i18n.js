// Sistema básico de internacionalización

const translations = {
  es: {
    // General
    'app.name': 'OdontoSoft',
    'app.welcome': 'Bienvenido',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.export': 'Exportar',
    'common.print': 'Imprimir',
    'common.close': 'Cerrar',
    'common.actions': 'Acciones',
    'common.loading': 'Cargando...',
    'common.noData': 'No hay datos',
    
    // Módulos
    'module.dashboard': 'Dashboard',
    'module.patients': 'Pacientes',
    'module.appointments': 'Citas',
    'module.invoices': 'Facturación',
    'module.clinicalHistory': 'Historias Clínicas',
    'module.treatments': 'Tratamientos',
    'module.prescriptions': 'Prescripciones',
    'module.warehouse': 'Almacén',
    'module.reports': 'Reportes',
    
    // Pacientes
    'patient.name': 'Nombre',
    'patient.dni': 'DNI',
    'patient.phone': 'Teléfono',
    'patient.new': 'Nuevo Paciente',
    'patient.edit': 'Editar Paciente',
    'patient.delete': 'Eliminar Paciente',
    
    // Citas
    'appointment.new': 'Nueva Cita',
    'appointment.edit': 'Editar Cita',
    'appointment.patient': 'Paciente',
    'appointment.dentist': 'Odontólogo',
    'appointment.date': 'Fecha',
    'appointment.time': 'Hora',
    'appointment.status': 'Estado',
    
    // Facturación
    'invoice.number': 'Número',
    'invoice.total': 'Total',
    'invoice.status': 'Estado',
    'invoice.paid': 'Pagada',
    'invoice.pending': 'Pendiente',
    
    // Validaciones
    'validation.required': 'Este campo es requerido',
    'validation.dni.unique': 'Ya existe un paciente con este DNI',
    'validation.time.overlap': 'El horario se solapa con otra cita',
    'validation.time.invalid': 'La hora de fin debe ser mayor que la hora de inicio',
    
    // Mensajes
    'message.success.save': 'Guardado exitosamente',
    'message.success.delete': 'Eliminado exitosamente',
    'message.error.save': 'Error al guardar',
    'message.error.delete': 'Error al eliminar',
    'message.confirm.delete': '¿Estás seguro de eliminar este elemento?',
  },
  en: {
    // General
    'app.name': 'OdontoSoft',
    'app.welcome': 'Welcome',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.export': 'Export',
    'common.print': 'Print',
    'common.close': 'Close',
    'common.actions': 'Actions',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    
    // Módulos
    'module.dashboard': 'Dashboard',
    'module.patients': 'Patients',
    'module.appointments': 'Appointments',
    'module.invoices': 'Invoicing',
    'module.clinicalHistory': 'Clinical History',
    'module.treatments': 'Treatments',
    'module.prescriptions': 'Prescriptions',
    'module.warehouse': 'Warehouse',
    'module.reports': 'Reports',
    
    // Pacientes
    'patient.name': 'Name',
    'patient.dni': 'ID',
    'patient.phone': 'Phone',
    'patient.new': 'New Patient',
    'patient.edit': 'Edit Patient',
    'patient.delete': 'Delete Patient',
    
    // Citas
    'appointment.new': 'New Appointment',
    'appointment.edit': 'Edit Appointment',
    'appointment.patient': 'Patient',
    'appointment.dentist': 'Dentist',
    'appointment.date': 'Date',
    'appointment.time': 'Time',
    'appointment.status': 'Status',
    
    // Facturación
    'invoice.number': 'Number',
    'invoice.total': 'Total',
    'invoice.status': 'Status',
    'invoice.paid': 'Paid',
    'invoice.pending': 'Pending',
    
    // Validaciones
    'validation.required': 'This field is required',
    'validation.dni.unique': 'A patient with this ID already exists',
    'validation.time.overlap': 'The time slot overlaps with another appointment',
    'validation.time.invalid': 'End time must be greater than start time',
    
    // Mensajes
    'message.success.save': 'Saved successfully',
    'message.success.delete': 'Deleted successfully',
    'message.error.save': 'Error saving',
    'message.error.delete': 'Error deleting',
    'message.confirm.delete': 'Are you sure you want to delete this item?',
  },
};

let currentLanguage = localStorage.getItem('language') || 'es';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, params = {}) {
  const translation = translations[currentLanguage]?.[key] || translations['es'][key] || key;
  
  // Reemplazar parámetros si existen
  return translation.replace(/\{(\w+)\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

export default { setLanguage, getLanguage, t };


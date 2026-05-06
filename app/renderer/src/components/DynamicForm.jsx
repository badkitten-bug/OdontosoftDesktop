import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { getCamposDinamicos } from '../services/dbService';

/**
 * Componente de formulario dinámico que genera campos basados en la configuración
 */
function DynamicForm({ entidad, formData, onChange, camposBase = [], camposDinamicosProp = null, skipLoad = false }) {
  const [camposDinamicos, setCamposDinamicos] = useState([]);
  const [loading, setLoading] = useState(!skipLoad);

  const loadCampos = useCallback(async () => {
    try {
      const campos = await getCamposDinamicos(entidad);
      setCamposDinamicos(campos);
    } catch (error) {
      console.error('Error al cargar campos dinámicos:', error);
    } finally {
      setLoading(false);
    }
  }, [entidad]);

  useEffect(() => {
    // Si se pasan campos como prop (para preview), usarlos directamente
    if (camposDinamicosProp !== null) {
      setCamposDinamicos(camposDinamicosProp);
      setLoading(false);
      return;
    }
    
    // Si skipLoad es true, no cargar desde la base de datos
    if (skipLoad) {
      setLoading(false);
      return;
    }
    
    // Cargar desde la base de datos normalmente
    loadCampos();
  }, [camposDinamicosProp, skipLoad, loadCampos]);

  const handleChange = (name, value) => {
    onChange({
      ...formData,
      [name]: value,
    });
  };

  const renderField = (campo, fieldId) => {
    // Normalizar campos base y dinámicos
    // Usar 'name' para la clave del formData y 'nombre_campo' solo para el label
    // Si no hay 'name', generar uno a partir de 'nombre_campo' normalizado
    let keyCampo = campo.name;
    if (!keyCampo && campo.nombre_campo) {
      keyCampo = campo.nombre_campo.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Eliminar caracteres especiales
    }
    if (!keyCampo) {
      keyCampo = campo.nombre_campo || campo.name; // Fallback
    }
    const labelCampo = campo.nombre_campo || campo.name; // Label para mostrar
    const tipoCampo = campo.tipo || 'text';
    const esRequerido = campo.requerido === 1 || campo.required;
    const value = formData[keyCampo] || '';

    switch (tipoCampo) {
      case 'text':
        return (
          <input
            id={fieldId}
            type="text"
            className="input input-bordered w-full"
            placeholder={labelCampo}
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          />
        );
      
      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            className="input input-bordered w-full"
            placeholder={labelCampo}
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          />
        );
      
      case 'email':
        return (
          <input
            id={fieldId}
            type="email"
            className="input input-bordered w-full"
            placeholder={labelCampo}
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          />
        );
      
      case 'date':
        return (
          <input
            id={fieldId}
            type="date"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={fieldId}
            className="textarea textarea-bordered w-full"
            placeholder={labelCampo}
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
            rows={3}
          />
        );
      
      case 'select':
        // Parsear opciones del campo
        let opciones = [];
        try {
          if (campo.opciones) {
            opciones = typeof campo.opciones === 'string' 
              ? JSON.parse(campo.opciones) 
              : campo.opciones;
          }
        } catch (e) {
          console.error('Error al parsear opciones del select:', e);
          opciones = [];
        }
        
        return (
          <select
            id={fieldId}
            className="select select-bordered w-full"
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          >
            <option value="">-- Selecciona una opción --</option>
            {opciones.map((opcion, index) => (
              <option key={index} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            id={fieldId}
            type="text"
            className="input input-bordered w-full"
            placeholder={labelCampo}
            value={value}
            onChange={(e) => handleChange(keyCampo, e.target.value)}
            required={esRequerido}
          />
        );
    }
  };

  if (loading) {
    return <div className="text-center py-4">Cargando campos...</div>;
  }

  // Ordenar campos dinámicos por orden
  const camposDinamicosOrdenados = [...camposDinamicos].sort((a, b) => {
    const ordenA = a.orden || 0;
    const ordenB = b.orden || 0;
    if (ordenA !== ordenB) return ordenA - ordenB;
    // Si tienen el mismo orden, ordenar alfabéticamente
    return (a.nombre_campo || '').localeCompare(b.nombre_campo || '');
  });

  // Usar todos los campos de la base de datos (base + dinámicos) ordenados
  // Si no hay campos en la base de datos, usar los campos base hardcodeados como fallback
  const todosLosCampos = camposDinamicosOrdenados.length > 0 
    ? camposDinamicosOrdenados 
    : camposBase;

  // Función para obtener el icono de lucide-react
  const getIcon = (iconName) => {
    if (!iconName) return null;
    try {
      // eslint-disable-next-line import/namespace
      const IconComponent = LucideIcons[iconName] || LucideIcons[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
      return IconComponent ? <IconComponent size={18} className="text-gray-500" /> : null;
    } catch {
      return null;
    }
  };

  // Organizar campos en filas según su ancho
  const organizarCamposEnFilas = (campos) => {
    const filas = [];
    let filaActual = [];
    let anchoActual = 0;

    campos.forEach((campo) => {
      const anchoCampo = campo.ancho || 100;
      
      // Si el campo ocupa 100% o no cabe en la fila actual, crear nueva fila
      if (anchoCampo === 100 || anchoActual + anchoCampo > 100) {
        if (filaActual.length > 0) {
          filas.push(filaActual);
        }
        filaActual = [campo];
        anchoActual = anchoCampo;
      } else {
        filaActual.push(campo);
        anchoActual += anchoCampo;
      }
    });

    // Agregar la última fila
    if (filaActual.length > 0) {
      filas.push(filaActual);
    }

    return filas;
  };

  const filasDeCampos = organizarCamposEnFilas(todosLosCampos);

  return (
    <div className="space-y-4">
      {filasDeCampos.map((fila) => {
        // Crear una clave única para la fila basada en los IDs de los campos
        const filaKey = fila.map(c => c.id || c.name || c.nombre_campo).join('-');
        return (
        <div key={`fila-${filaKey}`} className="grid grid-cols-12 gap-4">
          {fila.map((campo) => {
            // Usar 'name' para la clave del formData y 'nombre_campo' solo para el label
            // Si no hay 'name', generar uno a partir de 'nombre_campo' normalizado
            let keyCampo = campo.name;
            if (!keyCampo && campo.nombre_campo) {
              keyCampo = campo.nombre_campo.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
                .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
                .replace(/[^a-z0-9_]/g, ''); // Eliminar caracteres especiales
            }
            if (!keyCampo) {
              keyCampo = campo.nombre_campo || campo.name; // Fallback
            }
            const labelCampo = campo.nombre_campo || campo.name; // Label para mostrar
            const esRequerido = campo.requerido === 1 || campo.required;
            const anchoCampo = campo.ancho || 100;
            const iconoCampo = campo.icono || '';
            
            // Calcular clases de columna del grid (12 columnas totales)
            let colClass = 'col-span-12'; // Por defecto 100%
            if (anchoCampo === 50) colClass = 'col-span-6'; // 50% = 6/12
            else if (anchoCampo === 33) colClass = 'col-span-4'; // 33% ≈ 4/12
            else if (anchoCampo === 25) colClass = 'col-span-3'; // 25% = 3/12
            else if (anchoCampo === 100) colClass = 'col-span-12'; // 100% = 12/12
            else {
              // Para otros valores, usar estilo inline
              const columnas = Math.round((anchoCampo / 100) * 12);
              colClass = `col-span-${columnas}`;
            }
            
            const fieldId = `field-${keyCampo}`;
            return (
              <div 
                key={keyCampo} 
                className={`${colClass} form-control`}
                style={anchoCampo !== 50 && anchoCampo !== 33 && anchoCampo !== 25 && anchoCampo !== 100 
                  ? { gridColumn: `span ${Math.round((anchoCampo / 100) * 12)}` }
                  : {}
                }
              >
                <label htmlFor={fieldId} className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    {getIcon(iconoCampo)}
                    {labelCampo}
                    {esRequerido && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>
                <div>
                  {renderField({ ...campo, name: keyCampo, nombre_campo: labelCampo }, fieldId)}
                </div>
              </div>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}

export default DynamicForm;


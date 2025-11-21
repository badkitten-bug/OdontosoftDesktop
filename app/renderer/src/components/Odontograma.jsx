import { useState, useCallback, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

/**
 * Componente de Odontograma interactivo según normas del Colegio Odontológico del Perú
 * Numeración FDI: 11-18, 21-28, 31-38, 41-48 (adultos)
 *                 51-55, 61-65, 71-75, 81-85 (deciduos)
 */

// Numeración de dientes según FDI
const DIENTES_ADULTOS = {
  superior_derecho: [18, 17, 16, 15, 14, 13, 12, 11],
  superior_izquierdo: [21, 22, 23, 24, 25, 26, 27, 28],
  inferior_izquierdo: [31, 32, 33, 34, 35, 36, 37, 38],
  inferior_derecho: [48, 47, 46, 45, 44, 43, 42, 41],
};

const DIENTES_DECIDUOS = {
  superior_derecho: [55, 54, 53, 52, 51],
  superior_izquierdo: [61, 62, 63, 64, 65],
  inferior_izquierdo: [71, 72, 73, 74, 75],
  inferior_derecho: [85, 84, 83, 82, 81],
};

// Herramientas de marcado disponibles
const HERRAMIENTAS = [
  { id: 'caries', label: 'Caries', color: 'red', icon: '●' },
  { id: 'restauracion', label: 'Restauración', color: 'blue', icon: '■' },
  { id: 'restauracion_temporal', label: 'Rest. Temporal', color: 'red', icon: '□' },
  { id: 'ausente', label: 'Ausente', color: 'black', icon: '✕' },
  { id: 'no_erupcionado', label: 'No Erupcionado', color: 'blue', icon: '○' },
  { id: 'tratamiento_pulpar', label: 'Trat. Pulpar', color: 'blue', icon: '|' },
  { id: 'remanente_radicular', label: 'Remanente Rad.', color: 'red', icon: 'RR' },
  { id: 'semi_impactacion', label: 'Semi-Impactación', color: 'blue', icon: 'SI' },
  { id: 'supernumerario', label: 'Supernumerario', color: 'blue', icon: 'S' },
  { id: 'transposicion', label: 'Transposición', color: 'blue', icon: '⇄' },
];

function Odontograma({ data = null, onChange, readOnly = false }) {
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState('caries');
  const [tipoDenticion, setTipoDenticion] = useState('adulto'); // 'adulto' o 'deciduo'
  const [dientesData, setDientesData] = useState(data || {});
  const [transposicionPrimerDiente, setTransposicionPrimerDiente] = useState(null); // Para transposición

  // Actualizar cuando cambia data externa
  useEffect(() => {
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      setDientesData(data);
    } else if (data === null || (typeof data === 'object' && Object.keys(data).length === 0)) {
      setDientesData({});
    }
  }, [data]);

  // Reset transposición si cambia la herramienta
  useEffect(() => {
    if (herramientaSeleccionada !== 'transposicion') {
      setTransposicionPrimerDiente(null);
    }
  }, [herramientaSeleccionada]);

  const handleDienteClick = useCallback((numeroDiente, superficie) => {
    if (readOnly) return;

    const dienteKey = `diente_${numeroDiente}`;
    const dienteActual = dientesData[dienteKey] || {};

    let nuevoEstado = { ...dienteActual };
    
    // Si es transposición y ya hay un primer diente seleccionado, manejar aquí
    if (herramientaSeleccionada === 'transposicion') {
      if (transposicionPrimerDiente === null) {
        // Primer diente seleccionado
        setTransposicionPrimerDiente(numeroDiente);
        return; // No actualizar aún, esperar segundo diente
      } else if (transposicionPrimerDiente === numeroDiente) {
        // Click en el mismo diente, cancelar
        setTransposicionPrimerDiente(null);
        return;
      } else {
        // Segundo diente seleccionado, crear transposición
        const primerDienteKey = `diente_${transposicionPrimerDiente}`;
        const primerDiente = dientesData[primerDienteKey] || {};
        
        // Actualizar ambos dientes con la transposición
        const nuevosDientesData = {
          ...dientesData,
          [primerDienteKey]: {
            ...primerDiente,
            transposicion: numeroDiente,
          },
          [dienteKey]: {
            ...dienteActual,
            transposicion: transposicionPrimerDiente,
          },
        };

        setDientesData(nuevosDientesData);
        setTransposicionPrimerDiente(null);
        if (onChange) {
          onChange(nuevosDientesData);
        }
        return; // Ya actualizamos, no continuar
      }
    }

    switch (herramientaSeleccionada) {
      case 'caries':
        // Marcar caries en superficie específica
        if (!nuevoEstado.caries) nuevoEstado.caries = [];
        if (nuevoEstado.caries.includes(superficie)) {
          nuevoEstado.caries = nuevoEstado.caries.filter(s => s !== superficie);
        } else {
          nuevoEstado.caries = [...nuevoEstado.caries, superficie];
        }
        break;

      case 'restauracion':
        // Marcar restauración permanente (azul) en superficie
        if (!nuevoEstado.restauraciones) nuevoEstado.restauraciones = [];
        const restIndex = nuevoEstado.restauraciones.findIndex(r => r.superficie === superficie);
        if (restIndex >= 0) {
          nuevoEstado.restauraciones.splice(restIndex, 1);
        } else {
          nuevoEstado.restauraciones.push({ superficie, tipo: 'permanente', material: '' });
        }
        break;

      case 'restauracion_temporal':
        // Marcar restauración temporal (rojo) en superficie
        if (!nuevoEstado.restauraciones) nuevoEstado.restauraciones = [];
        const restTempIndex = nuevoEstado.restauraciones.findIndex(r => r.superficie === superficie && r.tipo === 'temporal');
        if (restTempIndex >= 0) {
          nuevoEstado.restauraciones.splice(restTempIndex, 1);
        } else {
          nuevoEstado.restauraciones.push({ superficie, tipo: 'temporal', material: '' });
        }
        break;

      case 'ausente':
        // Marcar diente como ausente
        nuevoEstado.ausente = !nuevoEstado.ausente;
        break;

      case 'no_erupcionado':
        // Marcar diente como no erupcionado
        nuevoEstado.no_erupcionado = !nuevoEstado.no_erupcionado;
        break;

      case 'tratamiento_pulpar':
        // Marcar tratamiento pulpar
        nuevoEstado.tratamiento_pulpar = !nuevoEstado.tratamiento_pulpar;
        nuevoEstado.tipo_tratamiento_pulpar = nuevoEstado.tratamiento_pulpar ? 'TC' : null; // TC, PC, PP
        break;

      case 'remanente_radicular':
        // Marcar remanente radicular
        nuevoEstado.remanente_radicular = !nuevoEstado.remanente_radicular;
        break;

      case 'semi_impactacion':
        // Marcar semi-impactación
        nuevoEstado.semi_impactacion = !nuevoEstado.semi_impactacion;
        break;

      case 'supernumerario':
        // Marcar supernumerario (se marca en el espacio entre dientes)
        // Guardamos la posición relativa al diente actual
        nuevoEstado.supernumerario = !nuevoEstado.supernumerario;
        nuevoEstado.supernumerario_posicion = nuevoEstado.supernumerario ? superficie : null; // 'mesial' o 'distal'
        break;

      default:
        break;
    }

    const nuevosDientesData = {
      ...dientesData,
      [dienteKey]: nuevoEstado,
    };

    setDientesData(nuevosDientesData);
    if (onChange) {
      onChange(nuevosDientesData);
    }
  }, [herramientaSeleccionada, dientesData, readOnly, onChange, transposicionPrimerDiente]);

  const limpiarDiente = useCallback((numeroDiente) => {
    if (readOnly) return;

    const dienteKey = `diente_${numeroDiente}`;
    const diente = dientesData[dienteKey] || {};
    const nuevosDientesData = { ...dientesData };
    
    // Si el diente tiene transposición, también limpiar el diente relacionado
    if (diente.transposicion) {
      const dienteRelacionadoKey = `diente_${diente.transposicion}`;
      const dienteRelacionado = nuevosDientesData[dienteRelacionadoKey];
      if (dienteRelacionado) {
        const nuevoDienteRelacionado = { ...dienteRelacionado };
        delete nuevoDienteRelacionado.transposicion;
        if (Object.keys(nuevoDienteRelacionado).length > 0) {
          nuevosDientesData[dienteRelacionadoKey] = nuevoDienteRelacionado;
        } else {
          delete nuevosDientesData[dienteRelacionadoKey];
        }
      }
    }
    
    delete nuevosDientesData[dienteKey];

    setDientesData(nuevosDientesData);
    if (onChange) {
      onChange(nuevosDientesData);
    }
  }, [dientesData, readOnly, onChange]);

  const renderDiente = (numeroDiente, posicion) => {
    const dienteKey = `diente_${numeroDiente}`;
    const diente = dientesData[dienteKey] || {};

    const esAusente = diente.ausente;
    const esNoErupcionado = diente.no_erupcionado;
    const tieneTratamientoPulpar = diente.tratamiento_pulpar;
    const tieneRemanenteRadicular = diente.remanente_radicular;
    const tieneSemiImpactacion = diente.semi_impactacion;
    const tieneSupernumerario = diente.supernumerario;
    const tieneTransposicion = diente.transposicion;
    const esTransposicionSeleccionado = transposicionPrimerDiente === numeroDiente;

    // Superficies del diente: mesial, distal, vestibular/bucal, lingual/palatal, oclusal/incisal
    const superficies = ['mesial', 'distal', 'vestibular', 'lingual', 'oclusal'];

    return (
      <div
        key={numeroDiente}
        className="relative flex flex-col items-center"
        style={{ width: '60px', height: '80px' }}
      >
        {/* Número del diente */}
        <div className="text-xs font-semibold text-gray-700 mb-1">{numeroDiente}</div>

        {/* Representación del diente */}
        <div
          className={`relative border-2 border-gray-400 rounded-sm ${
            readOnly ? '' : 'cursor-pointer hover:border-primary'
          }`}
          style={{
            width: '40px',
            height: '50px',
            backgroundColor: esAusente ? '#f3f4f6' : '#ffffff',
          }}
          onClick={() => !readOnly && handleDienteClick(numeroDiente, 'general')}
        >
          {/* Corona dividida en 5 secciones */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3" style={{ gap: '1px' }}>
            {/* Mesial (izquierda) */}
            <div
              className={`col-start-1 row-start-2 ${diente.caries?.includes('mesial') ? 'bg-red-500' : ''} ${
                diente.restauraciones?.some(r => r.superficie === 'mesial' && r.tipo === 'permanente')
                  ? 'bg-blue-500'
                  : ''
              } ${
                diente.restauraciones?.some(r => r.superficie === 'mesial' && r.tipo === 'temporal')
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) handleDienteClick(numeroDiente, 'mesial');
              }}
            />

            {/* Vestibular/Bucal (arriba) */}
            <div
              className={`col-start-2 row-start-1 ${diente.caries?.includes('vestibular') ? 'bg-red-500' : ''} ${
                diente.restauraciones?.some(r => r.superficie === 'vestibular' && r.tipo === 'permanente')
                  ? 'bg-blue-500'
                  : ''
              } ${
                diente.restauraciones?.some(r => r.superficie === 'vestibular' && r.tipo === 'temporal')
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) handleDienteClick(numeroDiente, 'vestibular');
              }}
            />

            {/* Oclusal/Incisal (centro) */}
            <div
              className={`col-start-2 row-start-2 ${diente.caries?.includes('oclusal') ? 'bg-red-500' : ''} ${
                diente.restauraciones?.some(r => r.superficie === 'oclusal' && r.tipo === 'permanente')
                  ? 'bg-blue-500'
                  : ''
              } ${
                diente.restauraciones?.some(r => r.superficie === 'oclusal' && r.tipo === 'temporal')
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) handleDienteClick(numeroDiente, 'oclusal');
              }}
            />

            {/* Lingual/Palatal (abajo) */}
            <div
              className={`col-start-2 row-start-3 ${diente.caries?.includes('lingual') ? 'bg-red-500' : ''} ${
                diente.restauraciones?.some(r => r.superficie === 'lingual' && r.tipo === 'permanente')
                  ? 'bg-blue-500'
                  : ''
              } ${
                diente.restauraciones?.some(r => r.superficie === 'lingual' && r.tipo === 'temporal')
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) handleDienteClick(numeroDiente, 'lingual');
              }}
            />

            {/* Distal (derecha) */}
            <div
              className={`col-start-3 row-start-2 ${diente.caries?.includes('distal') ? 'bg-red-500' : ''} ${
                diente.restauraciones?.some(r => r.superficie === 'distal' && r.tipo === 'permanente')
                  ? 'bg-blue-500'
                  : ''
              } ${
                diente.restauraciones?.some(r => r.superficie === 'distal' && r.tipo === 'temporal')
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) handleDienteClick(numeroDiente, 'distal');
              }}
            />
          </div>

          {/* Marcadores especiales */}
          {esAusente && (
            <div className="absolute inset-0 flex items-center justify-center">
              <X size={24} className="text-black font-bold" />
            </div>
          )}

          {esNoErupcionado && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 rounded-full"></div>
            </div>
          )}

          {tieneTratamientoPulpar && (
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0.5 h-4 bg-blue-500"></div>
              <div className="text-xs text-blue-500 font-bold mt-1">
                {diente.tipo_tratamiento_pulpar || 'TC'}
              </div>
            </div>
          )}

          {tieneRemanenteRadicular && (
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="text-xs text-red-500 font-bold">RR</div>
            </div>
          )}

          {tieneSemiImpactacion && (
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="text-xs text-blue-500 font-bold">SI</div>
            </div>
          )}

          {tieneSupernumerario && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <div className="w-6 h-6 border-2 border-blue-500 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs text-blue-500 font-bold">S</span>
              </div>
            </div>
          )}

          {tieneTransposicion && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="text-sm text-blue-500 font-bold bg-white px-1 rounded">⇄</div>
            </div>
          )}

          {esTransposicionSeleccionado && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
          )}

          {/* Botón limpiar */}
          {!readOnly && (esAusente || Object.keys(diente).length > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                limpiarDiente(numeroDiente);
              }}
              className="absolute -top-6 -right-2 btn btn-xs btn-circle btn-ghost text-red-500 hover:bg-red-100"
              title="Limpiar diente"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const dientes = tipoDenticion === 'adulto' ? DIENTES_ADULTOS : DIENTES_DECIDUOS;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Odontograma</h3>
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm"
            value={tipoDenticion}
            onChange={(e) => setTipoDenticion(e.target.value)}
            disabled={readOnly}
          >
            <option value="adulto">Dentición Permanente</option>
            <option value="deciduo">Dentición Decidua</option>
          </select>
        </div>
      </div>

      {/* Herramientas de marcado */}
      {!readOnly && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Herramientas:</div>
          <div className="flex flex-wrap gap-2">
            {HERRAMIENTAS.map((herramienta) => (
              <button
                key={herramienta.id}
                type="button"
                onClick={() => setHerramientaSeleccionada(herramienta.id)}
                className={`btn btn-sm ${
                  herramientaSeleccionada === herramienta.id
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
                style={{
                  borderColor: herramienta.color,
                  color: herramientaSeleccionada === herramienta.id ? 'white' : herramienta.color,
                  backgroundColor:
                    herramientaSeleccionada === herramienta.id ? herramienta.color : 'transparent',
                }}
              >
                <span className="mr-1">{herramienta.icon}</span>
                {herramienta.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Herramienta seleccionada: <strong>{HERRAMIENTAS.find(h => h.id === herramientaSeleccionada)?.label}</strong>
          </div>
        </div>
      )}

      {/* Instrucción para transposición */}
      {!readOnly && herramientaSeleccionada === 'transposicion' && transposicionPrimerDiente && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Transposición:</strong> Primer diente seleccionado ({transposicionPrimerDiente}). 
          Haz clic en el segundo diente para completar la transposición.
        </div>
      )}

      {/* Odontograma */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Arco Superior */}
          <div className="mb-4">
            <div className="flex justify-center gap-1 mb-2">
              {dientes.superior_derecho.map((num) => renderDiente(num, 'superior_derecho'))}
            </div>
            <div className="flex justify-center gap-1">
              {dientes.superior_izquierdo.map((num) => renderDiente(num, 'superior_izquierdo'))}
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="border-t-2 border-gray-400 my-4"></div>

          {/* Arco Inferior */}
          <div>
            <div className="flex justify-center gap-1 mb-2">
              {dientes.inferior_izquierdo.map((num) => renderDiente(num, 'inferior_izquierdo'))}
            </div>
            <div className="flex justify-center gap-1">
              {dientes.inferior_derecho.map((num) => renderDiente(num, 'inferior_derecho'))}
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">Leyenda:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500"></div>
            <span>Caries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500"></div>
            <span>Restauración Permanente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-red-500"></div>
            <span>Restauración Temporal</span>
          </div>
          <div className="flex items-center gap-2">
            <X size={16} className="text-black" />
            <span>Diente Ausente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded-full"></div>
            <span>No Erupcionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-blue-500"></div>
            <span>Tratamiento Pulpar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold">RR</span>
            <span>Remanente Radicular</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold">SI</span>
            <span>Semi-Impactación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 rounded-full bg-white flex items-center justify-center">
              <span className="text-xs text-blue-500 font-bold">S</span>
            </div>
            <span>Supernumerario</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-lg">⇄</span>
            <span>Transposición</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Odontograma;


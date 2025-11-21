import { useState, useEffect } from 'react';
import { Columns, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Componente selector de columnas para tablas CRUD con reordenamiento
 */
function ColumnSelector({ entidad, columnasDisponibles, columnasVisibles, onChange, onClose }) {
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState(columnasVisibles);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Asegurar que "acciones" esté al final
    const columnasOrdenadas = [...columnasVisibles];
    const accionesIndex = columnasOrdenadas.indexOf('acciones');
    if (accionesIndex !== -1 && accionesIndex !== columnasOrdenadas.length - 1) {
      columnasOrdenadas.splice(accionesIndex, 1);
      columnasOrdenadas.push('acciones');
    }
    setColumnasSeleccionadas(columnasOrdenadas);
  }, [columnasVisibles]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = columnasSeleccionadas.indexOf(active.id);
      const newIndex = columnasSeleccionadas.indexOf(over.id);

      // No permitir mover "acciones" de su posición final
      if (active.id === 'acciones' || over.id === 'acciones') {
        // Si se intenta mover "acciones", mantenerla al final
        const nuevasColumnas = arrayMove(columnasSeleccionadas, oldIndex, newIndex);
        const accionesIndex = nuevasColumnas.indexOf('acciones');
        if (accionesIndex !== nuevasColumnas.length - 1) {
          nuevasColumnas.splice(accionesIndex, 1);
          nuevasColumnas.push('acciones');
        }
        setColumnasSeleccionadas(nuevasColumnas);
      } else {
        const nuevasColumnas = arrayMove(columnasSeleccionadas, oldIndex, newIndex);
        // Asegurar que "acciones" esté al final
        const accionesIndex = nuevasColumnas.indexOf('acciones');
        if (accionesIndex !== -1 && accionesIndex !== nuevasColumnas.length - 1) {
          nuevasColumnas.splice(accionesIndex, 1);
          nuevasColumnas.push('acciones');
        }
        setColumnasSeleccionadas(nuevasColumnas);
      }
    }
  };

  const handleToggle = (columnaKey) => {
    const columna = columnasDisponibles.find(c => c.key === columnaKey);
    if (columna?.required || columnaKey === 'acciones') return; // No permitir desmarcar requeridas

    const nuevasColumnas = columnasSeleccionadas.includes(columnaKey)
      ? columnasSeleccionadas.filter(c => c !== columnaKey)
      : [...columnasSeleccionadas.filter(c => c !== 'acciones'), columnaKey, 'acciones']; // Mantener acciones al final
    setColumnasSeleccionadas(nuevasColumnas);
  };

  const handleAplicar = () => {
    // Asegurar que "acciones" esté al final antes de aplicar
    const columnasFinales = [...columnasSeleccionadas];
    const accionesIndex = columnasFinales.indexOf('acciones');
    if (accionesIndex !== -1 && accionesIndex !== columnasFinales.length - 1) {
      columnasFinales.splice(accionesIndex, 1);
      columnasFinales.push('acciones');
    }
    onChange(columnasFinales);
    if (onClose) onClose();
  };

  const handleReset = () => {
    // Resetear a columnas por defecto (base + acciones)
    const columnasBase = columnasDisponibles.filter(c => 
      ['id', 'nombre', 'dni', 'telefono', 'acciones'].includes(c.key)
    );
    setColumnasSeleccionadas(columnasBase.map(c => c.key));
  };

  // Obtener las columnas seleccionadas con su información completa
  const columnasSeleccionadasConInfo = columnasSeleccionadas
    .map(key => columnasDisponibles.find(c => c.key === key))
    .filter(Boolean);

  return (
    <div className="bg-white border-2 border-primary rounded-lg shadow-2xl p-4 w-80 max-h-96 overflow-hidden flex flex-col z-[9999]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Columns size={18} />
          Configurar Columnas
        </h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-ghost btn-circle hover:bg-gray-200"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mb-3">
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2 px-2">
            Columnas seleccionadas (arrastra para reordenar):
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={columnasSeleccionadas} 
              strategy={verticalListSortingStrategy}
            >
              {columnasSeleccionadasConInfo.map((columna) => (
                <SortableColumnItem
                  key={columna.key}
                  columna={columna}
                  isSelected={true}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          <div className="text-xs text-gray-500 mt-4 mb-2 px-2 border-t pt-2">
            Columnas disponibles:
          </div>
          {columnasDisponibles
            .filter(c => !columnasSeleccionadas.includes(c.key))
            .map((columna) => {
              const isRequired = columna.required || columna.key === 'acciones';
              return (
                <label
                  key={columna.key}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggle(columna.key)}
                    disabled={isRequired}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {columna.label}
                    {isRequired && <span className="text-xs text-gray-500 ml-1">(requerida)</span>}
                  </span>
                </label>
              );
            })}
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="btn btn-sm btn-ghost flex-1"
          type="button"
        >
          Resetear
        </button>
        <button
          onClick={handleAplicar}
          className="btn btn-sm btn-primary flex-1"
          type="button"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function SortableColumnItem({ columna, isSelected, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columna.key });

  const isRequired = columna.required || columna.key === 'acciones';
  const isAcciones = columna.key === 'acciones';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded transition-colors ${
        isSelected
          ? 'bg-primary/10 border-2 border-primary'
          : 'bg-gray-50 border-2 border-transparent'
      } ${isRequired ? 'opacity-75' : ''} ${isDragging ? 'shadow-lg' : ''}`}
    >
      {!isAcciones && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={16} />
        </div>
      )}
      {isAcciones && <div className="w-4" />}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => !isRequired && onToggle(columna.key)}
        disabled={isRequired}
        className="checkbox checkbox-primary checkbox-sm"
      />
      <span className="flex-1 text-sm font-medium">
        {columna.label}
        {isRequired && <span className="text-xs text-gray-500 ml-1">(requerida)</span>}
        {isAcciones && <span className="text-xs text-gray-400 ml-1">• Siempre al final</span>}
      </span>
    </div>
  );
}

export default ColumnSelector;


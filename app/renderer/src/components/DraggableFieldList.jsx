import { useState } from 'react';
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
import { GripVertical, Eye } from 'lucide-react';

/**
 * Componente de lista arrastrable para reordenar campos
 */
function DraggableFieldList({ campos, onReorder, onPreview }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = campos.findIndex((item) => item.id === active.id);
      const newIndex = campos.findIndex((item) => item.id === over.id);

      const newCampos = arrayMove(campos, oldIndex, newIndex);
      
      // Actualizar el orden de cada campo
      const camposConOrden = newCampos.map((campo, index) => ({
        ...campo,
        orden: index + 1,
      }));

      onReorder(camposConOrden);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={campos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {campos.map((campo) => (
            <SortableFieldItem key={campo.id} campo={campo} onPreview={onPreview} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableFieldItem({ campo, onPreview }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <div className="font-medium">{campo.nombre_campo}</div>
        <div className="text-sm text-gray-500">
          {campo.tipo} {campo.requerido === 1 ? '• Requerido' : ''}
        </div>
      </div>
      <div className="text-sm text-gray-400">Orden: {campo.orden}</div>
      <button
        onClick={() => onPreview(campo)}
        className="btn btn-sm btn-ghost"
        title="Editar"
      >
        <Eye size={16} />
      </button>
    </div>
  );
}

export default DraggableFieldList;


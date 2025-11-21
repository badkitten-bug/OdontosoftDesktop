import { useState, useMemo } from 'react';
import DynamicForm from './DynamicForm';

/**
 * Componente de previsualización del formulario
 */
function FormPreview({ entidad, camposBase, camposDinamicos }) {
  const [formData, setFormData] = useState({});

  // Ordenar campos dinámicos por orden y memorizar para evitar recálculos innecesarios
  const camposOrdenados = useMemo(() => {
    return [...camposDinamicos].sort((a, b) => {
      const ordenA = a.orden || 0;
      const ordenB = b.orden || 0;
      if (ordenA !== ordenB) return ordenA - ordenB;
      return (a.nombre_campo || '').localeCompare(b.nombre_campo || '');
    });
  }, [camposDinamicos]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Previsualización del Formulario
      </h3>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <DynamicForm
          entidad={entidad}
          formData={formData}
          onChange={setFormData}
          camposBase={camposBase}
          camposDinamicosProp={camposOrdenados}
          skipLoad={true}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Esta es una previsualización de cómo se verá el formulario.</p>
        <p className="mt-1">Los campos se muestran en el orden configurado.</p>
      </div>
    </div>
  );
}

export default FormPreview;


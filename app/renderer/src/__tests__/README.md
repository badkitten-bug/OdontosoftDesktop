# Tests del Frontend

## Estructura

```
__tests__/
 ├── Login.test.jsx              # Tests del componente Login
 ├── Pacientes.test.jsx          # Tests del componente Pacientes
 ├── Dashboard.test.jsx           # Tests del Dashboard
 ├── components/
 │    └── DynamicForm.test.jsx   # Tests del formulario dinámico
 ├── integration/
 │    └── PacienteFlow.test.jsx  # Tests de integración
 ├── services/
 │    └── dbService.test.js      # Tests de servicios
 └── utils/
      └── excelExporter.test.js   # Tests de utilidades
```

## Ejecutar Tests

```bash
# Desde el directorio raíz
bun run test:renderer

# O desde app/renderer
cd app/renderer
bun run test
```

## Agregar Nuevos Tests

1. Crea un archivo `*.test.jsx` o `*.test.js` en la carpeta correspondiente
2. Importa las dependencias necesarias
3. Escribe tus tests usando Jest y React Testing Library
4. Ejecuta `bun run test` para verificar

## Ejemplo de Test

```jsx
import { render, screen } from '@testing-library/react';
import MiComponente from '../components/MiComponente';

describe('MiComponente', () => {
  test('renderiza correctamente', () => {
    render(<MiComponente />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });
});
```


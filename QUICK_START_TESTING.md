# 🚀 Inicio Rápido - Testing

## Ejecutar Tests

```bash
# Todos los tests
bun run test

# Solo frontend
bun run test:renderer

# Solo backend
bun run test:main

# Modo watch (ejecuta tests al cambiar archivos)
bun run test:watch

# Con cobertura
bun run test:coverage
```

## Tests Disponibles

### ✅ Frontend (7 suites, 22 tests)
- Login.test.jsx
- Pacientes.test.jsx
- Dashboard.test.jsx
- DynamicForm.test.jsx
- PacienteFlow.test.jsx (integración)
- excelExporter.test.js
- dbService.test.js

### ✅ Backend (2 suites)
- pacientesHandler.test.js
- citasHandler.test.js

## Ver Reportes de Cobertura

Después de ejecutar `bun run test:coverage`, abre:
- Frontend: `app/renderer/coverage/lcov-report/index.html`
- Backend: `app/main/coverage/lcov-report/index.html`

## Agregar Nuevos Tests

1. Crea un archivo `*.test.jsx` o `*.test.js` en la carpeta correspondiente
2. Importa React si es JSX: `import React from 'react';`
3. Escribe tus tests
4. Ejecuta `bun run test` para verificar

## Solución de Problemas

### Error: "React is not defined"
- Asegúrate de importar React: `import React from 'react';`

### Error: "Cannot find module"
- Ejecuta `bun install` en el directorio correspondiente

### Tests muy lentos
- Usa `--testPathPattern` para ejecutar solo tests específicos
- Ejemplo: `bun run test -- --testPathPattern="Login"`


# Tests del Backend

## Estructura

```
__tests__/
 ├── pacientesHandler.test.js    # Tests del handler de pacientes
 └── citasHandler.test.js       # Tests del handler de citas
```

## Ejecutar Tests

```bash
# Desde el directorio raíz
bun run test:main

# O desde app/main
cd app/main
bun run test
```

## Agregar Nuevos Tests

1. Crea un archivo `*.test.js` en `__tests__/`
2. Mock de `getDatabase` para usar base de datos en memoria
3. Escribe tus tests usando Jest
4. Ejecuta `bun run test` para verificar

## Ejemplo de Test

```javascript
const Database = require('better-sqlite3');
const miHandler = require('../ipcHandlers/miHandler');

describe('Mi Handler', () => {
  let db;

  beforeAll(() => {
    db = new Database(':memory:');
    // Crear tablas necesarias
    jest.spyOn(require('../db/database'), 'getDatabase').mockReturnValue(db);
  });

  test('mi test', () => {
    // Tu test aquí
  });
});
```


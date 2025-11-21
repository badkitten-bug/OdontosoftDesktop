# 🔧 Solución de Errores Comunes

## Error: "Base de datos no inicializada"

### Síntomas
- Errores en consola: "Error: Base de datos no inicializada. Llama a initDatabase() primero."
- La aplicación no carga datos
- Los handlers IPC fallan

### Causa
`better-sqlite3` no está compilado para la versión de Electron que estás usando.

### Solución

1. **Recompilar better-sqlite3 para Electron:**
   ```bash
   bun run rebuild
   ```

2. **Reiniciar completamente la aplicación:**
   - Cierra todas las ventanas de Electron
   - Detén el servidor (Ctrl+C)
   - Vuelve a ejecutar `bun run dev`

3. **Si el problema persiste:**
   ```bash
   # Limpiar y reinstalar
   cd app/main
   rm -rf node_modules
   bun install
   cd ../..
   bun run rebuild
   ```

## Error: "NODE_MODULE_VERSION" en Tests

### Síntomas
- Los tests del backend fallan con error de `NODE_MODULE_VERSION`
- `better-sqlite3` no se puede cargar en los tests

### Causa
`better-sqlite3` está compilado para Electron, pero los tests usan Node.js del sistema.

### Solución

Los tests tienen un script `pretest` que recompila `better-sqlite3` para Node.js automáticamente. Si falla:

```bash
cd app/main
npm rebuild better-sqlite3
```

## Error: Handlers IPC no registrados

### Síntomas
- Errores al intentar usar funciones IPC desde el frontend
- "Error invoking remote method"

### Causa
Los handlers IPC se registraron antes de que la base de datos se inicializara.

### Solución

Este problema ya está resuelto en el código. Los handlers IPC se registran **después** de que la base de datos se inicializa correctamente.

Si aún ves este error:
1. Verifica que `initDatabase()` se ejecute correctamente
2. Revisa la consola de Electron para ver los mensajes de inicialización
3. Asegúrate de que `better-sqlite3` esté compilado correctamente (ver error anterior)

## Advertencias de React Router

### Síntomas
- Advertencias sobre flags futuras de React Router v7

### Solución

Ya están configuradas en `app/renderer/src/main.jsx`. Si aún ves las advertencias, verifica que el archivo tenga:

```jsx
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
```

## Verificación Rápida

Para verificar que todo está correcto:

1. **Base de datos inicializada:**
   - Busca en la consola: "Base de datos inicializada correctamente"
   - Busca: "Handlers IPC registrados correctamente"

2. **better-sqlite3 compilado:**
   - No deberías ver errores de `NODE_MODULE_VERSION` al iniciar
   - La aplicación carga datos correctamente

3. **Tests funcionando:**
   - `bun run test:main` debería pasar todos los tests
   - `bun run test:renderer` debería pasar la mayoría de los tests


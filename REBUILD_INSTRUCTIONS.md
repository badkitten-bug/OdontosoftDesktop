# 🔧 Instrucciones para Recompilar better-sqlite3

Si encuentras errores de `NODE_MODULE_VERSION` con `better-sqlite3`, sigue estos pasos:

## Problema

`better-sqlite3` es un módulo nativo que debe compilarse para la versión específica de Node.js que usa Electron, no para la versión del sistema.

## Solución

### Opción 1: Usar el script de rebuild (Recomendado)

```bash
# Desde el directorio raíz del proyecto
bun run rebuild
```

O manualmente:

```bash
cd app/main
npx electron-rebuild -f -w better-sqlite3
```

### Opción 2: Reinstalar dependencias

```bash
# Desde el directorio raíz
bun install
```

El script `postinstall` debería ejecutar `electron-rebuild` automáticamente.

### Opción 3: Rebuild manual completo

```bash
# Desde el directorio raíz
cd app/main
rm -rf node_modules/better-sqlite3
bun install
npx electron-rebuild -f -w better-sqlite3
```

## Verificar

Después de recompilar, reinicia la aplicación:

```bash
bun run dev
```

Si aún ves errores, verifica:
1. Que `electron-rebuild` esté instalado: `npm list electron-rebuild`
2. Que Electron esté instalado: `npm list electron`
3. Que la versión de Electron coincida con la del `package.json`

## Nota para Tests

Los tests del backend requieren que `better-sqlite3` esté compilado para Node.js (no para Electron). El script `pretest` en `app/main/package.json` ejecuta `npm rebuild better-sqlite3` antes de los tests.


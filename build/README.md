# `build/` — Assets del instalador

Esta carpeta contiene los assets que `electron-builder` usa al empaquetar la app.
**Los archivos binarios NO están en el repo** porque cambian con cada rediseño y son
mejor gestionados como artefactos de release. Tú los pones acá antes de publicar.

## Archivos requeridos

| Archivo | Para | Tamaño | Cómo generarlo |
|---|---|---|---|
| `icon.ico` | Instalador y `.exe` Windows | 256×256 (multi-resolución) | Desde un PNG 1024×1024 con [icoconvert.com](https://icoconvert.com/) |
| `icon.icns` | macOS `.dmg` | 1024×1024 | Desde un PNG 1024×1024 con [cloudconvert.com/png-to-icns](https://cloudconvert.com/png-to-icns) |
| `icon.png` | Linux AppImage | 512×512 mínimo | El PNG fuente directamente |
| `installerIcon.ico` | (opcional) Icono del instalador NSIS | 256×256 | Igual que `icon.ico` |
| `uninstallerIcon.ico` | (opcional) Icono del desinstalador | 256×256 | Igual |
| `license_es.txt` | EULA mostrada durante la instalación | UTF-8 | Ya está en este repo |

## Atajo: 1 PNG → todos los iconos

1. Diseña tu logo en cuadrado **1024×1024 píxeles**, fondo transparente o de color.
2. Súbelo a [iconverticons.com/online](https://iconverticons.com/online/) o a la
   herramienta `electron-icon-builder`:
   ```
   bunx electron-icon-builder --input=./logo-1024.png --output=./build
   ```
3. Verifica que existan `icon.ico`, `icon.icns` e `icon.png`.

## Si no tienes logo todavía

`electron-builder` permite construir sin iconos pero las builds se ven feas
(icono genérico de Electron). Para una primera prueba interna, puedes correr
`bun run make` sin estos archivos — solo aparecerá un warning.

**No publiques una versión 1.0.0 sin icono propio.** Es lo primero que ve el
cliente al descargar.

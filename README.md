# 🦷 OdontoSoft Desktop

Aplicación de escritorio profesional para clínicas odontológicas, desarrollada con **Electron + React + Node.js + SQLite + TailwindCSS + DaisyUI**. Diseñada para trabajar de forma local sin necesidad de conexión a internet.

## 📋 Características

### Módulos Principales

- ✅ **Pacientes**: CRUD completo con campos dinámicos personalizables
- ✅ **Odontólogos**: Gestión de profesionales con especialidades y matrículas
- ✅ **Horarios**: Configuración de disponibilidad de odontólogos por día de la semana
- ✅ **Citas**: Sistema de agendamiento con verificación de disponibilidad
- ✅ **Tratamientos**: Catálogo de tratamientos con precios y duración
- ✅ **Facturación**: Generación de facturas desde citas y gestión de pagos
- ✅ **Almacén**: Control de inventario de productos y materiales
- ✅ **Historias Clínicas**: Registro y seguimiento del historial médico de cada paciente
- ✅ **Configuración**: Campos dinámicos personalizables para Pacientes, Odontólogos y Tratamientos

### Funcionalidades Avanzadas

- ✅ **Campos Dinámicos**: Sistema flexible para agregar campos personalizados a múltiples módulos
- ✅ **Verificación de Disponibilidad**: Sistema inteligente que verifica horarios antes de agendar citas
- ✅ **Flujo Completo de Atención**: Desde el registro del paciente hasta la facturación
- ✅ **Base de Datos Local**: SQLite almacenada localmente en el sistema del usuario
- ✅ **Interfaz Moderna**: Diseño profesional con TailwindCSS y DaisyUI

## 🛠️ Tecnologías

- **Electron**: Framework para aplicaciones de escritorio
- **React**: Biblioteca para interfaces de usuario
- **Vite**: Build tool y dev server
- **Node.js**: Runtime de JavaScript
- **SQLite (better-sqlite3)**: Base de datos local
- **TailwindCSS**: Framework de CSS utility-first
- **DaisyUI**: Componentes para TailwindCSS
- **React Router**: Navegación en la aplicación
- **Lucide React**: Iconos modernos

## 📦 Instalación

### Requisitos Previos

- **Bun** (recomendado) o Node.js 18+ y npm
- Git (opcional)

> 💡 **Nota**: Este proyecto está configurado para usar **Bun** como gestor de paquetes. Si prefieres usar npm, también es compatible.

### Pasos de Instalación

1. **Clonar o descargar el repositorio**

```bash
git clone <url-del-repositorio>
cd ClinicaOdontoSoft
```

2. **Instalar dependencias con Bun**

```bash
bun install
```

Este comando instalará automáticamente las dependencias del proyecto raíz, del backend (`app/main`) y del frontend (`app/renderer`).

> **Alternativa con npm**: Si prefieres usar npm, ejecuta `npm install` en su lugar.

3. **Verificar la instalación**

```bash
bun run dev
```

La aplicación debería abrirse en una ventana de Electron con el dashboard funcionando.

> **Alternativa con npm**: `npm run dev`

## 🚀 Desarrollo

### Modo Desarrollo

```bash
bun run dev
```

Este comando:
- Inicia el servidor de desarrollo de Vite (puerto 5173)
- Abre Electron cuando el servidor esté listo
- Habilita hot-reload para cambios en tiempo real

> **Alternativa con npm**: `npm run dev`

### Estructura del Proyecto

```
/app
 ├── main/                   # Backend Electron (Node.js)
 │    ├── main.js            # Entrada principal de Electron
 │    ├── preload.js         # Comunicación segura con frontend
 │    ├── db/
 │    │    ├── database.js   # Conexión SQLite
 │    ├── ipcHandlers/       # Handlers IPC (pacientes, productos, etc.)
 │    └── package.json
 │
 ├── renderer/               # Frontend React (Vite)
 │    ├── src/
 │    │    ├── App.jsx       # Componente principal
 │    │    ├── components/   # Componentes reutilizables
 │    │    ├── pages/        # Páginas de la aplicación
 │    │    ├── services/     # Servicios de comunicación con backend
 │    │    └── styles/       # Estilos globales
 │    └── package.json
 │
 ├── electron-builder.yml    # Configuración del instalador
 └── package.json            # Config raíz
```

## 🗄️ Base de Datos

La base de datos SQLite se crea automáticamente en:

- **Windows**: `%APPDATA%\OdontoSoftDesktop\clinica.db`
- **macOS**: `~/Library/Application Support/OdontoSoftDesktop/clinica.db`
- **Linux**: `~/.config/OdontoSoftDesktop/clinica.db`

### Tablas

- **pacientes**: Información de pacientes con campos dinámicos en JSON
- **odontologos**: Información de odontólogos con especialidades
- **horarios_disponibilidad**: Horarios de disponibilidad de odontólogos por día
- **citas**: Citas agendadas con estados (programada, confirmada, en_proceso, completada, cancelada)
- **tratamientos**: Catálogo de tratamientos con precios y duración
- **citas_tratamientos**: Relación entre citas y tratamientos realizados
- **facturas**: Facturas generadas desde citas
- **pagos**: Pagos realizados a facturas
- **productos**: Inventario de productos y materiales
- **historial**: Registro de historias clínicas por paciente
- **campos_config**: Configuración de campos dinámicos personalizados para múltiples módulos

## 📦 Build y Distribución

### Compilar Frontend

```bash
bun run build
```

### Generar Instalador

```bash
bun run make
```

> **Alternativa con npm**: `npm run build` y `npm run make`

Los instaladores se generarán en la carpeta `dist/`:

- **Windows**: `.exe` (NSIS installer)
- **macOS**: `.dmg`
- **Linux**: `.AppImage`

## 🔄 Flujo Completo de Atención al Paciente

El sistema está diseñado para seguir un flujo completo de atención:

1. **Registro de Paciente** → Módulo "Pacientes"
   - Crear nuevo paciente con información básica y campos dinámicos

2. **Configuración de Odontólogos** → Módulo "Odontólogos"
   - Registrar odontólogos con especialidades y matrículas

3. **Configuración de Horarios** → Módulo "Horarios"
   - Definir horarios de disponibilidad de cada odontólogo por día de la semana

4. **Agendamiento de Citas** → Módulo "Citas"
   - Agendar citas verificando disponibilidad del odontólogo
   - Estados: programada, confirmada, en_proceso, completada, cancelada

5. **Catálogo de Tratamientos** → Módulo "Tratamientos"
   - Crear catálogo de tratamientos con precios y duración

6. **Facturación** → Módulo "Facturación"
   - Generar facturas desde citas completadas
   - Registrar pagos (efectivo, tarjeta, transferencia, cheque)
   - Seguimiento de estado de facturas (pendiente, pagada, cancelada)

7. **Historial Clínico** → Módulo "Historias Clínicas"
   - Registrar historial médico de cada paciente

## 🧪 Testing

El proyecto incluye un sistema completo de testing para asegurar la calidad del código antes de producción.

### Ejecutar Tests

```bash
# Todos los tests (frontend + backend)
bun run test

# Solo tests del frontend
bun run test:renderer

# Solo tests del backend
bun run test:main

# Modo watch (ejecuta tests al cambiar archivos)
bun run test:watch

# Con cobertura de código
bun run test:coverage
```

### Tests Implementados

- ✅ **Componentes React**: Login, Dashboard, Pacientes, DynamicForm
- ✅ **Handlers IPC**: Pacientes, Citas (validaciones de negocio)
- ✅ **Utilidades**: Exportación a Excel
- ✅ **Tests de Integración**: Flujos completos de usuario

Ver [TESTING.md](./TESTING.md) para más detalles sobre los tests y cómo agregar nuevos.

## 🎨 Personalización

### Campos Dinámicos

Puedes agregar campos personalizados desde el módulo **Configuración**:

1. Ve a **Configuración** en el menú lateral
2. Selecciona el módulo (Pacientes, Odontólogos o Tratamientos)
3. Haz clic en **Nuevo Campo**
4. Configura:
   - Nombre del campo
   - Tipo (texto, número, email, fecha, área de texto)
   - Si es requerido
   - Orden de visualización
5. Los campos aparecerán automáticamente en los formularios correspondientes

### Estilos

Los estilos se pueden personalizar en:
- `app/renderer/tailwind.config.js`: Configuración de TailwindCSS
- `app/renderer/src/styles/index.css`: Estilos globales

## 🔧 Scripts Disponibles

- `bun run dev`: Modo desarrollo (Vite + Electron)
- `bun run build`: Compila el frontend para producción
- `bun run make`: Genera el instalador de la aplicación
- `bun run dev:renderer`: Solo inicia el servidor de desarrollo de Vite
- `bun run build:renderer`: Solo compila el frontend
- `bun run rebuild`: Reconstruye módulos nativos para Electron (útil si hay errores con better-sqlite3)

> 💡 **Nota**: Todos los scripts también funcionan con `npm run` si prefieres usar npm.

## 📝 Notas Importantes

- La aplicación funciona **completamente offline** una vez instalada
- Los datos se almacenan localmente en SQLite
- No se requiere conexión a internet para el funcionamiento normal
- La base de datos se crea automáticamente en el primer inicio

## 🐛 Solución de Problemas

### Error: "electronAPI no está disponible"

Asegúrate de ejecutar la aplicación con `bun run dev` y no directamente con Vite.

### Error: "NODE_MODULE_VERSION" con better-sqlite3

Este error ocurre cuando `better-sqlite3` no está compilado para la versión de Node.js que usa Electron. Solución:

```bash
# Reconstruir el módulo nativo para Electron
bun run rebuild
```

O manualmente:
```bash
cd app/main
npx electron-rebuild -f -w better-sqlite3
```

El script `postinstall` debería hacer esto automáticamente, pero si el error persiste, ejecuta `bun run rebuild` manualmente.

**Nota**: En Windows, puede ser necesario instalar herramientas de compilación:
- Visual Studio Build Tools
- O Python (para node-gyp)

**Importante**: Después de ejecutar `rebuild`, reinicia completamente la aplicación (cierra todas las ventanas y vuelve a ejecutar `bun run dev`).

### La base de datos no se crea

Verifica los permisos de escritura en la carpeta del usuario. La aplicación necesita permisos para crear directorios en:
- Windows: `%APPDATA%`
- macOS/Linux: `~/.config` o `~/Library/Application Support`

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o soporte, por favor abre un issue en el repositorio.

---

**Desarrollado con ❤️ para clínicas odontológicas**


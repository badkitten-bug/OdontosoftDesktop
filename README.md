# 🦷 OdontoSoft Desktop

Aplicación de escritorio profesional para clínicas odontológicas, desarrollada con **Electron + React + Node.js + SQLite + TailwindCSS + DaisyUI**. Diseñada para trabajar de forma local sin necesidad de conexión a internet.

> **Versión actual: v1.4.0**

## 📋 Características

### Módulos Principales

- ✅ **Pacientes**: CRUD completo con campos dinámicos personalizables
- ✅ **Odontólogos**: Gestión de profesionales con especialidades y matrículas
- ✅ **Horarios**: Configuración de disponibilidad de odontólogos por día de la semana
- ✅ **Citas**: Sistema de agendamiento con verificación de disponibilidad y acceso rápido a historia clínica
- ✅ **Tratamientos**: Catálogo de tratamientos con precios y duración
- ✅ **Facturación**: Generación de facturas con trazabilidad de odontólogo responsable; Yape/Plin soportados
- ✅ **Almacén**: Control de inventario con registro de usuario que realizó el movimiento
- ✅ **Historias Clínicas**: Registro con vinculación a cita y odontólogo; badge de cita de origen
- ✅ **Calendario**: Vista mensual, semanal y diaria con cambio de estado de citas inline
- ✅ **Reportes**: Ingresos reales, tratamientos más realizados, conteo de citas y **rendimiento por odontólogo**
- ✅ **Recordatorios**: Alertas automáticas de citas y pagos pendientes; recordatorios manuales; tabs Pendientes/Todos/Vistos
- ✅ **Vista 360° del Paciente**: Perfil completo en `/pacientes/:id` con 6 pestañas (Resumen, Historia Clínica, Citas, Planes, Prescripciones, Facturas)
- ✅ **Configuración**: Campos dinámicos personalizables para Pacientes, Odontólogos y Tratamientos

### Funcionalidades Avanzadas

- ✅ **Trazabilidad Médico-Legal**: `id_odontologo` e `id_cita` registrados en historial y facturas
- ✅ **Flujo Cita → Historia Clínica**: Botón "Consulta" en citas completadas/en proceso, pre-rellena el formulario de historia
- ✅ **Flujo Cita → Prescripción**: Botón "Recetar" en citas completadas/en proceso, navega a Prescripciones con datos pre-rellenados
- ✅ **Anamnesis Estructurada**: Sección colapsable en la ficha del paciente (alergias, medicamentos actuales, enfermedades crónicas, grupo sanguíneo, embarazo)
- ✅ **Cupones en Facturación**: Validación y aplicación de cupones de descuento (monto fijo o porcentaje) al emitir comprobantes
- ✅ **Campos Dinámicos**: Sistema flexible para agregar campos personalizados a múltiples módulos
- ✅ **Verificación de Disponibilidad**: Sistema inteligente que verifica horarios antes de agendar citas
- ✅ **Base de Datos Local**: SQLite almacenada localmente en el sistema del usuario
- ✅ **Interfaz Moderna**: Diseño profesional con TailwindCSS y DaisyUI

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
   - Botón **"Consulta"** en citas completadas/en proceso → navega directamente a Historia Clínica pre-rellenada
   - Botón **"Recetar"** en citas completadas/en proceso → abre Prescripciones con datos pre-rellenados

5. **Catálogo de Tratamientos** → Módulo "Tratamientos"
   - Crear catálogo de tratamientos con precios y duración

6. **Historia Clínica** → Módulo "Historias Clínicas"
   - Registrar evolución clínica vinculada a la cita y odontólogo responsable
   - Cada registro muestra el nombre del odontólogo y el número de cita de origen

7. **Facturación** → Módulo "Facturación"
   - Generar facturas desde citas completadas (incluye odontólogo responsable)
   - Registrar pagos (efectivo, tarjeta, transferencia, Yape, Plin)
   - Aplicar cupones de descuento al crear comprobantes
   - Seguimiento de estado de facturas (pendiente, pagada, cancelada)

8. **Calendario** → Módulo "Calendario"
   - Visualizar citas en vista mensual, semanal o diaria
   - Cambiar estado de una cita directamente desde el modal de detalle
   - Acceso rápido a "Nueva Cita" desde la vista de calendario

9. **Reportes** → Módulo "Reportes"
   - Ingresos totales filtrados por rango de fecha
   - Tratamientos más realizados con conteo real desde la base de datos
   - Total de citas y nuevos pacientes en el período
   - Rendimiento por odontólogo: citas totales, completadas, canceladas e ingresos

10. **Recordatorios** → Módulo "Recordatorios"
    - Auto-generar recordatorios de citas próximas y pagos pendientes
    - Crear recordatorios manuales con fecha y descripción
    - Marcar como visto o eliminar; tabs Pendientes / Todos / Vistos

11. **Vista 360° del Paciente** → Desde tabla de Pacientes → botón "Perfil"
    - Resumen con estadísticas rápidas (citas, facturas, planes, prescripciones)
    - 6 pestañas: Resumen | Historia Clínica | Citas | Planes | Prescripciones | Facturas

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
- **jsPDF + jspdf-autotable**: Generación de PDFs para facturas

## 📦 Instalación

### Requisitos Previos

- **Bun** (recomendado) o Node.js 18+ y npm
- Git (opcional)

> 💡 **Nota**: Este proyecto está configurado para usar **Bun** como gestor de paquetes. Si prefieres usar npm, también es compatible.

### Pasos de Instalación

1. **Clonar o descargar el repositorio**

```bash
git clone https://github.com/badkitten-bug/OdontosoftDesktop.git
cd OdontosoftDesktop
```

2. **Instalar dependencias con Bun**

```bash
bun install
```

Este comando instalará automáticamente las dependencias del proyecto raíz, del backend (`app/main`) y del frontend (`app/renderer`).

3. **Verificar la instalación**

```bash
bun run dev
```

La aplicación debería abrirse en una ventana de Electron con el dashboard funcionando.

## 🚀 Desarrollo

### Modo Desarrollo

```bash
bun run dev
```

Este comando:
- Inicia el servidor de desarrollo de Vite (puerto 5173)
- Abre Electron cuando el servidor esté listo
- Habilita hot-reload para cambios en tiempo real

### Estructura del Proyecto

```
/app
 ├── main/                   # Backend Electron (Node.js)
 │    ├── main.js            # Entrada principal de Electron
 │    ├── preload.js         # Comunicación segura con frontend
 │    ├── db/
 │    │    └── database.js   # Conexión SQLite + migraciones automáticas
 │    ├── ipcHandlers/       # Handlers IPC por módulo
 │    └── package.json
 │
 └── renderer/               # Frontend React (Vite)
      ├── src/
      │    ├── App.jsx        # Componente principal + rutas
      │    ├── components/    # Componentes reutilizables
      │    ├── context/       # Contextos React (UserContext, etc.)
      │    ├── pages/         # Páginas de la aplicación
      │    ├── services/      # dbService.js — API hacia backend
      │    └── utils/         # pdfGenerator.js, etc.
      └── package.json
```

## 🗄️ Base de Datos

La base de datos SQLite se crea automáticamente en:

- **Windows**: `%APPDATA%\OdontoSoftDesktop\clinica.db`
- **macOS**: `~/Library/Application Support/OdontoSoftDesktop/clinica.db`
- **Linux**: `~/.config/OdontoSoftDesktop/clinica.db`

Las migraciones se aplican automáticamente al iniciar la app con `ALTER TABLE IF NOT EXISTS`, lo que garantiza compatibilidad con bases de datos existentes.

### Tablas

| Tabla | Descripción |
| --- | --- |
| `pacientes` | Información de pacientes con campos dinámicos en JSON |
| `odontologos` | Información de odontólogos con especialidades |
| `horarios_disponibilidad` | Horarios de disponibilidad por odontólogo y día |
| `citas` | Citas agendadas (programada → confirmada → en_proceso → completada/cancelada) |
| `tratamientos` | Catálogo de tratamientos con precios y duración |
| `citas_tratamientos` | Tratamientos realizados por cita |
| `facturas` | Facturas con `id_odontologo` para trazabilidad |
| `pagos` | Pagos por factura (efectivo, tarjeta, transferencia, Yape, Plin) |
| `productos` | Inventario de materiales y productos |
| `movimientos_inventario` | Movimientos de almacén con usuario responsable |
| `historial` | Historias clínicas con `id_odontologo` e `id_cita` para trazabilidad |
| `campos_config` | Configuración de campos dinámicos personalizados |
| `prescripciones` | Recetas médicas vinculadas a paciente, cita y odontólogo |
| `recordatorios` | Alertas de citas, pagos y eventos manuales |
| `planes_tratamiento` | Planes multi-cita con presupuesto y seguimiento |
| `planes_citas` | Citas individuales dentro de un plan de tratamiento |
| `cupones` | Cupones de descuento (monto fijo o porcentaje) con control de usos |
| `promociones` | Promociones base asociadas a cupones |
| `archivos_historial` | Archivos adjuntos (imágenes, PDFs) vinculados a historias clínicas |
| `usuarios` | Cuentas de acceso con roles (admin, recepcionista, odontólogo) |

## 📦 Build y Distribución

### Compilar Frontend

```bash
bun run build
```

### Generar Instalador

```bash
bun run make
```

Los instaladores se generarán en la carpeta `dist/`:

- **Windows**: `.exe` (NSIS installer)
- **macOS**: `.dmg`
- **Linux**: `.AppImage`

## 🔧 Scripts Disponibles

| Script | Descripción |
| --- | --- |
| `bun run dev` | Modo desarrollo (Vite + Electron con hot-reload) |
| `bun run build` | Compila el frontend para producción |
| `bun run make` | Genera el instalador de la aplicación |
| `bun run dev:renderer` | Solo inicia el servidor de desarrollo de Vite |
| `bun run rebuild` | Reconstruye módulos nativos para Electron (útil si hay errores con better-sqlite3) |
| `bun run test` | Ejecuta todos los tests (frontend + backend) |
| `bun run test:renderer` | Solo tests del frontend |
| `bun run test:main` | Solo tests del backend |

## 📝 Notas Importantes

- La aplicación funciona **completamente offline** una vez instalada
- Los datos se almacenan localmente en SQLite
- No se requiere conexión a internet para el funcionamiento normal
- La base de datos se crea automáticamente en el primer inicio
- Las migraciones son retrocompatibles: abrir la app con una BD anterior aplica las columnas nuevas sin perder datos

## 🐛 Solución de Problemas

### Error: "electronAPI no está disponible"

Asegúrate de ejecutar la aplicación con `bun run dev` y no directamente con Vite.

### Error: "NODE_MODULE_VERSION" con better-sqlite3

Este error ocurre cuando `better-sqlite3` no está compilado para la versión de Node.js que usa Electron. Solución:

```bash
bun run rebuild
```

O manualmente:
```bash
cd app/main
npx electron-rebuild -f -w better-sqlite3
```

**Nota**: En Windows puede ser necesario instalar Visual Studio Build Tools o Python (para node-gyp). Después de ejecutar `rebuild`, reinicia completamente la aplicación.

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

---

**Desarrollado con ❤️ para clínicas odontológicas**

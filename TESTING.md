# 🧪 Guía de Testing - OdontoSoft Desktop

Esta guía explica cómo ejecutar los tests y qué se está probando en la aplicación.

## 📋 Estructura de Tests

```
/app
 ├── main/
 │    └── __tests__/          # Tests del backend (handlers IPC, lógica de negocio)
 │         ├── pacientesHandler.test.js
 │         └── citasHandler.test.js
 │
 └── renderer/
      └── src/
           └── __tests__/     # Tests del frontend (componentes React)
                ├── Login.test.jsx
                ├── Pacientes.test.jsx
                ├── Dashboard.test.jsx
                ├── components/
                │    └── DynamicForm.test.jsx
                ├── integration/
                │    └── PacienteFlow.test.jsx
                └── utils/
                     └── excelExporter.test.js
```

## 🚀 Ejecutar Tests

### Todos los tests
```bash
bun run test
```

### Solo tests del frontend
```bash
cd app/renderer && bun run test
```

### Solo tests del backend
```bash
cd app/main && bun run test
```

### Modo watch (ejecuta tests al cambiar archivos)
```bash
bun run test:watch
```

### Con cobertura de código
```bash
bun run test:coverage
```

## 📝 Tests Implementados

### Frontend (React Components)

#### 1. **Login.test.jsx**
- ✅ Renderiza el formulario de login
- ✅ Muestra error con credenciales incorrectas
- ✅ Inicia sesión exitosamente con credenciales correctas
- ✅ Valida campos requeridos

#### 2. **Pacientes.test.jsx**
- ✅ Carga y muestra lista de pacientes
- ✅ Permite buscar pacientes
- ✅ Abre modal para crear nuevo paciente
- ✅ Muestra mensaje cuando no hay pacientes

#### 3. **Dashboard.test.jsx**
- ✅ Muestra el título del dashboard
- ✅ Muestra métricas principales
- ✅ Muestra citas de hoy cuando existen
- ✅ Muestra productos con stock bajo

#### 4. **DynamicForm.test.jsx**
- ✅ Renderiza campos dinámicos
- ✅ Actualiza formData cuando se cambia un campo
- ✅ Muestra campos requeridos con validación

#### 5. **PacienteFlow.test.jsx** (Integración)
- ✅ Flujo completo: crear paciente y verificar que aparece en la lista

### Backend (IPC Handlers)

#### 1. **pacientesHandler.test.js**
- ✅ Registra handlers IPC correctamente
- ✅ Agrega nuevo paciente
- ✅ Valida DNI único
- ✅ Obtiene lista de pacientes
- ✅ Elimina paciente

#### 2. **citasHandler.test.js**
- ✅ Valida que hora_fin sea mayor que hora_inicio
- ✅ Valida solapamiento de horarios
- ✅ Permite crear citas no solapadas

### Utilidades

#### 1. **excelExporter.test.js**
- ✅ Exporta datos a Excel correctamente
- ✅ Formatea pacientes para exportación
- ✅ Formatea citas para exportación

## 🎯 Cobertura de Tests

Los tests cubren:

- ✅ **Componentes críticos**: Login, Dashboard, Pacientes
- ✅ **Validaciones**: DNI único, horarios solapados
- ✅ **Flujos de integración**: Crear paciente completo
- ✅ **Utilidades**: Exportación a Excel
- ✅ **Handlers IPC**: Operaciones CRUD básicas

## 📊 Próximos Tests a Implementar

### Alta Prioridad
- [ ] Test de flujo completo: Cita → Factura → Pago
- [ ] Test de validación de campos dinámicos
- [ ] Test de exportación de reportes
- [ ] Test de búsqueda global
- [ ] Test de autenticación y permisos

### Media Prioridad
- [ ] Test de odontograma
- [ ] Test de historias clínicas
- [ ] Test de movimientos de inventario
- [ ] Test de recordatorios automáticos

### Baja Prioridad
- [ ] Test de UI/UX (snapshots)
- [ ] Test de rendimiento
- [ ] Test de accesibilidad

## 🔧 Configuración

### Jest para Frontend
- Configurado en `app/renderer/jest.config.js`
- Usa `jsdom` como entorno de pruebas
- Mock de `electronAPI` y `localStorage`

### Jest para Backend
- Configurado en `app/main/jest.config.js`
- Usa `node` como entorno de pruebas
- Base de datos en memoria para tests

## 💡 Mejores Prácticas

1. **Ejecuta tests antes de commit**: `bun run test`
2. **Mantén cobertura alta**: Objetivo > 80%
3. **Tests deben ser rápidos**: < 5 segundos para suite completa
4. **Tests deben ser independientes**: No dependan de otros tests
5. **Usa mocks apropiados**: Mock de servicios externos y APIs

## 🐛 Debugging Tests

Para debuggear un test específico:

```bash
# Frontend
cd app/renderer && bun run test -- --testNamePattern="Login" --verbose

# Backend
cd app/main && bun run test -- --testNamePattern="pacientesHandler" --verbose
```

## 📈 Reportes de Cobertura

Después de ejecutar `bun run test:coverage`, los reportes se generan en:
- Frontend: `app/renderer/coverage/`
- Backend: `app/main/coverage/`

Abre `coverage/lcov-report/index.html` en el navegador para ver el reporte visual.


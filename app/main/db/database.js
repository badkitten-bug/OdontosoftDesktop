const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Obtiene la ruta de la base de datos según el sistema operativo
 */
function getDatabasePath() {
  let dbPath;

  // Definir entorno (por defecto producción). Se puede forzar con ODONTOSOFT_ENV.
  const env = (process.env.ODONTOSOFT_ENV || process.env.NODE_ENV || 'production').toLowerCase();
  const isDev = env === 'development' || env === 'dev';
  const folderNameBase = 'OdontoSoftDesktop';
  const folderName = isDev ? `${folderNameBase}-Dev` : folderNameBase;
  const fileName = isDev ? 'clinica-dev.db' : 'clinica.db';
  
  if (process.platform === 'win32') {
    // Windows:
    //  Producción: %APPDATA%/OdontoSoftDesktop/clinica.db  (mantiene compatibilidad)
    //  Desarrollo: %APPDATA%/OdontoSoftDesktop-Dev/clinica-dev.db
    const baseDir = process.env.APPDATA || process.env.LOCALAPPDATA || process.cwd();
    dbPath = path.join(baseDir, folderName);
  } else if (process.platform === 'darwin') {
    // macOS:
    //  Producción: ~/Library/Application Support/OdontoSoftDesktop/clinica.db
    //  Desarrollo: ~/Library/Application Support/OdontoSoftDesktop-Dev/clinica-dev.db
    const home = process.env.HOME || process.cwd();
    dbPath = path.join(home, 'Library', 'Application Support', folderName);
  } else {
    // Linux:
    //  Producción: ~/.config/OdontoSoftDesktop/clinica.db
    //  Desarrollo: ~/.config/OdontoSoftDesktop-Dev/clinica-dev.db
    const home = process.env.HOME || process.cwd();
    dbPath = path.join(home, '.config', folderName);
  }

  // Crear directorio si no existe
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  return path.join(dbPath, fileName);
}

/**
 * Inicializa la base de datos y crea las tablas si no existen
 */
function initDatabase() {
  const dbPath = getDatabasePath();
  db = new Database(dbPath);

  // Habilitar foreign keys
  db.pragma('foreign_keys = ON');

  // Crear tablas
  createTables();

  console.log(`Base de datos inicializada en: ${dbPath}`);
  return db;
}

/**
 * Crea todas las tablas necesarias
 */
function createTables() {
  // Tabla de pacientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      datos_extra TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de productos
  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 0,
      precio REAL DEFAULT 0.0,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migración: Agregar stock_minimo si no existe
  try {
    db.exec(`ALTER TABLE productos ADD COLUMN stock_minimo INTEGER DEFAULT 0`);
  } catch (e) {
    // La columna ya existe, ignorar
  }

  // Tabla de historial clínico
  db.exec(`
    CREATE TABLE IF NOT EXISTS historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_paciente INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      fecha TEXT NOT NULL,
      odontograma_data TEXT, -- JSON con datos del odontograma
      datos_extra TEXT DEFAULT '{}', -- JSON con campos dinámicos de salud (peso, edad, alergias, etc.)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);

  // Migración: Agregar columnas si no existen
  try {
    db.exec(`ALTER TABLE historial ADD COLUMN odontograma_data TEXT`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE historial ADD COLUMN datos_extra TEXT DEFAULT '{}'`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE historial ADD COLUMN id_odontologo INTEGER REFERENCES odontologos(id) ON DELETE SET NULL`);
  } catch (e) { /* ya existe */ }
  try {
    db.exec(`ALTER TABLE historial ADD COLUMN id_cita INTEGER REFERENCES citas(id) ON DELETE SET NULL`);
  } catch (e) { /* ya existe */ }

  // Tabla de odontólogos
  db.exec(`
    CREATE TABLE IF NOT EXISTS odontologos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      email TEXT,
      especialidad TEXT,
      matricula TEXT,
      activo INTEGER DEFAULT 1,
      datos_extra TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de horarios de disponibilidad de odontólogos
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_disponibilidad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_odontologo INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
      hora_inicio TEXT NOT NULL, -- Formato HH:MM
      hora_fin TEXT NOT NULL, -- Formato HH:MM
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_odontologo) REFERENCES odontologos(id) ON DELETE CASCADE
    )
  `);

  // Tabla de citas
  db.exec(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_paciente INTEGER NOT NULL,
      id_odontologo INTEGER NOT NULL,
      fecha TEXT NOT NULL, -- Formato YYYY-MM-DD
      hora_inicio TEXT NOT NULL, -- Formato HH:MM
      hora_fin TEXT NOT NULL, -- Formato HH:MM
      estado TEXT DEFAULT 'programada', -- programada, confirmada, en_proceso, completada, cancelada
      asistio INTEGER, -- NULL = no registrado, 1 = asistió, 0 = no asistió
      motivo TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (id_odontologo) REFERENCES odontologos(id) ON DELETE CASCADE
    )
  `);

  // Migración: Agregar asistio si no existe
  try {
    db.exec(`ALTER TABLE citas ADD COLUMN asistio INTEGER`);
  } catch (e) {
    // La columna ya existe, ignorar
  }

  // Tabla de tratamientos (catálogo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL DEFAULT 0.0,
      duracion_minutos INTEGER DEFAULT 30,
      activo INTEGER DEFAULT 1,
      datos_extra TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de tratamientos realizados en citas
  db.exec(`
    CREATE TABLE IF NOT EXISTS citas_tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cita INTEGER NOT NULL,
      id_tratamiento INTEGER NOT NULL,
      cantidad INTEGER DEFAULT 1,
      precio_unitario REAL NOT NULL,
      descuento REAL DEFAULT 0.0,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_cita) REFERENCES citas(id) ON DELETE CASCADE,
      FOREIGN KEY (id_tratamiento) REFERENCES tratamientos(id) ON DELETE CASCADE
    )
  `);

  // Tabla de facturas
  db.exec(`
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      id_cita INTEGER,
      id_paciente INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.0,
      descuento REAL DEFAULT 0.0,
      impuesto REAL DEFAULT 0.0,
      total REAL NOT NULL DEFAULT 0.0,
      estado TEXT DEFAULT 'pendiente', -- pendiente, pagada, cancelada
      observaciones TEXT,
      tipo_comprobante TEXT NOT NULL DEFAULT 'boleta', -- 'boleta' | 'factura'
      serie TEXT,        -- 'B001', 'F001', etc.
      correlativo INTEGER, -- número correlativo dentro de la serie
      cliente_dni TEXT,
      cliente_ruc TEXT,
      cliente_razon_social TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_cita) REFERENCES citas(id) ON DELETE SET NULL,
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);

  // Migraciones para BDs creadas antes de Fase 3
  for (const sql of [
    "ALTER TABLE facturas ADD COLUMN tipo_comprobante TEXT NOT NULL DEFAULT 'boleta'",
    "ALTER TABLE facturas ADD COLUMN serie TEXT",
    "ALTER TABLE facturas ADD COLUMN correlativo INTEGER",
    "ALTER TABLE facturas ADD COLUMN cliente_dni TEXT",
    "ALTER TABLE facturas ADD COLUMN cliente_ruc TEXT",
    "ALTER TABLE facturas ADD COLUMN cliente_razon_social TEXT",
    "ALTER TABLE facturas ADD COLUMN id_odontologo INTEGER REFERENCES odontologos(id) ON DELETE SET NULL",
  ]) {
    try { db.exec(sql); } catch (_) { /* columna ya existe */ }
  }

  // Tabla de pagos
  db.exec(`
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_factura INTEGER NOT NULL,
      monto REAL NOT NULL,
      metodo_pago TEXT NOT NULL, -- efectivo, tarjeta, transferencia, cheque
      fecha TEXT NOT NULL,
      referencia TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_factura) REFERENCES facturas(id) ON DELETE CASCADE
    )
  `);

  // Tabla de configuración de campos dinámicos
  db.exec(`
    CREATE TABLE IF NOT EXISTS campos_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entidad TEXT NOT NULL,
      nombre_campo TEXT NOT NULL,
      name TEXT, -- Clave para formData (ej: 'nombre', 'dni', etc.)
      tipo TEXT NOT NULL,
      requerido INTEGER DEFAULT 0,
      orden INTEGER DEFAULT 0,
      icono TEXT,
      ancho INTEGER DEFAULT 100, -- Porcentaje de ancho (50, 100, etc.)
      es_campo_base INTEGER DEFAULT 0, -- 1 si es campo base, 0 si es dinámico
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entidad, nombre_campo)
    )
  `);

  // Migración: Agregar columnas si no existen
  try {
    db.exec(`ALTER TABLE campos_config ADD COLUMN icono TEXT`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE campos_config ADD COLUMN ancho INTEGER DEFAULT 100`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE campos_config ADD COLUMN es_campo_base INTEGER DEFAULT 0`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE campos_config ADD COLUMN name TEXT`);
  } catch (e) {
    // La columna ya existe, ignorar
  }
  try {
    db.exec(`ALTER TABLE campos_config ADD COLUMN opciones TEXT`); // JSON con las opciones del select
  } catch (e) {
    // La columna ya existe, ignorar
  }

  // Tabla de relaciones entre entidades
  db.exec(`
    CREATE TABLE IF NOT EXISTS relaciones_entidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entidad_origen TEXT NOT NULL,
      entidad_destino TEXT NOT NULL,
      tipo_relacion TEXT NOT NULL, -- 'one-to-many', 'many-to-many', 'one-to-one'
      nombre_relacion TEXT NOT NULL,
      descripcion TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entidad_origen, entidad_destino, nombre_relacion)
    )
  `);

  // Tabla de recordatorios
  db.exec(`
    CREATE TABLE IF NOT EXISTS recordatorios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL, -- 'cita', 'pago', 'stock', 'otro'
      id_entidad INTEGER, -- ID de la entidad relacionada (cita, factura, producto, etc.)
      entidad_tipo TEXT, -- 'cita', 'factura', 'producto', etc.
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      fecha_recordatorio TEXT NOT NULL, -- Fecha en que debe mostrarse
      fecha_vencimiento TEXT, -- Fecha límite (opcional)
      visto INTEGER DEFAULT 0, -- 0 = no visto, 1 = visto
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      visto_at DATETIME
    )
  `);

  // Tabla de movimientos de inventario
  db.exec(`
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_producto INTEGER NOT NULL,
      tipo TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste'
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_nuevo INTEGER NOT NULL,
      motivo TEXT,
      referencia TEXT, -- Referencia externa (factura, orden, etc.)
      usuario TEXT, -- Usuario que realizó el movimiento
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE
    )
  `);

  // Tabla de planes de tratamiento
  db.exec(`
    CREATE TABLE IF NOT EXISTS planes_tratamiento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_paciente INTEGER NOT NULL,
      id_tratamiento INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      fecha_inicio TEXT NOT NULL,
      fecha_fin_estimada TEXT,
      estado TEXT DEFAULT 'activo', -- activo, completado, cancelado, pausado
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (id_tratamiento) REFERENCES tratamientos(id) ON DELETE CASCADE
    )
  `);

  // Tabla de citas dentro de un plan de tratamiento
  db.exec(`
    CREATE TABLE IF NOT EXISTS citas_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plan INTEGER NOT NULL,
      id_cita INTEGER NOT NULL,
      orden INTEGER NOT NULL, -- Orden de la cita en el plan
      completada INTEGER DEFAULT 0,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_plan) REFERENCES planes_tratamiento(id) ON DELETE CASCADE,
      FOREIGN KEY (id_cita) REFERENCES citas(id) ON DELETE CASCADE,
      UNIQUE(id_cita)
    )
  `);

  // Tabla de prescripciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_paciente INTEGER NOT NULL,
      id_cita INTEGER,
      id_odontologo INTEGER NOT NULL,
      medicamentos TEXT NOT NULL, -- JSON con array de medicamentos
      instrucciones TEXT,
      fecha TEXT NOT NULL,
      fecha_vencimiento TEXT,
      activa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (id_cita) REFERENCES citas(id) ON DELETE SET NULL,
      FOREIGN KEY (id_odontologo) REFERENCES odontologos(id) ON DELETE CASCADE
    )
  `);

  // Tabla de archivos adjuntos al historial
  db.exec(`
    CREATE TABLE IF NOT EXISTS archivos_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_historial INTEGER NOT NULL,
      nombre_archivo TEXT NOT NULL,
      ruta_archivo TEXT NOT NULL,
      tipo TEXT NOT NULL, -- 'imagen', 'radiografia', 'documento', 'otro'
      descripcion TEXT,
      tamano INTEGER, -- Tamaño en bytes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_historial) REFERENCES historial(id) ON DELETE CASCADE
    )
  `);

  // Tabla de usuarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      email TEXT,
      rol TEXT NOT NULL DEFAULT 'recepcionista', -- 'admin', 'recepcionista', 'odontologo'
      activo INTEGER DEFAULT 1,
      id_odontologo INTEGER, -- Si el usuario es odontólogo, referencia
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      FOREIGN KEY (id_odontologo) REFERENCES odontologos(id) ON DELETE SET NULL
    )
  `);

  // Tabla de permisos por rol
  db.exec(`
    CREATE TABLE IF NOT EXISTS permisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rol TEXT NOT NULL,
      modulo TEXT NOT NULL, -- 'pacientes', 'citas', 'facturacion', etc.
      permiso TEXT NOT NULL, -- 'ver', 'crear', 'editar', 'eliminar'
      activo INTEGER DEFAULT 1,
      UNIQUE(rol, modulo, permiso)
    )
  `);

  // Tabla de promociones
  db.exec(`
    CREATE TABLE IF NOT EXISTS promociones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      tipo TEXT NOT NULL, -- 'descuento_porcentaje', 'descuento_fijo', 'paquete'
      valor REAL NOT NULL, -- Porcentaje o monto fijo
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      activa INTEGER DEFAULT 1,
      aplica_a TEXT, -- 'tratamiento', 'producto', 'factura', 'todos'
      id_entidad INTEGER, -- ID del tratamiento/producto si aplica
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de cupones
  db.exec(`
    CREATE TABLE IF NOT EXISTS cupones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      id_promocion INTEGER,
      descuento_porcentaje REAL,
      descuento_fijo REAL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      usos_maximos INTEGER DEFAULT 1,
      usos_actuales INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_promocion) REFERENCES promociones(id) ON DELETE SET NULL
    )
  `);

  // Tabla de backups
  db.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_archivo TEXT NOT NULL,
      ruta_archivo TEXT NOT NULL,
      tamano INTEGER, -- Tamaño en bytes
      tipo TEXT DEFAULT 'automatico', -- 'automatico', 'manual'
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de licencia (singleton id = 1).
  // tipo: 'demo' por defecto; cambia a 'esencial' / 'pro' / 'cloud' al activar una clave válida.
  db.exec(`
    CREATE TABLE IF NOT EXISTS licencia (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tipo TEXT NOT NULL DEFAULT 'demo',
      clave TEXT,
      email_cliente TEXT,
      nombre_cliente TEXT,
      fingerprint TEXT,
      activada_en DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.prepare(
    `INSERT OR IGNORE INTO licencia (id, tipo) VALUES (1, 'demo')`
  ).run();

  // Tabla de configuración de la clínica (singleton: siempre id = 1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion_clinica (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre_clinica TEXT NOT NULL DEFAULT 'Mi Clínica',
      ruc TEXT,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      logo_path TEXT,
      moneda_simbolo TEXT NOT NULL DEFAULT 'S/',
      moneda_codigo TEXT NOT NULL DEFAULT 'PEN',
      igv_porcentaje REAL NOT NULL DEFAULT 18.0,
      formato_fecha TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
      setup_completado INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Garantizar que exista la fila singleton
  db.prepare(
    `INSERT OR IGNORE INTO configuracion_clinica
     (id, nombre_clinica, moneda_simbolo, moneda_codigo, igv_porcentaje, formato_fecha, setup_completado)
     VALUES (1, 'Mi Clínica', 'S/', 'PEN', 18.0, 'DD/MM/YYYY', 0)`
  ).run();

  // Crear índices para mejorar el rendimiento
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pacientes_dni ON pacientes(dni);
    CREATE INDEX IF NOT EXISTS idx_historial_paciente ON historial(id_paciente);
    CREATE INDEX IF NOT EXISTS idx_campos_config_entidad ON campos_config(entidad);
    CREATE INDEX IF NOT EXISTS idx_odontologos_activo ON odontologos(activo);
    CREATE INDEX IF NOT EXISTS idx_horarios_odontologo ON horarios_disponibilidad(id_odontologo);
    CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
    CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(id_paciente);
    CREATE INDEX IF NOT EXISTS idx_citas_odontologo ON citas(id_odontologo);
    CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
    CREATE INDEX IF NOT EXISTS idx_facturas_paciente ON facturas(id_paciente);
    CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
    CREATE INDEX IF NOT EXISTS idx_pagos_factura ON pagos(id_factura);
    CREATE INDEX IF NOT EXISTS idx_relaciones_origen ON relaciones_entidades(entidad_origen);
    CREATE INDEX IF NOT EXISTS idx_relaciones_destino ON relaciones_entidades(entidad_destino);
    CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_recordatorio);
    CREATE INDEX IF NOT EXISTS idx_recordatorios_visto ON recordatorios(visto);
    CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(id_producto);
    CREATE INDEX IF NOT EXISTS idx_planes_paciente ON planes_tratamiento(id_paciente);
    CREATE INDEX IF NOT EXISTS idx_citas_plan_plan ON citas_plan(id_plan);
    CREATE INDEX IF NOT EXISTS idx_prescripciones_paciente ON prescripciones(id_paciente);
    CREATE INDEX IF NOT EXISTS idx_archivos_historial ON archivos_historial(id_historial);
    CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
    CREATE INDEX IF NOT EXISTS idx_permisos_rol ON permisos(rol);
    CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones(codigo);
  `);

  // Insertar relaciones predefinidas
  insertRelacionesPredefinidas(db);
}

/**
 * Inserta relaciones predefinidas entre entidades
 */
function insertRelacionesPredefinidas(db) {
  const relacionesPredefinidas = [
    {
      entidad_origen: 'pacientes',
      entidad_destino: 'historial',
      tipo_relacion: 'one-to-many',
      nombre_relacion: 'historias_clinicas',
      descripcion: 'Un paciente puede tener múltiples historias clínicas',
    },
    {
      entidad_origen: 'pacientes',
      entidad_destino: 'citas',
      tipo_relacion: 'one-to-many',
      nombre_relacion: 'citas',
      descripcion: 'Un paciente puede tener múltiples citas',
    },
    {
      entidad_origen: 'pacientes',
      entidad_destino: 'facturas',
      tipo_relacion: 'one-to-many',
      nombre_relacion: 'facturas',
      descripcion: 'Un paciente puede tener múltiples facturas',
    },
    {
      entidad_origen: 'odontologos',
      entidad_destino: 'citas',
      tipo_relacion: 'one-to-many',
      nombre_relacion: 'citas',
      descripcion: 'Un odontólogo puede tener múltiples citas',
    },
    {
      entidad_origen: 'citas',
      entidad_destino: 'tratamientos',
      tipo_relacion: 'many-to-many',
      nombre_relacion: 'tratamientos',
      descripcion: 'Una cita puede tener múltiples tratamientos',
    },
    {
      entidad_origen: 'citas',
      entidad_destino: 'facturas',
      tipo_relacion: 'one-to-one',
      nombre_relacion: 'factura',
      descripcion: 'Una cita puede generar una factura',
    },
    {
      entidad_origen: 'facturas',
      entidad_destino: 'pagos',
      tipo_relacion: 'one-to-many',
      nombre_relacion: 'pagos',
      descripcion: 'Una factura puede tener múltiples pagos',
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO relaciones_entidades 
    (entidad_origen, entidad_destino, tipo_relacion, nombre_relacion, descripcion, activo)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  relacionesPredefinidas.forEach((relacion) => {
    try {
      stmt.run(
        relacion.entidad_origen,
        relacion.entidad_destino,
        relacion.tipo_relacion,
        relacion.nombre_relacion,
        relacion.descripcion
      );
    } catch (error) {
      // Ignorar errores de duplicados
      console.log(`Relación ya existe: ${relacion.entidad_origen} → ${relacion.entidad_destino}`);
    }
  });
}

/**
 * Obtiene la instancia de la base de datos
 */
function getDatabase() {
  if (!db) {
    throw new Error('Base de datos no inicializada. Llama a initDatabase() primero.');
  }
  return db;
}

/**
 * Cierra la conexión con la BD si está abierta. Idempotente.
 * Útil antes de copiar/reemplazar el archivo de la BD (restore, etc).
 */
function closeDatabase() {
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.error('Error cerrando BD:', e);
    } finally {
      db = null;
    }
  }
}

/**
 * Cierra y vuelve a abrir la BD. Útil tras restaurar un backup.
 */
function reopenDatabase() {
  closeDatabase();
  return initDatabase();
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  reopenDatabase,
  getDatabasePath,
};


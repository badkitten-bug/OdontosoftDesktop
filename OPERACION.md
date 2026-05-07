# Operación — OdontoSoft Desktop

Guía interna (no para clientes). Documenta cómo:
1. Generar el par de claves de licencia (una sola vez al inicio del negocio).
2. Emitir una licencia para un cliente que pagó.
3. Publicar un release nuevo en GitHub.

---

## 1. Generar el par de claves RSA (una sola vez)

```bash
node scripts/generarParClaves.js
```

Esto crea:
- `secrets/license-private.pem` — **NUNCA** se commitea ni se sube a la nube.
  - Guarda una copia en una USB o gestor de contraseñas (Bitwarden) por si se pierde.
  - Si esta clave se filtra, alguien podría emitir licencias falsas. Si pasa, regeneras
    el par y todas las licencias actuales se invalidan (avisas a clientes y reactivas).
- `secrets/license-public.pem` — esta sí entra en el código fuente.

**Después de generar:**
1. Abre `secrets/license-public.pem`, copia el contenido completo (incluye los headers
   `-----BEGIN PUBLIC KEY-----` y `-----END PUBLIC KEY-----`).
2. Pega el contenido en `app/main/auth/licencia.js`, reemplazando el bloque
   `PUBLIC_KEY_PLACEHOLDER...`.
3. Reconstruye la app y publícala como nueva versión (ver §3).

⚠️ Antes de reemplazar el placeholder, **ninguna licencia funciona**. La app queda
todo el tiempo en modo demo. Es una salvaguarda para que no publiques builds rotos.

---

## 2. Emitir una licencia a un cliente

### Flujo completo

1. Cliente paga (Yape/Plin/transferencia).
2. Cliente abre la app → menú "Licencia" → copia su **fingerprint** (32 caracteres hex).
3. Te lo manda por WhatsApp con su email y el plan que compró.
4. Tú corres en tu PC:
   ```bash
   node scripts/generarLicencia.js \
     --fingerprint=abc123def456789... \
     --tipo=esencial \
     --email=cliente@gmail.com \
     --nombre="Clínica Sonrisas Lima"
   ```
5. El script imprime una clave larga. Copia y pega en WhatsApp al cliente.
6. Cliente vuelve a la app → "Licencia" → pega la clave → **Activar**. Listo.

### Tipos válidos para `--tipo`

- `esencial` — para Esencial Local (S/ 349)
- `pro` — para Pro Local (S/ 699)
- `cloud` — reservado para futuro (cuando exista la versión cloud)

### Renovaciones

Las licencias por defecto **no expiran**. Si quieres emitir una renovación
limitada en tiempo (ej: 1 año):
```bash
node scripts/generarLicencia.js --fingerprint=... --tipo=pro --email=... --expira=2027-05-06
```

### Si el cliente cambia de PC

1. Que ejecute "Volver a modo demo" en la pantalla Licencia (o reinstala).
2. Te manda el fingerprint de la PC nueva.
3. Le emites una clave nueva con los mismos datos pero el fingerprint nuevo.
4. Política sugerida: **1 transferencia/año gratis**, las siguientes a S/ 50.

---

## 3. Publicar un release en GitHub Releases

### Una vez (preparación)

1. Crea el repositorio público o privado en GitHub (sugerido: `odontosoft/desktop`).
2. Si es privado, GitHub Releases sigue funcionando, pero los clientes necesitan
   un link directo al asset (no pueden navegar el repo). Suele ser mejor **público**
   con releases visibles para que la gente confíe en lo que descarga.
3. En la landing (`Odontosoft/src/config.ts`), confirma que `downloadUrl` apunta
   al repositorio correcto:
   ```ts
   export const downloadUrl = 'https://github.com/odontosoft/desktop/releases/latest';
   ```

### Cada release (manual, paso a paso)

1. En tu PC, asegúrate de que la clave pública correcta esté pegada en
   `app/main/auth/licencia.js`.
2. Bumpea la versión en `package.json` (raíz). Ej: `1.0.0` → `1.1.0`.
3. Construye los instaladores:
   ```bash
   bun run make
   ```
   Esto deja los `.exe`, `.dmg` y/o `.AppImage` en `dist/`.
4. Crea un tag y súbelo:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
5. En GitHub → tu repo → **Releases → Draft a new release**:
   - Tag: `v1.1.0`
   - Title: `OdontoSoft Desktop v1.1.0`
   - Description: changelog corto (qué hay nuevo, qué se arregló).
   - Adjunta los archivos de `dist/` (sólo el `.exe`/`.dmg`/`.AppImage`, no la carpeta entera).
6. Publish release.

A partir de ahí, `https://github.com/odontosoft/desktop/releases/latest` apunta a
ese release, y el botón "Descargar prueba gratis" de la landing lo encuentra solo.

### Automatizar (opcional, después)

Cuando esto se vuelva manual y tedioso, montas un workflow GitHub Actions que en
cada push de tag corra `bun run make` y suba los artefactos automáticamente. No
es prioridad para los primeros 10 clientes.

---

## 4. Checklist antes de publicar v1.0.0

- [ ] `secrets/license-private.pem` existe y está respaldada offline.
- [ ] `app/main/auth/licencia.js` tiene la clave pública real (no el placeholder).
- [ ] Probaste emitir una licencia y activarla en una PC limpia.
- [ ] Probaste el modo demo: registrar 10 pacientes y confirmar que el 11 da error.
- [ ] El icono `build/icon.ico` existe (Windows lo necesita).
- [ ] La landing muestra el botón de descarga apuntando al repo correcto.
- [ ] El form de Tally está creado y su ID está pegado en
      `Odontosoft/src/config.ts → tallyCloudWaitlistFormId`.
- [ ] Probaste el flujo completo en una PC virgen (no la tuya): instala → wizard →
      registra paciente → activa licencia → registra más pacientes.

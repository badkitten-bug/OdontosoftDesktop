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

### Automatizar con GitHub Actions (recomendado)

El repo ya incluye `.github/workflows/release.yml`. Funciona así:

1. Bumpea versión en `package.json` y commitea.
2. Crea y empuja un tag:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. El workflow se dispara solo: corre `bun install`, build, electron-rebuild, y
   `electron-builder --publish always`. Esto crea el release de GitHub y sube el
   `.exe` automáticamente.

Por defecto la matrix sólo construye **Windows**. Para sumar macOS/Linux, edita
`.github/workflows/release.yml` y agrega `macos-latest` / `ubuntu-latest` a la
sección `strategy.matrix.os`.

---

## 4. Code signing del `.exe` (Windows)

Sin firmar, el primer cliente que descargue el `.exe` verá la alerta roja de
SmartScreen ("Windows protegió su PC"), lo que tira la conversión casi a 0.

### Comprar un certificado

- **Sectigo Code Signing** (más barato, ~$70-100/año) o **DigiCert** (~$300/año).
- Pide el certificado **a tu nombre o de tu empresa**.
- Tras la verificación de identidad (puede tomar 1-3 días), recibes un archivo
  `.pfx` con contraseña.

### Configurar firma local (build manual)

```bash
# En PowerShell:
$env:CSC_LINK = "C:\ruta\a\tu-certificado.pfx"
$env:CSC_KEY_PASSWORD = "tu-contraseña"
bun run make
```

El `.exe` resultante en `dist/` queda firmado.

### Configurar firma en GitHub Actions (automatizado)

1. Convierte el `.pfx` a base64 para guardarlo como secret:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.pfx")) | Set-Clipboard
   ```
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `CSC_LINK` → pega el contenido base64 (electron-builder lo decodifica solo).
   - `CSC_KEY_PASSWORD` → la contraseña del .pfx.
3. El workflow ya está preparado para usarlos; el siguiente release saldrá firmado.

### Verificar la firma

En el `.exe` descargado: clic derecho → Propiedades → pestaña **Firmas digitales**.
Debe aparecer "OdontoSoft" como firmante.

Después de firmar varios releases (3-5), Microsoft empieza a confiar en tu
certificado y SmartScreen ya no muestra alertas.

---

## 5. Checklist antes de publicar v1.0.0

- [ ] `secrets/license-private.pem` existe y está respaldada offline.
- [ ] `app/main/auth/licencia.js` tiene la clave pública real (no el placeholder).
- [ ] Probaste emitir una licencia y activarla en una PC limpia.
- [ ] Probaste el modo demo: registrar 30 pacientes y confirmar que el 31 da error.
- [ ] `build/icon.ico` existe (ver `build/README.md` para generarlo).
- [ ] `build/license_es.txt` está revisado (tiene tu razón social/contacto correctos).
- [ ] `electron-builder.yml`: `publish.owner` y `publish.repo` apuntan a tu repo real.
- [ ] La landing muestra el botón de descarga apuntando al repo correcto
      (`Odontosoft/src/config.ts → downloadUrl`).
- [ ] El form de Tally está creado y su ID está pegado en
      `Odontosoft/src/config.ts → tallyCloudWaitlistFormId`.
- [ ] (Opcional pero recomendado) Comprar y configurar certificado de code signing.
- [ ] (Opcional) Secrets `CSC_LINK` y `CSC_KEY_PASSWORD` en GitHub Actions.
- [ ] Probaste el flujo completo en una PC virgen (no la tuya): instala → wizard →
      registra paciente → activa licencia → registra más pacientes.

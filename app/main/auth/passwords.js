/**
 * Validación de contraseña fuerte.
 * Reglas:
 *  - Mínimo 8 caracteres.
 *  - Al menos una letra mayúscula.
 *  - Al menos un dígito.
 *
 * Devuelve { ok: boolean, error: string|null }.
 */
function validarPasswordFuerte(password) {
  if (typeof password !== 'string') {
    return { ok: false, error: 'La contraseña es obligatoria' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: 'La contraseña debe incluir al menos una letra mayúscula' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: 'La contraseña debe incluir al menos un número' };
  }
  return { ok: true, error: null };
}

module.exports = { validarPasswordFuerte };

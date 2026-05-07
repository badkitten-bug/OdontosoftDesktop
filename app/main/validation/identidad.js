/**
 * Validaciones de identidad para Perú.
 *  - DNI: 8 dígitos numéricos.
 *  - RUC: 11 dígitos. Verifica el dígito de control oficial de SUNAT.
 *
 * Las funciones devuelven { ok: boolean, error: string|null }.
 */

function validarDNI(dni) {
  if (dni === null || dni === undefined || dni === '') {
    return { ok: false, error: 'DNI vacío' };
  }
  const limpio = String(dni).trim();
  if (!/^\d{8}$/.test(limpio)) {
    return { ok: false, error: 'El DNI debe tener exactamente 8 dígitos' };
  }
  return { ok: true, error: null };
}

function validarRUC(ruc) {
  if (ruc === null || ruc === undefined || ruc === '') {
    return { ok: false, error: 'RUC vacío' };
  }
  const limpio = String(ruc).trim();
  if (!/^\d{11}$/.test(limpio)) {
    return { ok: false, error: 'El RUC debe tener exactamente 11 dígitos' };
  }
  // Sólo aceptamos prefijos válidos de SUNAT
  if (!/^(10|15|17|20)/.test(limpio)) {
    return { ok: false, error: 'El RUC no comienza con un prefijo válido (10, 15, 17 ó 20)' };
  }
  // Verificación del dígito de control (algoritmo SUNAT)
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = limpio.split('').map(Number);
  let suma = 0;
  for (let i = 0; i < 10; i += 1) {
    suma += digitos[i] * pesos[i];
  }
  const resto = suma % 11;
  const verificadorEsperado = (11 - resto) % 10;
  if (verificadorEsperado !== digitos[10]) {
    return { ok: false, error: 'RUC inválido (dígito verificador no coincide)' };
  }
  return { ok: true, error: null };
}

module.exports = { validarDNI, validarRUC };

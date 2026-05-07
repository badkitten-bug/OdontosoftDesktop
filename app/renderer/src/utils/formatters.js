/**
 * Formateo de moneda y fecha basado en la configuración de la clínica.
 *
 * `setClinicConfigCache` se llama desde `UserContext` cada vez que la config
 * cambia (login, recarga o tras finalizar el wizard / guardar en Configuración).
 * Los componentes que necesitan formatear valores pueden importar `formatMoneda`
 * y `formatFecha` directamente sin pasar por contexto.
 */

const DEFAULTS = {
  moneda_simbolo: 'S/',
  moneda_codigo: 'PEN',
  formato_fecha: 'DD/MM/YYYY',
  igv_porcentaje: 18,
};

let _config = { ...DEFAULTS };

export function setClinicConfigCache(cfg) {
  if (!cfg) return;
  _config = {
    ...DEFAULTS,
    ...cfg,
    igv_porcentaje:
      cfg.igv_porcentaje !== undefined && cfg.igv_porcentaje !== null
        ? Number(cfg.igv_porcentaje)
        : DEFAULTS.igv_porcentaje,
  };
}

export function getClinicConfigCache() {
  return _config;
}

export function formatMoneda(valor, opciones = {}) {
  const numero = Number(valor);
  const segura = Number.isFinite(numero) ? numero : 0;
  const simbolo = opciones.simbolo || _config.moneda_simbolo || 'S/';
  return `${simbolo} ${segura.toFixed(2)}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Formatea un Date o un string de fecha (YYYY-MM-DD o ISO) según la
 * preferencia de la clínica.
 */
export function formatFecha(input) {
  if (!input) return '';
  let d;
  if (input instanceof Date) {
    d = input;
  } else if (typeof input === 'string') {
    // Si viene en YYYY-MM-DD lo construimos como local para evitar shift por UTC
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(input);
  } else {
    return '';
  }
  if (Number.isNaN(d.getTime())) return '';

  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();

  switch (_config.formato_fecha) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default: return `${dd}/${mm}/${yyyy}`;
  }
}

export function getIgvPorcentaje() {
  return _config.igv_porcentaje;
}

export function getMonedaSimbolo() {
  return _config.moneda_simbolo;
}

/**
 * "Mis fechas especiales": el cliente agenda cumpleaños y aniversarios y le
 * avisamos por WhatsApp unos días antes. Acá viven las condiciones del
 * servicio; la página y el script del formulario leen de este archivo.
 *
 * Los mismos topes están repetidos en scripts/recordatorios.gs, que es quien
 * de verdad los hace cumplir: si se cambia uno, cambiar el otro.
 */

export const RECORDATORIOS = {
  nombre: 'Tus fechas especiales',
  /** Tope de fechas por persona en un mismo envío. */
  maximo: 6,
  /** El descuento arranca en la tercera fecha. */
  fechasParaDescuento: 3,
  /** Vale una sola vez, en el primer ramo que encargue. */
  descuento: 15,
  /** Con cuántos días de anticipación se avisa. */
  diasDeAviso: 10,
  /**
   * Dirección de la aplicación web de Apps Script que guarda cada alta en la
   * planilla privada (ver scripts/recordatorios.gs). No es un secreto: viaja
   * en el JavaScript de la página. Si quedara vacía, el alta sale por
   * WhatsApp con las fechas escritas en el mensaje. PUBLIC_RECORDATORIOS_URL
   * permite apuntar a otra implementación sin tocar el código.
   */
  destino:
    (import.meta.env.PUBLIC_RECORDATORIOS_URL as string | undefined) ??
    'https://script.google.com/macros/s/AKfycbwplL68KiF2lReBoIalpMzyYnINT9ZkSvI5mfUle4NuzRcU-aKEhY0PXID2NRE2_4Pj/exec',
} as const;

export const OCASIONES = ['Cumpleaños', 'Aniversario', 'Día de la madre', 'Día del padre', 'Otra fecha'] as const;

export const MESES = [
  { nombre: 'enero', dias: 31 },
  { nombre: 'febrero', dias: 29 },
  { nombre: 'marzo', dias: 31 },
  { nombre: 'abril', dias: 30 },
  { nombre: 'mayo', dias: 31 },
  { nombre: 'junio', dias: 30 },
  { nombre: 'julio', dias: 31 },
  { nombre: 'agosto', dias: 31 },
  { nombre: 'septiembre', dias: 30 },
  { nombre: 'octubre', dias: 31 },
  { nombre: 'noviembre', dias: 30 },
  { nombre: 'diciembre', dias: 31 },
] as const;

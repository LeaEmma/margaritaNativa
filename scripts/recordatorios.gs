/**
 * Tus fechas especiales — base de datos y avisos.
 *
 * Este archivo NO corre en el sitio: se pega en una planilla de Google
 * PRIVADA del Drive de Margarita Nativa (no la de precios, que está
 * publicada) desde Extensiones > Apps Script. Hace tres cosas:
 *
 *   1. doPost: recibe cada alta del formulario de /recordatorios, la valida y
 *      agrega una fila por fecha en la hoja "Recordatorios".
 *   2. Avisa por mail a la cuenta dueña de la planilla que hubo un alta.
 *   3. resumenDiario: cada mañana manda un mail con las fechas que caen dentro
 *      de los próximos 10 días y todavía no se avisaron, con un enlace que
 *      abre WhatsApp con el mensaje para el cliente ya escrito.
 *
 * Puesta en marcha (una sola vez):
 *   a. Crear una planilla nueva en el Drive de Margarita Nativa, sin
 *      compartirla ni publicarla.
 *   b. Extensiones > Apps Script, borrar lo que haya, pegar este archivo y
 *      guardar.
 *   c. Elegir la función `instalar`, Ejecutar y aceptar los permisos: crea la
 *      hoja y programa el resumen de cada mañana.
 *   d. Implementar > Nueva implementación > Aplicación web, "Ejecutar como:
 *      yo" y "Quién tiene acceso: cualquier persona". Copiar la URL que
 *      termina en /exec.
 *   e. Esa URL va en PUBLIC_RECORDATORIOS_URL (variable de entorno de Netlify
 *      y archivo .env local).
 *   Si después se cambia el código: Implementar > Gestionar implementaciones >
 *   editar > Versión nueva. La URL no cambia.
 *
 * Seguridad. La URL de la aplicación web es pública (viaja en el JavaScript
 * del sitio), así que cualquiera puede mandarle datos. Por eso:
 *   - Solo se puede escribir. No hay forma de leer la planilla desde afuera:
 *     doGet no devuelve nada y doPost responde ok o un motivo, nunca datos.
 *   - Todo lo que llega se recorta, se valida contra listas cerradas y se
 *     guarda como texto (nunca como fórmula).
 *   - Topes: por número de teléfono, por hora y de filas totales. Un robot
 *     puede llenar el cupo de una hora, no la planilla.
 *   - Trampa para robots (campo oculto) y tiempo mínimo de carga.
 *   - Las fechas repetidas no se duplican.
 * Apps Script no informa la IP de quien envía, así que no se puede limitar por
 * origen. Si aparece abuso, el paso siguiente es un captcha (Turnstile).
 */

const HOJA = 'Recordatorios';
const ENCABEZADOS = ['Alta', 'Nombre', 'WhatsApp', 'Día', 'Mes', 'Ocasión', 'De quién', 'Último aviso', 'Descuento usado', 'Baja'];
const COL = { alta: 0, nombre: 1, telefono: 2, dia: 3, mes: 4, ocasion: 5, para: 6, aviso: 7, usado: 8, baja: 9 };

const DIAS_DE_AVISO = 10;
const FECHAS_PARA_DESCUENTO = 3;
const DESCUENTO = 15;

const MAXIMO_POR_ENVIO = 6;
const MAXIMO_POR_TELEFONO = 12; // fechas activas por número
const MAXIMO_POR_HORA = 60; // filas nuevas por hora, entre todos
const MAXIMO_TOTAL = 5000;
const DEMORA_MINIMA = 4000; // ms: nadie completa el formulario más rápido
const TAMANO_MAXIMO = 2500; // caracteres del pedido

const OCASIONES = ['Cumpleaños', 'Aniversario', 'Día de la madre', 'Día del padre', 'Otra fecha'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_DEL_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function hoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.appendRow(ENCABEZADOS);
    h.setFrozenRows(1);
    // Nombre, teléfono y "de quién" se guardan como texto, nunca como fórmula.
    ['B:B', 'C:C', 'G:G'].forEach((columna) => h.getRange(columna).setNumberFormat('@'));
  }
  return h;
}

function instalar() {
  hoja();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'resumenDiario')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumenDiario').timeBased().everyDays(1).atHour(8).create();
}

function responder(cuerpo) {
  return ContentService.createTextOutput(JSON.stringify(cuerpo)).setMimeType(ContentService.MimeType.JSON);
}

/** No hay nada para leer desde afuera. */
function doGet() {
  return responder({ ok: false });
}

/**
 * Texto plano de una línea, sin caracteres de control y sin los signos con
 * los que Sheets reconoce una fórmula al principio (= + - @).
 */
function limpio(valor, largo) {
  return String(valor == null ? '' : valor)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s=+\-@']+/, '')
    .trim()
    .slice(0, largo);
}

const soloDigitos = (valor) => String(valor).replace(/\D/g, '');

function doPost(e) {
  const candado = LockService.getScriptLock();
  try {
    const crudo = (e && e.postData && e.postData.contents) || '';
    if (!crudo || crudo.length > TAMANO_MAXIMO) return responder({ ok: false, motivo: 'datos' });
    const alta = JSON.parse(crudo);

    // A los robots se les dice que salió bien, para que no prueben otra cosa.
    if (alta.sitio || !(Number(alta.demora) >= DEMORA_MINIMA)) return responder({ ok: true });

    const nombre = limpio(alta.nombre, 60);
    // Celular argentino: código de área (11, 2xx o 3xx) + número, 10 dígitos,
    // sin 0 ni 15.
    const telefono = soloDigitos(limpio(alta.telefono, 25));
    if (!nombre || !/^(11\d{8}|[23]\d{9})$/.test(telefono) || alta.acepto !== true) {
      return responder({ ok: false, motivo: 'datos' });
    }
    if (!Array.isArray(alta.fechas) || !alta.fechas.length || alta.fechas.length > MAXIMO_POR_ENVIO) {
      return responder({ ok: false, motivo: 'datos' });
    }

    const fechas = [];
    for (const f of alta.fechas) {
      const dia = Number(f && f.dia);
      const mes = Number(f && f.mes);
      const para = limpio(f && f.para, 40);
      const ocasion = OCASIONES.indexOf(f && f.ocasion) >= 0 ? f.ocasion : '';
      const valida =
        Number.isInteger(dia) && Number.isInteger(mes) && mes >= 1 && mes <= 12 && dia >= 1 && dia <= DIAS_DEL_MES[mes - 1];
      if (!valida || !para || !ocasion) return responder({ ok: false, motivo: 'datos' });
      fechas.push({ dia, mes, ocasion, para });
    }

    candado.waitLock(20000);
    const h = hoja();
    const existentes = h.getDataRange().getValues().slice(1);
    const haceUnaHora = Date.now() - 3600000;

    if (existentes.length + fechas.length > MAXIMO_TOTAL) return limite('La planilla llegó al tope de filas.');
    const recientes = existentes.filter((fila) => fila[COL.alta] instanceof Date && fila[COL.alta].getTime() > haceUnaHora);
    if (recientes.length + fechas.length > MAXIMO_POR_HORA) return limite('Se superó el tope de altas por hora.');

    const propias = existentes.filter((fila) => soloDigitos(fila[COL.telefono]) === telefono && !fila[COL.baja]);
    const clave = (dia, mes, para) => dia + '/' + mes + '/' + String(para).toLowerCase();
    const yaCargadas = propias.map((fila) => clave(fila[COL.dia], fila[COL.mes], fila[COL.para]));
    const nuevas = fechas.filter((f, i) => {
      const k = clave(f.dia, f.mes, f.para);
      return yaCargadas.indexOf(k) < 0 && fechas.findIndex((g) => clave(g.dia, g.mes, g.para) === k) === i;
    });
    if (propias.length + nuevas.length > MAXIMO_POR_TELEFONO) return responder({ ok: false, motivo: 'limite' });

    if (nuevas.length) {
      const ahora = new Date();
      const filas = nuevas.map((f) => [ahora, nombre, telefono, f.dia, f.mes, f.ocasion, f.para, '', '', '']);
      h.getRange(h.getLastRow() + 1, 1, filas.length, ENCABEZADOS.length).setValues(filas);
      candado.releaseLock();
      avisarAlta(nombre, nuevas.length);
    }
    return responder({ ok: true });
  } catch (error) {
    return responder({ ok: false, motivo: 'error' });
  } finally {
    try {
      candado.releaseLock();
    } catch (ignorado) {}
  }
}

/** Corta el alta y avisa por mail, como mucho una vez cada seis horas. */
function limite(detalle) {
  const cache = CacheService.getScriptCache();
  if (!cache.get('alerta')) {
    cache.put('alerta', '1', 21600);
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'Tus fechas especiales: se frenaron altas',
      detalle + ' Puede ser un robot cargando datos falsos: conviene revisar la hoja "' + HOJA + '".'
    );
  }
  return responder({ ok: false, motivo: 'limite' });
}

/** Mail corto, sin datos del cliente más que el nombre. */
function avisarAlta(nombre, cantidad) {
  try {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'Nuevas fechas especiales: ' + nombre + ' (' + cantidad + ')',
      nombre + ' agendó ' + cantidad + (cantidad === 1 ? ' fecha.' : ' fechas.') + ' Están en la hoja "' + HOJA + '".'
    );
  } catch (ignorado) {}
}

/** Número con formato de wa.me: solo dígitos y con 549 adelante. */
function numeroWhatsApp(telefono) {
  let n = soloDigitos(telefono).replace(/^0+/, '');
  if (n.indexOf('54') !== 0) n = '549' + n;
  return n;
}

function resumenDiario() {
  const h = hoja();
  const filas = h.getDataRange().getValues().slice(1);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // El descuento es por cliente: tres fechas activas o más y sin usar.
  const activas = {};
  const usado = {};
  for (const fila of filas) {
    const tel = soloDigitos(fila[COL.telefono]);
    if (!fila[COL.baja]) activas[tel] = (activas[tel] || 0) + 1;
    if (fila[COL.usado]) usado[tel] = true;
  }

  const proximas = [];
  filas.forEach((fila, i) => {
    const dia = Number(fila[COL.dia]);
    const mes = Number(fila[COL.mes]);
    if (fila[COL.baja] || !dia || !mes) return;

    let fecha = new Date(hoy.getFullYear(), mes - 1, dia);
    if (fecha < hoy) fecha = new Date(hoy.getFullYear() + 1, mes - 1, dia);
    const faltan = Math.round((fecha - hoy) / 86400000);
    if (faltan > DIAS_DE_AVISO) return;

    // Ya salió en un resumen de esta vuelta del calendario.
    const ultimo = fila[COL.aviso];
    if (ultimo instanceof Date && (hoy - ultimo) / 86400000 < 300) return;

    const tel = soloDigitos(fila[COL.telefono]);
    const nombre = fila[COL.nombre];
    const para = fila[COL.para];
    const ocasion = fila[COL.ocasion];
    const cuando = dia + ' de ' + MESES[mes - 1];
    const conDescuento = activas[tel] >= FECHAS_PARA_DESCUENTO && !usado[tel];
    const queEs =
      ocasion === 'Cumpleaños' ? 'el cumpleaños de ' + para
      : ocasion === 'Aniversario' ? 'el aniversario de ' + para
      : ocasion === 'Otra fecha' ? 'la fecha de ' + para
      : 'el ' + ocasion.toLowerCase() + ' (' + para + ')';
    const aviso =
      '¡Hola ' + nombre + '! Te escribimos de Margarita Nativa para recordarte que el ' + cuando + ' es ' + queEs +
      '. Es solo un aviso, sin compromiso. Si querés regalar flores, respondé este mensaje y te ayudamos a elegir el ramo: tenés envío gratis en CABA' +
      (conDescuento ? ' y ' + DESCUENTO + ' % de descuento por ser tu primer ramo' : '') +
      '. Si no querés recibir más avisos, respondé BAJA.';

    proximas.push({
      fila: i + 2,
      faltan,
      linea: cuando + ' (faltan ' + faltan + ' días) — ' + ocasion + ' · ' + para + ' · avisar a ' + nombre + (conDescuento ? ' · con ' + DESCUENTO + ' %' : ''),
      enlace: 'https://wa.me/' + numeroWhatsApp(tel) + '?text=' + encodeURIComponent(aviso),
    });
  });
  if (!proximas.length) return;

  proximas.sort((a, b) => a.faltan - b.faltan);
  const escapar = (texto) => String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cuerpo = proximas.map((p) => '<li>' + escapar(p.linea) + ' · <a href="' + p.enlace + '">Enviar aviso</a></li>').join('');
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Fechas especiales para avisar hoy (' + proximas.length + ')',
    htmlBody:
      '<p>Fechas que caen en los próximos ' + DIAS_DE_AVISO + ' días. Cada enlace abre WhatsApp con el mensaje escrito:</p><ul>' +
      cuerpo + '</ul><p>Si alguien pide la baja, escribí algo en la columna "Baja" de sus filas. Cuando alguien use el ' +
      DESCUENTO + ' %, marcá "Descuento usado".</p>',
  });

  for (const p of proximas) h.getRange(p.fila, COL.aviso + 1).setValue(hoy);
}

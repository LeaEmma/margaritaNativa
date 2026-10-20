/**
 * Lectura de las planillas publicadas de Google (ver README). Lo comparten
 * los scripts de importación: cada hoja se baja como CSV y se devuelve como
 * una lista de filas con las columnas por nombre de encabezado, porque el
 * orden de las columnas cambia de una hoja a otra.
 */

const BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS__amWSUeQEEM1OzYvmy98Ig0TjVJHBYxWy0djUelAw9VZE4fMFpsePPsOtQqy58WlLjDSK9wWW3x3/pub';

export const HOJAS = { Plantas: 0, Ramos: 1890629704, Suscripcion: 1379722322, Macetas: 1952137462 };

/** Filas de una hoja como objetos `{ encabezado: valor }`, con los valores recortados. */
export async function leerHoja(nombre) {
  const gid = HOJAS[nombre];
  if (gid === undefined) throw new Error(`No conozco la hoja "${nombre}"`);
  const r = await fetch(`${BASE}?gid=${gid}&single=true&output=csv`);
  if (!r.ok) throw new Error(`No se pudo leer la planilla de ${nombre}: HTTP ${r.status}`);
  const texto = (await r.text()).replace(/^\uFEFF/, '').trim();
  if (!texto) return [];
  const filas = texto.split(/\r?\n/).map(leerFilaCsv);
  const encabezados = filas[0].map((h) => h.trim());
  return filas.slice(1).map((celdas) =>
    Object.fromEntries(encabezados.map((h, i) => [h, (celdas[i] ?? '').trim()])),
  );
}

/** Separa una fila CSV respetando las comillas ("Lirio, Cala o Pajarito"). */
export function leerFilaCsv(linea) {
  const celdas = [];
  let celda = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        celda += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === ',' && !entreComillas) {
      celdas.push(celda);
      celda = '';
    } else {
      celda += c;
    }
  }
  celdas.push(celda);
  return celdas;
}

/** Mismo normalizador que usa el sitio para los anclas del catálogo. */
export const aSlug = (t) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Lo que va entre paréntesis al final del nombre en la planilla es detalle, no
 * nombre: "Aromáticas (albahaca, menta, etc.)" se vende como "Aromáticas".
 */
export const nombreComercial = (t) => t.replace(/\s*\([^)]*\)\s*$/, '');

/** Carpeta compartida de Drive con el material del sitio. */
export const ORIGEN_DRIVE = 'G:/.shortcut-targets-by-id/1KCYjd2lqvUWSub4-1J536Gx0fqWMv8xz/Web';

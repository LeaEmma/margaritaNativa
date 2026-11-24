/**
 * Importa la lista de precios mayoristas: lee la hoja Plantas de la planilla y
 * escribe src/datos/mayoristas.json con las filas que tienen "Precio venta
 * mayorista". De ahí salen la página /mayoristas y el PDF del presupuesto
 * (scripts/generar-presupuesto.mjs), así que los dos dicen siempre lo mismo.
 *
 *   node scripts/importar-mayoristas.mjs [carpeta-origen]
 *
 * Columnas que se usan (por nombre de encabezado): Nombre, Tamaño, Detalle,
 * Precio venta mayorista, Cajon y cantidad Cajon. "Precio compra", "30%" y
 * "Compra + 30%" son internas: solo se leen para avisar por consola si algún
 * precio mayorista queda por debajo del costo, y nunca se escriben.
 *
 * Una fila cuyo Nombre empieza con "Cajones" abre una sección aparte ("Cajones
 * Mínimo 10 unidades" → título "Cajones", nota "Mínimo 10 unidades"). En esa
 * sección, Cajon es el precio del cajón cerrado y "cantidad Cajon" cuántas
 * plantas trae.
 *
 * Fotos: para cada planta se usa, en este orden, la de su carpeta en Plantas/
 * del Drive que se llama como la carpeta (p. ej. Lavanda/lavanda.jpg: las del
 * presupuesto), la miniatura que ya usa el catálogo
 * (src/assets/fotos/plantas/<slug>.jpg) o la más reciente de la carpeta.
 * Se dejan apaisadas en src/assets/fotos/mayoristas/<slug>.jpg.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { leerHoja, aSlug, nombreComercial, ORIGEN_DRIVE } from './planilla.mjs';

const ORIGEN = path.join(process.argv[2] ?? process.env.FOTOS_ORIGEN ?? ORIGEN_DRIVE, 'Plantas');
const SALIDA_DATOS = 'src/datos/mayoristas.json';
const SALIDA_FOTOS = 'src/assets/fotos/mayoristas';
const FOTOS_CATALOGO = 'src/assets/fotos/plantas';
const FOTO = { ancho: 900, alto: 600 };

/**
 * Nombre con que sale cada planta cuando en la planilla figura distinto. Clave:
 * Nombre tal como está en la planilla. Mismo nombre que en el catálogo web.
 */
const NOMBRES = {
  'Jazmín chino leche': 'Jazmín chino',
  'Pilea drepresa': 'Pilea depressa',
  'Stromanthe Tricolor': 'Stromanthe tricolor',
  'Estrella Federal': 'Estrella federal',
};

/** Carpeta del Drive cuyo nombre no coincide con el producto. Clave: slug del producto. */
const CARPETA = { 'monstera-costilla-de-adan': 'monstera' };

const pesos = (v) => {
  const n = Number(String(v ?? '').replace(/[$.\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

const filas = await leerHoja('Plantas');
const columnas = Object.keys(filas[0] ?? {});
if (!columnas.includes('Precio venta mayorista')) {
  throw new Error(`La hoja Plantas no tiene la columna "Precio venta mayorista". Columnas: ${columnas.join(', ')}`);
}

const secciones = [{ titulo: 'Plantas', items: [] }];
const avisos = [];

for (const f of filas) {
  const original = (f.Nombre ?? '').trim();
  if (!original) continue;

  const cajones = /^cajones\b\s*(.*)$/i.exec(original);
  if (cajones) {
    secciones.push({ titulo: 'Cajones', nota: cajones[1].trim() || undefined, items: [] });
    continue;
  }

  const precio = pesos(f['Precio venta mayorista']);
  const nombre = NOMBRES[original] ?? nombreComercial(original);
  if (!precio) continue;

  const compra = pesos(f['Precio compra']);
  const tamano = (f['Tamaño'] ?? '').trim();
  const etiqueta = tamano ? `${nombre} (${tamano})` : nombre;
  if (compra && precio < compra) avisos.push(`${etiqueta}: mayorista $${precio} está por debajo de la compra ($${compra})`);

  const cajonPrecio = pesos(f.Cajon);
  const cajonUnidades = pesos(f['cantidad Cajon']);
  const cajon = cajonPrecio && cajonUnidades ? { precio: cajonPrecio, unidades: cajonUnidades } : undefined;
  if (cajon && compra && cajon.precio / cajon.unidades < compra) {
    avisos.push(
      `${etiqueta}: el cajón sale $${Math.round(cajon.precio / cajon.unidades)} por planta, menos que la compra ($${compra})`,
    );
  }
  if ((cajonPrecio && !cajonUnidades) || (!cajonPrecio && cajonUnidades)) {
    avisos.push(`${etiqueta}: falta el precio o la cantidad del cajón`);
  }

  const seccion = secciones.at(-1);
  const slug = aSlug(nombre);
  let item = seccion.items.find((i) => i.slug === slug);
  if (!item) {
    item = { nombre, slug, detalle: (f.Detalle ?? '').trim() || undefined, filas: [] };
    seccion.items.push(item);
  }
  item.filas.push({ tamano: tamano || undefined, precio, cajon });
}

/**
 * Filas de un mismo producto: si valen todas lo mismo, son variedades
 * ("Albahaca · Romero · Menta", c/u); si no, una lista de tamaños con su precio.
 */
for (const seccion of secciones) {
  seccion.items = seccion.items.map(({ filas: fs_, ...item }) => {
    if (fs_.length === 1) {
      const [u] = fs_;
      return { ...item, tamano: u.tamano, precio: u.precio, cajon: u.cajon };
    }
    const precios = new Set(fs_.map((x) => x.precio));
    if (precios.size === 1) {
      return { ...item, precio: fs_[0].precio, variedades: fs_.map((x) => x.tamano).filter(Boolean), cajon: fs_[0].cajon };
    }
    const tamanos = fs_.map((x) => ({ nombre: x.tamano ?? '', precio: x.precio })).sort((a, b) => a.precio - b.precio);
    return { ...item, precio: tamanos[0].precio, tamanos };
  });
}

const activas = secciones.filter((s) => s.items.length);

/* ----------------------------- Fotos ----------------------------- */

await fs.mkdir(SALIDA_FOTOS, { recursive: true });
const carpetas = existsSync(ORIGEN)
  ? (await fs.readdir(ORIGEN, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];
if (!carpetas.length) avisos.push(`No encontré la carpeta de fotos ${ORIGEN}: se usan las del catálogo`);

/** La imagen más reciente de una carpeta, o nada si no tiene. */
async function masReciente(dir) {
  const imagenes = (await fs.readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const conFecha = await Promise.all(imagenes.map(async (f) => ({ f, t: (await fs.stat(path.join(dir, f))).mtimeMs })));
  const [ultima] = conFecha.sort((a, b) => b.t - a.t);
  return ultima && path.join(dir, ultima.f);
}

const sinFoto = [];
for (const item of activas.flatMap((s) => s.items)) {
  const slugCarpeta = CARPETA[item.slug] ?? item.slug;
  const carpeta = carpetas.find((c) => aSlug(c) === slugCarpeta);
  const candidatas = [
    carpeta && path.join(ORIGEN, carpeta, `${aSlug(carpeta)}.jpg`),
    path.join(FOTOS_CATALOGO, `${item.slug}.jpg`),
    carpeta && (await masReciente(path.join(ORIGEN, carpeta))),
  ].filter(Boolean);
  const fuente = candidatas.find((c) => existsSync(c));
  if (!fuente) {
    sinFoto.push(item.nombre);
    continue;
  }
  await sharp(fuente)
    .rotate()
    .resize(FOTO.ancho, FOTO.alto, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(SALIDA_FOTOS, `${item.slug}.jpg`));
  item.foto = item.slug;
  console.log(`  ✓ ${item.slug.padEnd(28)} ← ${path.relative(process.cwd(), fuente).startsWith('..') ? fuente : path.relative(process.cwd(), fuente)}`);
}

// Fotos que quedaron de productos que ya no están en la lista.
const vigentes = new Set(activas.flatMap((s) => s.items).map((i) => `${i.slug}.jpg`));
for (const archivo of await fs.readdir(SALIDA_FOTOS)) {
  if (!vigentes.has(archivo)) await fs.rm(path.join(SALIDA_FOTOS, archivo));
}

const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
await fs.writeFile(SALIDA_DATOS, JSON.stringify({ actualizado: hoy, secciones: activas }, null, 2) + '\n');

const total = activas.reduce((n, s) => n + s.items.length, 0);
console.log(`\n${total} productos en ${activas.length} secciones → ${SALIDA_DATOS}`);
if (sinFoto.length) console.log(`Sin foto: ${sinFoto.join(', ')}`);
if (avisos.length) console.log(`\nRevisar en la planilla:\n${avisos.map((a) => `  · ${a}`).join('\n')}`);

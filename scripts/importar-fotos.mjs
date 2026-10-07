/**
 * Importa las fotos de producto desde la carpeta compartida de Drive y las
 * deja listas para Astro en src/assets/fotos/<categoria>/<slug>.jpg
 *
 *   node scripts/importar-fotos.mjs [carpeta-origen]
 *
 * La carpeta origen se puede pasar por argumento o por la variable FOTOS_ORIGEN,
 * para que funcione igual si los archivos llegan por Drive, por zip o por rclone.
 *
 * Estructura esperada en el origen:
 *   <origen>/Plantas/<Nombre del producto>/<cualquier foto>
 *   <origen>/Ramos/<Nombre del producto>/<cualquier foto>
 *
 * Se toma la primera foto de cada carpeta en orden alfabético. Para elegir otra,
 * nombrarla de modo que ordene primero (por ejemplo "1.jpg" o "principal.jpg").
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ORIGEN =
  process.argv[2] ??
  process.env.FOTOS_ORIGEN ??
  'G:/.shortcut-targets-by-id/1KCYjd2lqvUWSub4-1J536Gx0fqWMv8xz/Web';

const DESTINO = 'src/assets/fotos';
const LADO = 900; // cuadrado: las miniaturas del catálogo son cuadradas

/** Mismo normalizador que usa el sitio para los anclas del catálogo. */
const aSlug = (t) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Carpetas del origen cuyo nombre no coincide con el del producto en la
 * planilla. Clave: slug de la carpeta. Valor: slugs de los productos que cubre.
 */
const ALIAS = {
  // Una sola carpeta para los dos tamaños: es la misma planta.
  lavanda: ['lavanda-chica', 'lavanda-grande'],
  monstera: ['monstera-costilla-de-adan'],
};

const CATEGORIAS = ['Plantas', 'Ramos'];

async function productosDe(categoria) {
  const gid = { Plantas: 0, Ramos: 1890629704 }[categoria];
  const base =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vS__amWSUeQEEM1OzYvmy98Ig0TjVJHBYxWy0djUelAw9VZE4fMFpsePPsOtQqy58WlLjDSK9wWW3x3/pub';
  const r = await fetch(`${base}?gid=${gid}&single=true&output=csv`);
  if (!r.ok) throw new Error(`No se pudo leer la planilla de ${categoria}: HTTP ${r.status}`);
  const texto = (await r.text()).replace(/^\uFEFF/, '').trim();
  // La primera columna es el nombre en las dos hojas, aunque el resto difiera.
  return texto
    .split(/\r?\n/)
    .slice(1)
    .map((linea) => (linea.match(/^("([^"]*)"|[^,]*)/)?.[2] ?? linea.split(',')[0]).trim())
    .filter(Boolean);
}

const esImagen = (f) => /\.(jpe?g|png|webp|heic)$/i.test(f);

for (const categoria of CATEGORIAS) {
  const dirOrigen = path.join(ORIGEN, categoria);
  const clave = aSlug(categoria);
  console.log(`\n━━━ ${categoria} ━━━`);

  if (!existsSync(dirOrigen)) {
    console.log(`  (no existe ${dirOrigen})`);
    continue;
  }

  const productos = await productosDe(categoria);
  const esperados = new Map(productos.map((p) => [aSlug(p), p]));

  const entradas = await fs.readdir(dirOrigen, { withFileTypes: true });
  const carpetas = entradas.filter((e) => e.isDirectory());
  const sueltos = entradas.filter((e) => e.isFile() && esImagen(e.name));

  const dirDestino = path.join(DESTINO, clave);
  await fs.mkdir(dirDestino, { recursive: true });

  const cubiertos = new Set();
  const sinMatch = [];

  for (const carpeta of carpetas) {
    const fotos = (await fs.readdir(path.join(dirOrigen, carpeta.name))).filter(esImagen).sort();
    if (!fotos.length) {
      sinMatch.push(`${carpeta.name} (carpeta vacía)`);
      continue;
    }

    const slugCarpeta = aSlug(carpeta.name);
    const destinos = ALIAS[slugCarpeta] ?? (esperados.has(slugCarpeta) ? [slugCarpeta] : null);
    if (!destinos) {
      sinMatch.push(`${carpeta.name} → no coincide con ningún producto`);
      continue;
    }

    const fuente = path.join(dirOrigen, carpeta.name, fotos[0]);
    for (const slug of destinos) {
      if (!esperados.has(slug)) {
        sinMatch.push(`${carpeta.name} → alias apunta a "${slug}", que no está en la planilla`);
        continue;
      }
      const salida = path.join(dirDestino, `${slug}.jpg`);
      const info = await sharp(fuente)
        .rotate()
        .resize(LADO, LADO, { fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(salida);
      cubiertos.add(slug);
      console.log(`  ✓ ${slug.padEnd(28)} ${Math.round(info.size / 1024)} KB   ← ${fotos[0]}`);
    }
  }

  const faltan = [...esperados.keys()].filter((s) => !cubiertos.has(s));
  if (faltan.length) {
    console.log(`\n  Sin foto (${faltan.length}):`);
    faltan.forEach((s) => console.log(`     - ${esperados.get(s)}`));
  }
  if (sinMatch.length) {
    console.log(`\n  Sin asignar (${sinMatch.length}):`);
    sinMatch.forEach((s) => console.log(`     - ${s}`));
  }
  if (sueltos.length) {
    console.log(`\n  ${sueltos.length} archivo(s) sueltos, fuera de una carpeta de producto: se ignoran.`);
  }
}

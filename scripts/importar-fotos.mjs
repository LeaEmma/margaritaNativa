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
 *   <origen>/Plantas/Plantas/<foto>   → portada de la categoría en /catalogo
 *                                       (src/assets/fotos/portada-plantas.jpg)
 *
 * Se toma la foto más reciente de cada carpeta (por fecha de modificación): así,
 * para cambiar la foto de un producto alcanza con subir una nueva a su carpeta.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { leerHoja, aSlug, nombreComercial, ORIGEN_DRIVE } from './planilla.mjs';

const ORIGEN = process.argv[2] ?? process.env.FOTOS_ORIGEN ?? ORIGEN_DRIVE;

const DESTINO = 'src/assets/fotos';
const LADO = 900; // cuadrado: las miniaturas del catálogo son cuadradas
const PORTADA = { ancho: 1600, alto: 1000 }; // apaisada: va de banda arriba de cada categoría

/**
 * Un producto con varias variantes es una fila por variante en la planilla,
 * con el mismo nombre y la columna "Tamaño" cargada (ver conTamanos en
 * catalogo.ts). Acá alcanza con quedarse con los nombres distintos: las filas
 * repetidas comparten la foto. Por si alguna fila lleva el tamaño en el nombre
 * ("Lavanda chica"), se lo saca para que queden juntas.
 */
const sinTamano = (t) => t.replace(/\s+(chica|mediana|grande)$/i, '');

/**
 * Carpetas del origen cuyo nombre no coincide con el del producto en la
 * planilla. Clave: slug de la carpeta. Valor: slugs de los productos que cubre.
 */
const ALIAS = {
  monstera: ['monstera-costilla-de-adan'],
};

/**
 * Foto elegida y encuadre por carpeta (clave: slug de la carpeta). Pisa a "la
 * más reciente" cuando la mejor foto no es la última que se subió.
 *
 * `x` e `y` son el centro de lo que interesa, en fracciones de la foto (0 a 1),
 * y `zoom` achica el cuadrado (1 = el más grande que entra). Importa que la
 * planta quede en el centro: las fichas de cuidados muestran solo una franja
 * horizontal del medio, y si ahí cae la maceta se ve la base y no la planta.
 *
 * Si el archivo nombrado ya no está, se usa el más reciente con el recorte
 * automático.
 */
const ENCUADRE = {
  'bambu-de-la-suerte': { foto: 'IMG-20260918-WA0023.jpg', x: 0.42, y: 0.45, zoom: 1.35 },
  'cala-de-color': { foto: 'IMG-20261008-WA0015.jpg', x: 0.5, y: 0.45 },
  helecho: { foto: '20260925_055845.jpg', x: 0.5, y: 0.6 },
  hortensia: { foto: 'IMG-20261005-WA0015.jpg', x: 0.5, y: 0.55 },
  'jazmin-chino': { foto: '20260925_055413.jpg', x: 0.5, y: 0.3, zoom: 1.3 },
  lavanda: { foto: 'IMG-20260918-WA0018.jpg', x: 0.5, y: 0.55, zoom: 1.25 },
  lilium: { foto: 'IMG-20261001-WA0000(1).jpg', x: 0.5, y: 0.45 },
  monstera: { foto: 'IMG-20260918-WA0020.jpg', x: 0.5, y: 0.45 },
  // En la carpeta también quedó una foto de lilium: no tomar "la más reciente".
  orquidea: { foto: 'IMG-20260916-WA0007(1).jpg', x: 0.5, y: 0.45 },
  'palmera-areca': { foto: '20260925_055819 (1).jpg', x: 0.5, y: 0.3, zoom: 1.15 },
  'palo-de-agua': { foto: 'IMG-20260918-WA0015.jpg', x: 0.5, y: 0.4 },
  pandurata: { foto: '20260925_055741 (1).jpg', x: 0.6, y: 0.5 },
  // Cajones de petunias: el recorte toma el del medio, con la mezcla de colores.
  petunias: { foto: 'IMG-20261013-WA0081.jpg', x: 0.5, y: 0.42, zoom: 1.15 },
  pino: { foto: '20260921_062734.jpg', x: 0.45, y: 0.45 },
  // Foto apaisada tomada desde abajo: el recorte se corre a la derecha y hacia abajo para sacar el techo del vivero.
  rafis: { foto: 'IMG-20261019-WA0017.jpg', x: 0.62, y: 0.58, zoom: 1.12 },
  // Hilera de plantas colgadas: el recorte corta la pared violeta de arriba y la pandurata de abajo.
  platycerium: { foto: 'file_000000004de8820e832eb7b2d5c0d1b5.png', x: 0.5, y: 0.52, zoom: 1.05 },
  'santa-rita': { foto: 'IMG-20260918-WA0009(1) (1).jpg', x: 0.45, y: 0.5 },
  anturio: { foto: 'IMG-20260918-WA0014.jpg', x: 0.5, y: 0.6 },
  'stromanthe-tricolor': { foto: '20260925_055546.jpg', x: 0.4, y: 0.5 },
};

/** Recorte cuadrado centrado en (x, y), sin salirse de la foto. */
async function recorteEn(fuente, { x, y, zoom = 1 }) {
  const { data, info } = await sharp(fuente).rotate().toBuffer({ resolveWithObject: true });
  const lado = Math.round(Math.min(info.width, info.height) / zoom);
  const limitar = (v, max) => Math.max(0, Math.min(Math.round(v), max));
  return sharp(data).extract({
    left: limitar(x * info.width - lado / 2, info.width - lado),
    top: limitar(y * info.height - lado / 2, info.height - lado),
    width: lado,
    height: lado,
  });
}

const CATEGORIAS = ['Plantas', 'Ramos'];

/**
 * Productos de una categoría según la planilla: nombre y precio. En Ramos la
 * columna de nombre se llama "Categoria"; el precio sirve para las carpetas
 * del Drive nombradas por precio en miles ("25" → Clásico).
 */
async function productosDe(categoria) {
  const filas = await leerHoja(categoria);
  return filas
    .map((f) => ({ nombre: (f.Nombre ?? f.Categoria ?? '').trim(), precio: Number(f['Precio venta'] ?? f.Precio) }))
    .filter((p) => p.nombre);
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
  const slugDe = (p) => aSlug(sinTamano(nombreComercial(p.nombre)));
  const esperados = new Map(productos.map((p) => [slugDe(p), p.nombre]));
  // Carpetas nombradas por precio en miles: "25" es el producto de $25.000.
  const porPrecio = new Map(productos.filter((p) => p.precio > 0).map((p) => [p.precio, slugDe(p)]));

  const entradas = await fs.readdir(dirOrigen, { withFileTypes: true });
  const carpetas = entradas.filter((e) => e.isDirectory());
  const sueltos = entradas.filter((e) => e.isFile() && esImagen(e.name));

  const dirDestino = path.join(DESTINO, clave);
  await fs.mkdir(dirDestino, { recursive: true });

  const cubiertos = new Set();
  const sinMatch = [];

  for (const carpeta of carpetas) {
    const dirCarpeta = path.join(dirOrigen, carpeta.name);
    const nombres = (await fs.readdir(dirCarpeta)).filter(esImagen);
    const conFecha = await Promise.all(
      nombres.map(async (f) => ({ f, t: (await fs.stat(path.join(dirCarpeta, f))).mtimeMs })),
    );
    // La más reciente primero.
    const fotos = conFecha.sort((a, b) => b.t - a.t).map((x) => x.f);
    if (!fotos.length) {
      sinMatch.push(`${carpeta.name} (carpeta vacía)`);
      continue;
    }

    const slugCarpeta = /^\d+$/.test(carpeta.name)
      ? (porPrecio.get(Number(carpeta.name) * 1000) ?? carpeta.name)
      : aSlug(carpeta.name);

    // Una subcarpeta con el nombre de la categoría trae la foto general.
    if (slugCarpeta === clave) {
      const salida = path.join(DESTINO, `portada-${clave}.jpg`);
      const info = await sharp(path.join(dirCarpeta, fotos[0]))
        .rotate()
        .resize(PORTADA.ancho, PORTADA.alto, { fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(salida);
      console.log(`  ✓ ${'(portada)'.padEnd(28)} ${Math.round(info.size / 1024)} KB   ← ${fotos[0]}`);
      continue;
    }

    const destinos = ALIAS[slugCarpeta] ?? (esperados.has(slugCarpeta) ? [slugCarpeta] : null);
    if (!destinos) {
      sinMatch.push(`${carpeta.name} → no coincide con ningún producto`);
      continue;
    }

    const encuadre = ENCUADRE[slugCarpeta];
    const elegida = encuadre && fotos.includes(encuadre.foto) ? encuadre.foto : fotos[0];
    if (encuadre && elegida !== encuadre.foto) {
      sinMatch.push(`${carpeta.name} → no está "${encuadre.foto}"; se usa la más reciente`);
    }
    const fuente = path.join(dirOrigen, carpeta.name, elegida);
    for (const slug of destinos) {
      if (!esperados.has(slug)) {
        sinMatch.push(`${carpeta.name} → alias apunta a "${slug}", que no está en la planilla`);
        continue;
      }
      const salida = path.join(dirDestino, `${slug}.jpg`);
      const imagen =
        elegida === encuadre?.foto
          ? (await recorteEn(fuente, encuadre)).resize(LADO, LADO)
          : sharp(fuente).rotate().resize(LADO, LADO, { fit: 'cover', position: sharp.strategy.attention });
      const info = await imagen.jpeg({ quality: 82, mozjpeg: true }).toFile(salida);
      cubiertos.add(slug);
      console.log(`  ✓ ${slug.padEnd(28)} ${Math.round(info.size / 1024)} KB   ← ${elegida}`);
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

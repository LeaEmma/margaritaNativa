/**
 * Importa las galerías de fotos y videos desde la carpeta compartida de Drive.
 *
 *   node scripts/importar-galeria.mjs [carpeta-origen]
 *
 * Hay dos clases de galería:
 *
 *   - Por producto: una subcarpeta por tipo de ramo dentro de Ramos/, nombrada
 *     por el precio en miles ("25" es el ramo de $25.000, Clásico) o por el
 *     nombre del producto ("Premium", que no tiene precio cerrado). Lo que hay
 *     adentro se ve al tocar "Ver fotos y video" en la fila del catálogo.
 *
 *       <origen>/Ramos/25/<fotos y videos>        → galería del Clásico
 *       <origen>/Ramos/Premium/<fotos y videos>   → galería del Premium
 *
 *   - Por sección: las fotos y videos sueltos de una carpeta, para el carrusel
 *     de un bloque de la home.
 *
 *       <origen>/Suscripción/<fotos y videos>     → exhibidor
 *       <origen>/Eventos/<fotos y videos>         → eventos (cuando haya)
 *
 * Los archivos sueltos de Ramos/ no se publican: hay que moverlos a la
 * carpeta del tipo de ramo que corresponda. El script los lista para que no
 * pasen desapercibidos.
 *
 * Las fotos quedan en src/assets/galeria/ (lado mayor 1600 px) y los videos,
 * recomprimidos con ffmpeg, en public/video/ con su póster al lado de las
 * fotos. Un video se vuelve a convertir solo si el original es más nuevo que
 * la copia: la conversión es lenta. Lo que ya no está en el Drive se borra.
 *
 * El resultado se describe en src/assets/galeria/galeria.json (orden, tamaño
 * y ruta de cada pieza), que lee src/datos/galeria.ts.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { leerHoja, aSlug, nombreComercial, ORIGEN_DRIVE } from './planilla.mjs';

const ORIGEN = process.argv[2] ?? process.env.FOTOS_ORIGEN ?? ORIGEN_DRIVE;
const DESTINO_FOTOS = 'src/assets/galeria';
const DESTINO_VIDEOS = 'public/video';
const MANIFIESTO = path.join(DESTINO_FOTOS, 'galeria.json');
const LADO_MAXIMO = 1600; // fotos: lado mayor
const LADO_VIDEO = 1280; // videos: lado mayor (vertical 720×1280)

/** Categorías del catálogo con una subcarpeta por producto. */
const PRODUCTOS = {
  ramos: { carpeta: 'Ramos', hoja: 'Ramos' },
};

/** Bloques de la home con las fotos sueltas de una carpeta. */
const SECCIONES = {
  suscripcion: { carpeta: 'Suscripción' },
  eventos: { carpeta: 'Eventos' },
};

/** Archivos que no van a ninguna galería: capturas con interfaz encima, flyers. */
const OMITIR = new Set([
  'Screenshot_20260922_224146_Instagram.jpg', // historia oscura con texto encima
  'Screenshot_20260922_224115_Instagram.jpg', // historia de una clienta: se ven su avatar y su usuario
  'file_000000008464820ea1c74681257917db.png', // flyer del exhibidor
]);

/**
 * Orden de apertura de una galería, por nombre de archivo. La clave es la
 * sección ("suscripcion") o el producto ("ramos/clasico"). Lo que no figura
 * va después, de más nuevo a más viejo.
 */
const ORDEN = {
  suscripcion: ['IMG-20261005-WA0034(1).jpg', 'IMG-20260921-WA0064.jpg', 'IMG-20260921-WA0061.jpg'],
};

/**
 * Recorte previo de una foto, en fracciones del ancho y el alto (0 a 1), para
 * sacar lo que no es la foto (las barras de una captura, por ejemplo):
 * `'archivo.jpg': { x0: 0, y0: 0.1, x1: 1, y1: 0.9 }`.
 */
const RECORTE = {};

const esImagen = (f) => /\.(jpe?g|png|webp)$/i.test(f);
const esVideo = (f) => /\.(mp4|mov|m4v)$/i.test(f);
const ejecutar = promisify(execFile);

/** Productos de una hoja: slug (el mismo que usa el sitio), nombre y precio. */
async function productosDe(hoja) {
  const filas = await leerHoja(hoja);
  return filas
    .map((f) => {
      const nombre = (f.Categoria ?? f.Nombre ?? '').trim();
      return { nombre, slug: aSlug(nombreComercial(nombre)), precio: Number(f['Precio venta'] ?? f.Precio) };
    })
    .filter((p) => p.nombre);
}

/** Producto al que corresponde una subcarpeta: por precio en miles o por nombre. */
function productoDeCarpeta(nombre, productos) {
  if (/^\d+$/.test(nombre)) return productos.find((p) => p.precio === Number(nombre) * 1000);
  const slug = aSlug(nombre);
  return productos.find((p) => p.slug === slug);
}

/**
 * Fotos y videos directamente dentro de una carpeta, con su fecha. Un mismo
 * archivo subido dos veces con otro nombre ("foto (1).jpg") se toma una sola
 * vez: se comparan por contenido.
 */
async function piezasDe(dir) {
  if (!existsSync(dir)) return [];
  const piezas = [];
  const vistos = new Map();
  for (const entrada of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entrada.isFile() || !(esImagen(entrada.name) || esVideo(entrada.name)) || OMITIR.has(entrada.name)) continue;
    const ruta = path.join(dir, entrada.name);
    const huella = createHash('sha1').update(await fs.readFile(ruta)).digest('hex');
    const repetido = vistos.get(huella);
    if (repetido) {
      console.log(`  = ${entrada.name} es igual a ${repetido}: se toma una sola vez`);
      continue;
    }
    vistos.set(huella, entrada.name);
    piezas.push({ archivo: entrada.name, ruta, mtime: (await fs.stat(ruta)).mtimeMs });
  }
  return piezas;
}

function ordenar(clave, piezas) {
  const orden = ORDEN[clave] ?? [];
  const posicion = (p) => {
    const i = orden.indexOf(p.archivo);
    return i < 0 ? Infinity : i;
  };
  return [...piezas].sort((a, b) => posicion(a) - posicion(b) || b.mtime - a.mtime);
}

async function convertirFoto(pieza, salida) {
  const { data, info } = await sharp(pieza.ruta).rotate().toBuffer({ resolveWithObject: true });
  let imagen = sharp(data);
  const recorte = RECORTE[pieza.archivo];
  if (recorte) {
    imagen = imagen.extract({
      left: Math.round(recorte.x0 * info.width),
      top: Math.round(recorte.y0 * info.height),
      width: Math.round((recorte.x1 - recorte.x0) * info.width),
      height: Math.round((recorte.y1 - recorte.y0) * info.height),
    });
  }
  const resultado = await imagen
    .resize(LADO_MAXIMO, LADO_MAXIMO, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(salida);
  return { ancho: resultado.width, alto: resultado.height, kb: Math.round(resultado.size / 1024) };
}

async function convertirVideo(pieza, salidaVideo, salidaPoster) {
  const existente = existsSync(salidaVideo) ? (await fs.stat(salidaVideo)).mtimeMs : 0;
  let convertido = false;
  if (existente < pieza.mtime) {
    // ffmpeg aplica solo la rotación del celular; iw/ih ya vienen rotados.
    const escala = `scale='if(gt(iw,ih),${LADO_VIDEO},-2)':'if(gt(iw,ih),-2,${LADO_VIDEO})'`;
    await ejecutar(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', pieza.ruta,
      '-vf', `${escala},fps=30`,
      '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-crf', '26', '-preset', 'slow', '-movflags', '+faststart',
      '-an',
      salidaVideo,
    ]);
    convertido = true;
  }
  const cuadro = `${salidaPoster}.cuadro.png`;
  await ejecutar(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1', '-i', salidaVideo, '-frames:v', '1', cuadro]);
  const resultado = await sharp(cuadro).jpeg({ quality: 82, mozjpeg: true }).toFile(salidaPoster);
  await fs.unlink(cuadro);
  const kb = Math.round((await fs.stat(salidaVideo)).size / 1024);
  return { ancho: resultado.width, alto: resultado.height, kb, convertido };
}

/** Borra de un directorio (archivos y subcarpetas) todo lo que no se produjo en esta corrida. */
async function limpiar(dir, producidos) {
  if (!existsSync(dir)) return;
  for (const entrada of await fs.readdir(dir)) {
    if (producidos.has(entrada)) continue;
    await fs.rm(path.join(dir, entrada), { recursive: true, force: true });
    console.log(`  − ${path.join(dir, entrada)} (ya no está en el Drive)`);
  }
}

/**
 * Convierte las piezas de una carpeta a una galería. `rutaFotos` y
 * `rutaVideos` son relativas a los destinos; devuelve la lista para el
 * manifiesto y deja los directorios limpios de lo que no se produjo.
 */
async function importarGaleria(clave, dirOrigen, rutaFotos, rutaVideos) {
  const dirFotos = path.join(DESTINO_FOTOS, rutaFotos);
  const dirVideos = path.join(DESTINO_VIDEOS, rutaVideos);
  await fs.mkdir(dirFotos, { recursive: true });
  await fs.mkdir(dirVideos, { recursive: true });

  const piezas = ordenar(clave, await piezasDe(dirOrigen));
  const fotosProducidas = new Set();
  const videosProducidos = new Set();
  const lista = [];

  for (const pieza of piezas) {
    const slug = aSlug(path.parse(pieza.archivo).name) || 'pieza';
    try {
      if (esVideo(pieza.archivo)) {
        const nombreVideo = `${slug}.mp4`;
        const nombrePoster = `${slug}.poster.jpg`;
        const r = await convertirVideo(pieza, path.join(dirVideos, nombreVideo), path.join(dirFotos, nombrePoster));
        videosProducidos.add(nombreVideo);
        fotosProducidas.add(nombrePoster);
        lista.push({
          tipo: 'video',
          archivo: `${rutaFotos}/${nombrePoster}`,
          video: `/video/${rutaVideos}/${nombreVideo}`,
          ancho: r.ancho,
          alto: r.alto,
        });
        console.log(`  ▶ ${pieza.archivo.padEnd(36)} ${r.ancho}×${r.alto} ${String(r.kb).padStart(6)} KB${r.convertido ? '' : '  (ya convertido)'}`);
      } else {
        const nombreFoto = `${slug}.jpg`;
        const r = await convertirFoto(pieza, path.join(dirFotos, nombreFoto));
        fotosProducidas.add(nombreFoto);
        lista.push({ tipo: 'foto', archivo: `${rutaFotos}/${nombreFoto}`, ancho: r.ancho, alto: r.alto });
        console.log(`  ✓ ${pieza.archivo.padEnd(36)} ${r.ancho}×${r.alto} ${String(r.kb).padStart(6)} KB`);
      }
    } catch (error) {
      console.log(`  ✗ ${pieza.archivo}: ${error.message}`);
    }
  }

  await limpiar(dirFotos, fotosProducidas);
  await limpiar(dirVideos, videosProducidos);
  if (!lista.length) {
    console.log('  (sin material)');
    await fs.rm(dirFotos, { recursive: true, force: true });
    await fs.rm(dirVideos, { recursive: true, force: true });
  }
  return lista;
}

const manifiesto = { secciones: {}, productos: {} };

for (const [categoria, config] of Object.entries(PRODUCTOS)) {
  const dirCategoria = path.join(ORIGEN, config.carpeta);
  const productos = await productosDe(config.hoja);
  const galerias = {};
  const carpetasProducidas = new Set();
  const sinMatch = [];

  if (existsSync(dirCategoria)) {
    for (const entrada of await fs.readdir(dirCategoria, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      const producto = productoDeCarpeta(entrada.name, productos);
      if (!producto) {
        sinMatch.push(`${entrada.name} → ningún producto se llama así ni cuesta $${entrada.name}.000`);
        continue;
      }
      console.log(`\n━━━ ${categoria} / ${producto.nombre} (carpeta ${entrada.name}) ━━━`);
      const lista = await importarGaleria(
        `${categoria}/${producto.slug}`,
        path.join(dirCategoria, entrada.name),
        `${categoria}/${producto.slug}`,
        `${categoria}/${producto.slug}`,
      );
      if (lista.length) {
        galerias[producto.slug] = lista;
        carpetasProducidas.add(producto.slug);
      }
    }
  }

  await limpiar(path.join(DESTINO_FOTOS, categoria), carpetasProducidas);
  await limpiar(path.join(DESTINO_VIDEOS, categoria), carpetasProducidas);
  manifiesto.productos[categoria] = galerias;

  const sinGaleria = productos.filter((p) => !galerias[p.slug]).map((p) => p.nombre);
  if (sinGaleria.length) console.log(`\n  Sin fotos ni video (${sinGaleria.length}): ${sinGaleria.join(', ')}`);
  if (sinMatch.length) {
    console.log(`\n  Carpetas sin asignar (${sinMatch.length}):`);
    sinMatch.forEach((s) => console.log(`     - ${s}`));
  }
  const sueltos = await piezasDe(dirCategoria);
  if (sueltos.length) {
    console.log(`\n  ${sueltos.length} archivo(s) sueltos en ${config.carpeta}/, fuera de la carpeta de un tipo de ramo: no se publican.`);
    sueltos.forEach((s) => console.log(`     - ${s.archivo}`));
  }
}

for (const [seccion, config] of Object.entries(SECCIONES)) {
  console.log(`\n━━━ ${seccion} ━━━`);
  manifiesto.secciones[seccion] = await importarGaleria(seccion, path.join(ORIGEN, config.carpeta), seccion, seccion);
}

// Galerías que dejaron de existir en la configuración: fuera.
const vigentes = new Set([...Object.keys(PRODUCTOS), ...Object.keys(SECCIONES), path.basename(MANIFIESTO)]);
await limpiar(DESTINO_FOTOS, vigentes);
await limpiar(DESTINO_VIDEOS, new Set([...vigentes, 'ramo.mp4']));

await fs.writeFile(MANIFIESTO, JSON.stringify(manifiesto, null, 2) + '\n');
console.log(`\nManifiesto escrito en ${MANIFIESTO}`);

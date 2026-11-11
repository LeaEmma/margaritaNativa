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
 *       <origen>/Eventos/<categoría>/<fotos y videos> → eventos
 *
 *   Una sección puede tener subcarpetas por categoría ("Ramos de novia",
 *   "Centros de mesa"): el nombre de la carpeta queda como leyenda de cada
 *   pieza y las categorías se muestran en el orden de `subcarpetas`.
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
import heicConvert from 'heic-convert';
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

/** Galerías por producto que deja scripts/importar-macetas.mjs: acá se conservan. */
const AJENAS = ['macetas'];

/**
 * Calidad de salida. Las galerías de producto usan la normal; una sección
 * puede pedir más (Eventos se ve ampliada a pantalla completa).
 */
const CALIDAD_NORMAL = { lado: LADO_MAXIMO, jpeg: 82, ladoVideo: LADO_VIDEO, crf: 26 };
const CALIDAD_ALTA = { lado: 2048, jpeg: 86, ladoVideo: 1920, crf: 22 };

/**
 * Bloques de la home con las fotos sueltas de una carpeta. `subcarpetas`
 * fija qué categorías se leen y en qué orden; las que no figuran van al final.
 */
const SECCIONES = {
  suscripcion: { carpeta: 'Suscripción' },
  eventos: {
    carpeta: 'Eventos',
    subcarpetas: ['Ambientación', 'Centros de mesa', 'Ramos de novia'],
    calidad: CALIDAD_ALTA,
  },
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
  // Eventos se ordena dentro de cada categoría; el video de la rosa roja va después del IMG_1662.
  eventos: [
    'Copia de IMG_1666.HEIC',
    'Copia de IMG_1671.HEIC',
    'Copia de IMG_1662.MOV',
    'Copia de WhatsApp Video 2026-11-10 at 14.12.29 (1).mp4',
    'Copia de WhatsApp Video 2026-11-10 at 14.12.27.mp4',
  ],
};

/**
 * Piezas retocadas a mano después de importarlas: no se vuelven a convertir
 * mientras la copia exista, para no perder el retoque. Para rehacer una,
 * borrar su copia en src/assets/galeria y public/video y retocarla de nuevo.
 */
const RETOCADAS = new Set([
  'Copia de IMG_1760.MOV', // caras de los novios e invitados difuminadas (OpenCV + YuNet)
  'Copia de WhatsApp Image 2026-11-10 at 14.12.28 (1).jpeg', // tatuaje del antebrazo borrado
]);

/**
 * Recorte previo de una foto, en fracciones del ancho y el alto (0 a 1), para
 * sacar lo que no es la foto (las barras de una captura, por ejemplo):
 * `'archivo.jpg': { x0: 0, y0: 0.1, x1: 1, y1: 0.9 }`.
 */
const RECORTE = {};

const esImagen = (f) => /\.(jpe?g|png|webp|heic)$/i.test(f);
const esHeic = (f) => /\.heic$/i.test(f);
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
async function piezasDe(dir, titulo) {
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
    piezas.push({ archivo: entrada.name, ruta, titulo, mtime: (await fs.stat(ruta)).mtimeMs });
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

async function convertirFoto(pieza, salida, calidad) {
  // sharp no trae decodificador de HEIC (las fotos del iPhone): se pasan antes a JPEG.
  const entrada = esHeic(pieza.archivo)
    ? Buffer.from(await heicConvert({ buffer: await fs.readFile(pieza.ruta), format: 'JPEG', quality: 0.95 }))
    : pieza.ruta;
  const { data, info } = await sharp(entrada).rotate().toBuffer({ resolveWithObject: true });
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
    .resize(calidad.lado, calidad.lado, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: calidad.jpeg, mozjpeg: true })
    .toFile(salida);
  return { ancho: resultado.width, alto: resultado.height, kb: Math.round(resultado.size / 1024) };
}

async function convertirVideo(pieza, salidaVideo, salidaPoster, calidad) {
  const existente = existsSync(salidaVideo) ? (await fs.stat(salidaVideo)).mtimeMs : 0;
  let convertido = false;
  if (existente < pieza.mtime) {
    // ffmpeg aplica solo la rotación del celular; iw/ih ya vienen rotados.
    // Nunca se agranda: un video más chico que el lado pedido queda como está.
    const lado = calidad.ladoVideo;
    const escala = `scale='if(gt(iw,ih),min(${lado},iw),-2)':'if(gt(iw,ih),-2,min(${lado},ih))'`;
    await ejecutar(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', pieza.ruta,
      '-vf', `${escala},fps=30`,
      '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-crf', String(calidad.crf), '-preset', 'slow', '-movflags', '+faststart',
      '-an',
      salidaVideo,
    ]);
    convertido = true;
  }
  const cuadro = `${salidaPoster}.cuadro.png`;
  await ejecutar(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1', '-i', salidaVideo, '-frames:v', '1', cuadro]);
  const resultado = await sharp(cuadro).jpeg({ quality: calidad.jpeg, mozjpeg: true }).toFile(salidaPoster);
  await fs.unlink(cuadro);
  const kb = Math.round((await fs.stat(salidaVideo)).size / 1024);
  return { ancho: resultado.width, alto: resultado.height, kb, convertido };
}

/** Ancho y alto de una imagen ya producida (las retocadas, que no se reconvierten). */
async function dimensiones(archivo) {
  const { width, height } = await sharp(archivo).metadata();
  return { ancho: width, alto: height };
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
async function importarGaleria(clave, fuentes, rutaFotos, rutaVideos, calidad = CALIDAD_NORMAL) {
  const dirFotos = path.join(DESTINO_FOTOS, rutaFotos);
  const dirVideos = path.join(DESTINO_VIDEOS, rutaVideos);
  await fs.mkdir(dirFotos, { recursive: true });
  await fs.mkdir(dirVideos, { recursive: true });

  // `fuentes`: una carpeta, o varias con su leyenda ({ dir, titulo }), en orden.
  const listaFuentes = typeof fuentes === 'string' ? [{ dir: fuentes }] : fuentes;
  const piezas = [];
  for (const { dir, titulo } of listaFuentes) piezas.push(...ordenar(clave, await piezasDe(dir, titulo)));
  const fotosProducidas = new Set();
  const videosProducidos = new Set();
  const lista = [];

  for (const pieza of piezas) {
    const base = aSlug(path.parse(pieza.archivo).name.replace(/^copia de /i, '')) || 'pieza';
    const slug = pieza.titulo ? `${aSlug(pieza.titulo)}-${base}` : base;
    try {
      if (esVideo(pieza.archivo)) {
        const nombreVideo = `${slug}.mp4`;
        const nombrePoster = `${slug}.poster.jpg`;
        const salidaVideo = path.join(dirVideos, nombreVideo);
        const salidaPoster = path.join(dirFotos, nombrePoster);
        const r =
          RETOCADAS.has(pieza.archivo) && existsSync(salidaVideo) && existsSync(salidaPoster)
            ? { ...(await dimensiones(salidaPoster)), kb: Math.round((await fs.stat(salidaVideo)).size / 1024), convertido: false }
            : await convertirVideo(pieza, salidaVideo, salidaPoster, calidad);
        videosProducidos.add(nombreVideo);
        fotosProducidas.add(nombrePoster);
        lista.push({
          tipo: 'video',
          archivo: `${rutaFotos}/${nombrePoster}`,
          video: `/video/${rutaVideos}/${nombreVideo}`,
          ancho: r.ancho,
          alto: r.alto,
          ...(pieza.titulo && { titulo: pieza.titulo }),
        });
        console.log(`  ▶ ${pieza.archivo.padEnd(36)} ${r.ancho}×${r.alto} ${String(r.kb).padStart(6)} KB${r.convertido ? '' : '  (ya convertido)'}`);
      } else {
        const nombreFoto = `${slug}.jpg`;
        const salidaFoto = path.join(dirFotos, nombreFoto);
        const r =
          RETOCADAS.has(pieza.archivo) && existsSync(salidaFoto)
            ? { ...(await dimensiones(salidaFoto)), kb: Math.round((await fs.stat(salidaFoto)).size / 1024) }
            : await convertirFoto(pieza, salidaFoto, calidad);
        fotosProducidas.add(nombreFoto);
        lista.push({
          tipo: 'foto',
          archivo: `${rutaFotos}/${nombreFoto}`,
          ancho: r.ancho,
          alto: r.alto,
          ...(pieza.titulo && { titulo: pieza.titulo }),
        });
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

const anterior = existsSync(MANIFIESTO) ? JSON.parse(await fs.readFile(MANIFIESTO, 'utf8')) : { productos: {} };
const manifiesto = {
  secciones: {},
  productos: Object.fromEntries(AJENAS.flatMap((c) => (anterior.productos[c] ? [[c, anterior.productos[c]]] : []))),
};

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
  const dir = path.join(ORIGEN, config.carpeta);
  let fuentes = dir;
  if (config.subcarpetas) {
    const existentes = existsSync(dir)
      ? (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    const posicion = (n) => {
      const i = config.subcarpetas.findIndex((s) => aSlug(s) === aSlug(n));
      return i < 0 ? Infinity : i;
    };
    existentes.sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b));
    // Primero lo suelto (sin leyenda), después cada categoría.
    fuentes = [{ dir }, ...existentes.map((n) => ({ dir: path.join(dir, n), titulo: n }))];
  }
  manifiesto.secciones[seccion] = await importarGaleria(seccion, fuentes, seccion, seccion, config.calidad);
}

// Galerías que dejaron de existir en la configuración: fuera.
const vigentes = new Set([...Object.keys(PRODUCTOS), ...Object.keys(SECCIONES), ...AJENAS, path.basename(MANIFIESTO)]);
await limpiar(DESTINO_FOTOS, vigentes);
await limpiar(DESTINO_VIDEOS, new Set([...vigentes, 'ramo.mp4']));

await fs.writeFile(MANIFIESTO, JSON.stringify(manifiesto, null, 2) + '\n');
console.log(`\nManifiesto escrito en ${MANIFIESTO}`);

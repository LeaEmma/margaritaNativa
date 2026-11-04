/**
 * Importa las macetas: lee la pestaña "Macetas" de la planilla, se queda con
 * las filas que tienen Publicar = Si y precio de venta, y escribe
 * src/datos/macetas.json. Después busca las fotos en la carpeta Macetas del
 * Drive y las deja en src/assets/fotos/macetas/<slug>.jpg.
 *
 *   node scripts/importar-macetas.mjs                 # planilla publicada + Drive en G:
 *   node scripts/importar-macetas.mjs --csv <archivo> # otra fuente de filas (CSV exportado)
 *   node scripts/importar-macetas.mjs --fotos <ruta>  # otra carpeta de fotos
 *   node scripts/importar-macetas.mjs --ejemplo       # marca los datos como de prueba
 *
 * Columnas que se usan (por nombre de encabezado, no por posición): Nombre,
 * Tipo, Tamaño, Detalle, Alto (cm), Boca (cm), Capacidad (L), Planta ideal,
 * Precio venta y Publicar. "Precio compra" y "Nota" son internas y no salen
 * de acá.
 *
 * Igual que en Plantas, un modelo con varias medidas es una fila por medida,
 * con el mismo Nombre y la columna Tamaño cargada: en el sitio queda un solo
 * producto con selector. Si el tamaño viene en el nombre ("Uovo Chica"), se lo
 * saca para agruparlas.
 *
 * Los modelos de autorriego (dice "autorriego" en el Nombre o el Detalle) llevan
 * esa etiqueta en la fila del catálogo. Macetas se muestra en listas: Autorriego,
 * Rotomoldeadas rústicas (los modelos con carpeta en Macetas/Rotomoldeadas/) y
 * Otras macetas.
 *
 * La columna Colores es una lista separada por punto y coma o coma. Cada color
 * usa la foto de la carpeta del modelo que se llama igual ("Chocolate" →
 * chocolate.png; si no coincide, ver FOTO_COLOR) y se elige en la fila. Si un
 * color no viene en un tamaño, se lo deja afuera de esa fila.
 *
 * Las fotos van en una carpeta por modelo, en cualquier nivel debajo de
 * Macetas (p. ej. Macetas/Rotomoldeadas/Mate/). La miniatura es la de PRINCIPAL,
 * la llamada "portada", la del primer color o la más reciente. Toda maceta con
 * foto se puede ver ampliada: la galería "Ver foto" de la fila lleva una foto por
 * color, o todas las de la carpeta si el modelo no tiene colores.
 *
 * Con --ejemplo el JSON queda marcado y el build de producción falla (ver
 * catalogo.ts): sirve para ver el diseño en local sin riesgo de publicar
 * precios inventados.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { leerHoja, leerFilaCsv, aSlug, nombreComercial, ORIGEN_DRIVE } from './planilla.mjs';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const CSV = opcion('--csv');
const FOTOS = opcion('--fotos') ?? path.join(ORIGEN_DRIVE, 'Macetas');
const EJEMPLO = args.includes('--ejemplo');

const SALIDA_DATOS = 'src/datos/macetas.json';
const SALIDA_FOTOS = 'src/assets/fotos';
const SALIDA_GALERIA = 'src/assets/galeria';
const MANIFIESTO_GALERIA = path.join(SALIDA_GALERIA, 'galeria.json');
const CATEGORIA = 'macetas';
const LADO = 900;
const LADO_SIN_FONDO = 400; // las fotos del proveedor son chicas y solo se usan de miniatura
const UMBRAL_BLANCO = 205; // de acá para arriba, un gris neutro cuenta como fondo
const LADO_GALERIA = 1600; // lado mayor
const LADO_AMPLIADA = 900; // las fotos del proveedor, agrandadas para la galería
const CREMA = '#fff5c3'; // el fondo del sitio

/** Orden en el catálogo: primero las macetas, después lo que las acompaña. */
const ORDEN_TIPO = ['Maceta', 'Colgante', 'Plato', 'Florero'];

/**
 * Carpetas de fotos cuyo nombre no coincide con el del modelo en la planilla.
 * Clave: slug de la carpeta. Valor: slug del producto.
 */
const ALIAS = {
  africa: 'africana',
  // Por si el Nombre se corrige a "Autorriego con pie" y la carpeta sigue igual.
  'autoriego-con-pie': 'autorriego-con-pie',
  'uovo-autoriego': 'uovo',
  'uovo-autorriego': 'uovo',
};

/**
 * Fotos de color que no se llaman como el color en la planilla. Clave: slug del
 * modelo. Valor: { slug del color: slug del nombre del archivo }.
 */
const FOTO_COLOR = {
  africana: { beige: 'arena-claro', 'gris-claro': 'gris-piedra', 'gris-oscuro': 'gris-piedra-oscuro' },
};

/**
 * Foto de la miniatura y encuadre por modelo. `x` e `y` son el centro de lo que
 * interesa, en fracciones de la foto (0 a 1), y `zoom` achica el cuadrado.
 */
const FOTO_AUTORRIEGO_CON_PIE = { foto: 'file_000000007824820eb40ea7433cd2af87.png', x: 0.5, y: 0.54 };
const PRINCIPAL = {
  'autoriego-con-pie': FOTO_AUTORRIEGO_CON_PIE,
  'autorriego-con-pie': FOTO_AUTORRIEGO_CON_PIE,
};

/** Color con el que arranca cada lista, si el modelo lo tiene. Slug del color. */
const COLOR_INICIAL = { 'Rotomoldeadas rústicas': 'gris-claro' };

/**
 * Una foto con varios colores juntos: qué parte de la foto es cada uno, en píxeles.
 * Clave: slug del modelo. Si el archivo ya no está, el color queda sin foto propia.
 * Esa foto es la vista general: la fila arranca con ella y sin color elegido, y
 * abre la galería.
 */
const RECORTE_COLOR = {
  uovo: {
    foto: 'file_0000000087d0820e80f29210d681c8cf.png',
    blanco: { left: 20, top: 385, width: 478, height: 580 },
    negro: { left: 498, top: 385, width: 446, height: 580 },
    beige: { left: 945, top: 385, width: 485, height: 580 },
  },
};

/* --------------------------------------------------------------- Filas */

async function leerFilas() {
  if (!CSV) return leerHoja('Macetas');
  const texto = (await fs.readFile(CSV, 'utf8')).replace(/^﻿/, '').trim();
  const [enc, ...resto] = texto.split(/\r?\n/).map(leerFilaCsv);
  const encabezados = enc.map((h) => h.trim());
  return resto.map((c) => Object.fromEntries(encabezados.map((h, i) => [h, (c[i] ?? '').trim()])));
}

/** "$ 12.500" o "12500" → 12500. Vacío o inválido → 0. */
const pesos = (v) => Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
/** "27,5" o "27.5" → "27,5"; vacío → undefined. */
const medida = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return n > 0 ? n.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : undefined;
};
const siNo = (v) => /^s[ií]$/i.test(String(v ?? '').trim());
const esAutorriego = (f) => /autor+iego/i.test(`${f.Nombre ?? ''} ${f.Detalle ?? ''}`);

/** "arena; Gris Claro" → ["Arena", "Gris Claro"]. */
const coloresDe = (f) =>
  String(f.Colores ?? '')
    .split(/[;,]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));

/** El tamaño puede venir en el nombre: "Uovo Chica (Beruplast)" → "Uovo (Beruplast)". */
const sinTamano = (t) => t.replace(/\s+(chica|mediana|grande)\b/i, '').trim();

function medidasDe(f) {
  const partes = [];
  const alto = medida(f['Alto (cm)']);
  const boca = medida(f['Boca (cm)']);
  const litros = medida(f['Capacidad (L)']);
  if (alto) partes.push(`${alto} cm de alto`);
  if (boca) partes.push(`${boca} cm de boca`);
  if (litros) partes.push(`${litros} litros`);
  return partes.join(' · ') || undefined;
}

/**
 * "Hortensia o Cala de color" → "Ideal para: Hortensia o Cala de color". Los
 * nombres quedan como en la planilla, con mayúscula como en el catálogo, porque
 * hay nombres propios ("Santa Rita"). Los platos ya dicen "Bajo Mate N°20".
 */
function idealDe(f) {
  const t = (f['Planta ideal'] ?? '').trim();
  if (!t) return undefined;
  return /^bajo\b/i.test(t) ? t : `Ideal para: ${t}`;
}

const filas = await leerFilas();
if (!filas.length) {
  console.log('La pestaña Macetas está vacía.');
}

const avisos = [];
const grupos = new Map();
let publicadas = 0;

for (const f of filas) {
  const nombre = (f.Nombre ?? '').trim();
  if (!nombre || !siNo(f.Publicar)) continue;
  const precio = pesos(f['Precio venta']);
  if (!precio) {
    avisos.push(`${nombre} ${f['Tamaño'] ?? ''}: Publicar = Si pero sin precio de venta; no se publica.`);
    continue;
  }
  const clave = sinTamano(nombre);
  if (!grupos.has(clave)) {
    grupos.set(clave, {
      clave,
      etiqueta: esAutorriego(f) ? 'Autorriego' : undefined,
      tipo: (f.Tipo ?? '').trim() || 'Maceta',
      detalle: (f.Detalle ?? '').trim() || undefined,
      filas: [],
    });
  }
  grupos.get(clave).filas.push({
    tamano: (f['Tamaño'] ?? '').trim(),
    precio,
    medidas: medidasDe(f),
    ideal: idealDe(f),
    colores: coloresDe(f),
  });
  publicadas++;
}

/* Nombre que se ve: sin la marca entre paréntesis, salvo que dos modelos
   queden con el mismo nombre ("Piramidal" y "Piramidal (Matri)"). */
const visibles = new Map();
for (const g of grupos.values()) {
  const corto = nombreComercial(g.clave);
  visibles.set(aSlug(corto), (visibles.get(aSlug(corto)) ?? 0) + 1);
}

const macetas = [...grupos.values()]
  .map((g, orden) => {
    const corto = nombreComercial(g.clave);
    const nombre = visibles.get(aSlug(corto)) > 1 ? g.clave : corto;
    const conTamano = g.filas.filter((x) => x.tamano);
    if (g.filas.length > 1 && conTamano.length < g.filas.length) {
      avisos.push(`${g.clave}: hay filas sin Tamaño en un modelo con varias medidas; se omiten.`);
    }
    // Todos los colores del modelo; cada medida dice cuáles vienen en ella.
    const colores = [...new Set(g.filas.flatMap((x) => x.colores))].map((c) => ({ nombre: c }));
    const base = {
      nombre,
      etiqueta: g.etiqueta,
      tipo: g.tipo,
      detalle: g.detalle,
      colores: colores.length ? colores : undefined,
      orden,
    };
    if (conTamano.length) {
      const tamanos = conTamano
        .map(({ tamano, precio, medidas, ideal, colores: propios }) => ({
          nombre: tamano,
          precio,
          medidas,
          ideal,
          colores: propios.length ? propios : undefined,
        }))
        .sort((a, b) => a.precio - b.precio);
      return { ...base, tamanos };
    }
    const [unica] = g.filas;
    return { ...base, precio: unica.precio, medidas: unica.medidas, ideal: unica.ideal };
  })
  .sort((a, b) => {
    const ta = ORDEN_TIPO.indexOf(a.tipo), tb = ORDEN_TIPO.indexOf(b.tipo);
    return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb) || a.orden - b.orden;
  })
  .map(({ orden, ...m }) => m);

console.log(`━━━ Macetas ━━━\n  ${macetas.length} modelo(s), ${publicadas} medida(s) con Publicar = Si → ${SALIDA_DATOS}${EJEMPLO ? '  (EJEMPLO)' : ''}`);

/* --------------------------------------------------------------- Fotos */

const esImagen = (f) => /\.(jpe?g|png|webp)$/i.test(f);

/** Carpetas con fotos adentro, en cualquier nivel. */
async function carpetasConFotos(dir) {
  const entradas = await fs.readdir(dir, { withFileTypes: true });
  const fotos = entradas.filter((e) => e.isFile() && esImagen(e.name)).map((e) => path.join(dir, e.name));
  const hijas = await Promise.all(
    entradas.filter((e) => e.isDirectory()).map((e) => carpetasConFotos(path.join(dir, e.name))),
  );
  return [...(fotos.length ? [{ dir, fotos }] : []), ...hijas.flat()];
}

/** La foto de un color en la carpeta del modelo. */
function fotoDeColor(slug, color, fotos) {
  const buscada = FOTO_COLOR[slug]?.[aSlug(color)] ?? aSlug(color);
  return fotos.find((f) => aSlug(path.parse(f).name) === buscada);
}

/** Lo que se muestra de un color: `imagen` es el archivo o, si es un recorte, sus bytes. */
async function piezaDeColor(slug, color, fotos) {
  const recortes = RECORTE_COLOR[slug];
  const recorte = recortes?.[aSlug(color)];
  const foto = recorte && fotos.find((f) => path.basename(f) === recortes.foto);
  if (foto) return { archivo: foto, imagen: await sharp(foto).extract(recorte).png().toBuffer() };
  const archivo = fotoDeColor(slug, color, fotos);
  return archivo && { archivo, imagen: archivo };
}

/** La foto de la miniatura: la de PRINCIPAL, la "portada", la del primer color o la más reciente. */
async function fotoPrincipal(slug, fotos, colores = []) {
  const base = (f) => path.basename(f);
  const elegida = fotos.find((f) => base(f) === PRINCIPAL[slug]?.foto);
  if (elegida) return elegida;
  const portada = fotos.find((f) => /^portada\b/i.test(base(f)));
  if (portada) return portada;
  const delColor = colores.map((c) => fotoDeColor(slug, c.nombre, fotos)).find(Boolean);
  if (delColor) return delColor;
  const conFecha = await Promise.all(fotos.map(async (f) => ({ f, t: (await fs.stat(f)).mtimeMs })));
  return conFecha.sort((a, b) => b.t - a.t)[0].f;
}

/**
 * Vuelve transparente el fondo blanco de una foto de catálogo. Devuelve null si
 * la foto no tiene ese fondo (si el borde no es casi todo blanco). Solo se borra
 * el blanco conectado con el borde, para no agujerear una maceta clara, y de a
 * poco según lo claro que sea, para que la sombra no deje un halo gris.
 */
async function sinFondoBlanco(fuente) {
  const { data, info } = await sharp(fuente).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: ancho, height: alto } = info;
  const esFondo = (p) => {
    const i = p * 4;
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    return a < 16 || (Math.min(r, g, b) >= UMBRAL_BLANCO && Math.max(r, g, b) - Math.min(r, g, b) <= 20);
  };

  const borde = [];
  for (let x = 0; x < ancho; x++) borde.push(x, (alto - 1) * ancho + x);
  for (let y = 1; y < alto - 1; y++) borde.push(y * ancho, y * ancho + ancho - 1);
  const pendientes = borde.filter(esFondo);
  if (pendientes.length < borde.length * 0.9) return null;

  const fondo = new Uint8Array(ancho * alto);
  pendientes.forEach((p) => (fondo[p] = 1));
  while (pendientes.length) {
    const p = pendientes.pop();
    const x = p % ancho;
    const vecinos = [x > 0 ? p - 1 : -1, x < ancho - 1 ? p + 1 : -1, p - ancho, p + ancho];
    for (const v of vecinos) {
      if (v >= 0 && v < fondo.length && !fondo[v] && esFondo(v)) {
        fondo[v] = 1;
        pendientes.push(v);
      }
    }
  }

  for (let p = 0; p < fondo.length; p++) {
    if (!fondo[p]) continue;
    const i = p * 4;
    const opacidad = Math.min(1, (255 - Math.min(data[i], data[i + 1], data[i + 2])) / (255 - UMBRAL_BLANCO));
    if (opacidad > 0) {
      // Saca el blanco que traía mezclado, para que el borde tome el color de la página.
      for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, (data[i + c] - 255 * (1 - opacidad)) / opacidad));
    }
    data[i + 3] = Math.round(opacidad * data[i + 3]);
  }
  return sharp(data, { raw: { width: ancho, height: alto, channels: 4 } });
}

/**
 * Miniatura cuadrada: en JPG con encuadre si es una foto armada; si no, en PNG
 * sobre fondo transparente, sin el blanco si lo tenía.
 */
async function miniatura(fuente, encuadre, salida) {
  if (!encuadre) {
    const imagen = (await sinFondoBlanco(fuente)) ?? sharp(fuente).rotate();
    return imagen
      .resize(LADO_SIN_FONDO, LADO_SIN_FONDO, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(salida);
  }
  const { data, info } = await sharp(fuente).rotate().toBuffer({ resolveWithObject: true });
  const lado = Math.round(Math.min(info.width, info.height) / (encuadre.zoom ?? 1));
  const limitar = (v, max) => Math.max(0, Math.min(Math.round(v), max));
  return sharp(data)
    .extract({
      left: limitar(encuadre.x * info.width - lado / 2, info.width - lado),
      top: limitar(encuadre.y * info.height - lado / 2, info.height - lado),
      width: lado,
      height: lado,
    })
    .resize(LADO, LADO)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(salida);
}

/**
 * Galería "Ver foto" de un modelo: una foto por color, con su nombre, o, si no hay
 * fotos por color, todas las de la carpeta con la principal primero. Las que no tienen fondo se agrandan
 * sobre el crema del sitio: en la galería oscura una maceta chocolate no se vería.
 */
async function galeriaDe(fotos, principal, colores, categoria, slug, general) {
  const porColor = [];
  for (const { nombre } of colores ?? []) {
    const pieza = await piezaDeColor(slug, nombre, fotos);
    if (pieza) porColor.push({ fuente: pieza.imagen, titulo: nombre, archivo: `${aSlug(nombre)}.jpg` });
  }
  const primera = general ? [{ fuente: general, archivo: 'vista-general.jpg' }] : [];
  const piezas = porColor.length
    ? [...primera, ...porColor]
    : [principal, ...fotos.filter((f) => f !== principal).sort()].map((fuente) => ({
        fuente,
        archivo: `${aSlug(path.parse(fuente).name)}.jpg`,
      }));

  const dir = path.join(SALIDA_GALERIA, categoria, slug);
  if (piezas.length) await fs.mkdir(dir, { recursive: true });
  const lista = [];
  for (const { fuente, titulo, archivo: nombre } of piezas) {
    const sinFondo = await sinFondoBlanco(fuente);
    const imagen = sinFondo
      ? sinFondo.resize(LADO_AMPLIADA, LADO_AMPLIADA, { fit: 'contain', background: CREMA }).flatten({ background: CREMA })
      : sharp(fuente).rotate().resize(LADO_GALERIA, LADO_GALERIA, { fit: 'inside', withoutEnlargement: true });
    const info = await imagen.jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(dir, nombre));
    lista.push({ tipo: 'foto', archivo: `${categoria}/${slug}/${nombre}`, ancho: info.width, alto: info.height, titulo });
  }
  return lista;
}

/* La carpeta dice la línea de cada modelo, aunque todavía no tenga fotos. */
const carpetaRusticas = path.join(FOTOS, 'Rotomoldeadas');
const rusticas = new Set(
  existsSync(carpetaRusticas)
    ? (await fs.readdir(carpetaRusticas, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => ALIAS[aSlug(e.name)] ?? aSlug(e.name))
    : [],
);

const porSlug = new Map(macetas.map((m) => [aSlug(m.nombre), m]));

for (const [slug, maceta] of porSlug) {
  maceta.lista = maceta.etiqueta ?? (rusticas.has(slug) ? 'Rotomoldeadas rústicas' : 'Otras macetas');
  // El color predeterminado va primero: la fila, la miniatura y la galería arrancan con él.
  const inicial = COLOR_INICIAL[maceta.lista];
  maceta.colores?.sort((a, b) => (aSlug(b.nombre) === inicial) - (aSlug(a.nombre) === inicial));
}
const cubiertos = new Set();
const sinUso = [];
const galerias = {};
const miniaturaDeColor = (slug, color) => path.join(SALIDA_FOTOS, CATEGORIA, `${slug}--${aSlug(color)}.png`);

if (!existsSync(FOTOS)) {
  // Sin el Drive no se toca nada: lo ya importado sigue valiendo.
  console.log(`  (no existe ${FOTOS}: no se importan fotos)`);
} else {
  await fs.rm(path.join(SALIDA_FOTOS, CATEGORIA), { recursive: true, force: true });
  await fs.rm(path.join(SALIDA_GALERIA, CATEGORIA), { recursive: true, force: true });
  await fs.mkdir(path.join(SALIDA_FOTOS, CATEGORIA), { recursive: true });
  for (const { dir, fotos } of await carpetasConFotos(FOTOS)) {
    if (path.resolve(dir) === path.resolve(FOTOS)) continue; // sueltas en la raíz
    const nombreCarpeta = path.basename(dir);
    const slugCarpeta = aSlug(nombreCarpeta);
    const slug = porSlug.has(slugCarpeta) ? slugCarpeta : ALIAS[slugCarpeta];
    if (!porSlug.has(slug)) {
      sinUso.push(nombreCarpeta);
      continue;
    }
    const maceta = porSlug.get(slug);
    const principal = await fotoPrincipal(slug, fotos, maceta.colores);
    const encuadre = path.basename(principal) === PRINCIPAL[slug]?.foto ? PRINCIPAL[slug] : undefined;
    const info = await miniatura(principal, encuadre, path.join(SALIDA_FOTOS, CATEGORIA, `${slug}.${encuadre ? 'jpg' : 'png'}`));
    cubiertos.add(slug);
    console.log(`  ✓ ${slug.padEnd(28)} ${Math.round(info.size / 1024)} KB   ← ${path.relative(FOTOS, principal)}`);
    const general = fotos.find((f) => path.basename(f) === RECORTE_COLOR[slug]?.foto);
    if (general) maceta.vistaGeneral = true;
    const galeria = await galeriaDe(fotos, principal, maceta.colores, CATEGORIA, slug, general);
    if (galeria.length) {
      galerias[slug] = galeria;
      console.log(`    + galería de ${galeria.length} foto(s)`);
    }
    if (maceta.colores) {
      const usadas = new Set();
      for (const { nombre } of maceta.colores) {
        const pieza = await piezaDeColor(slug, nombre, fotos);
        if (!pieza) {
          avisos.push(`${maceta.nombre}: no hay foto del color ${nombre}.`);
          continue;
        }
        usadas.add(pieza.archivo);
        await miniatura(pieza.imagen, undefined, miniaturaDeColor(slug, nombre));
        console.log(`    + color ${nombre}   ← ${path.basename(pieza.archivo)}`);
      }
      const otras = fotos.filter((f) => !usadas.has(f)).map((f) => path.parse(f).name);
      if (otras.length) avisos.push(`${maceta.nombre}: fotos sin color en la planilla: ${otras.join(', ')}.`);
    }
  }
  // La galería comparte manifiesto con importar-galeria.mjs, que conserva estas categorías.
  const manifiesto = JSON.parse(await fs.readFile(MANIFIESTO_GALERIA, 'utf8'));
  manifiesto.productos[CATEGORIA] = galerias;
  await fs.writeFile(MANIFIESTO_GALERIA, JSON.stringify(manifiesto, null, 2) + '\n');
}

/* Se escribe al final: cada color dice si tiene foto propia. */
for (const [slug, maceta] of porSlug) {
  for (const color of maceta.colores ?? []) {
    if (existsSync(miniaturaDeColor(slug, color.nombre))) color.foto = `${slug}--${aSlug(color.nombre)}`;
  }
}
await fs.writeFile(
  SALIDA_DATOS,
  JSON.stringify({ ejemplo: EJEMPLO || undefined, macetas }, null, 2) + '\n',
);

const faltan = [...porSlug.keys()].filter((s) => !cubiertos.has(s));
if (faltan.length) {
  console.log(`\n  Sin foto (${faltan.length}):`);
  faltan.forEach((s) => console.log(`     - ${porSlug.get(s).nombre}`));
}
if (sinUso.length) {
  console.log(`\n  Carpetas con fotos que no corresponden a una maceta publicada (${sinUso.length}):`);
  sinUso.forEach((s) => console.log(`     - ${s}`));
}
if (avisos.length) {
  console.log(`\n  Avisos (${avisos.length}):`);
  avisos.forEach((s) => console.log(`     - ${s}`));
}

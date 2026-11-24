/**
 * Imprime /mayoristas a PDF con Edge o Chrome sin ventana y lo deja en
 * public/presupuesto-mayorista.pdf (se publica en /presupuesto-mayorista.pdf)
 * y en la carpeta Presupuestos del Drive.
 *
 *   node scripts/importar-mayoristas.mjs      # 1. precios de la planilla
 *   npm run dev                               # 2. el sitio en local
 *   node scripts/generar-presupuesto.mjs [url] # 3. el PDF
 *
 * La URL por defecto es http://localhost:4321/mayoristas.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ORIGEN_DRIVE } from './planilla.mjs';

const URL_PAGINA = process.argv[2] ?? 'http://localhost:4321/mayoristas';
const SALIDA = path.resolve('public/presupuesto-mayorista.pdf');
const DRIVE = path.join(ORIGEN_DRIVE, 'Presupuestos', 'Margarita Nativa – Presupuesto mayorista.pdf');

const NAVEGADORES = [
  process.env.NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const navegador = NAVEGADORES.find((n) => existsSync(n));
if (!navegador) throw new Error('No encontré Edge ni Chrome. Pasá la ruta en la variable NAVEGADOR.');

const r = await fetch(URL_PAGINA).catch(() => null);
if (!r?.ok) throw new Error(`No responde ${URL_PAGINA}: levantá el sitio con npm run dev.`);

execFileSync(navegador, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  // Da tiempo a que carguen las fotos antes de imprimir.
  '--virtual-time-budget=10000',
  `--print-to-pdf=${SALIDA}`,
  URL_PAGINA,
]);

const { size } = await fs.stat(SALIDA);
console.log(`✓ ${path.relative(process.cwd(), SALIDA)} (${Math.round(size / 1024)} KB)`);

if (existsSync(path.dirname(DRIVE))) {
  await fs.copyFile(SALIDA, DRIVE);
  console.log(`✓ copiado al Drive: ${DRIVE}`);
} else {
  console.log(`(no está la carpeta ${path.dirname(DRIVE)}: el PDF queda solo en public/)`);
}

/**
 * Catálogo de Margarita Nativa.
 *
 * Los precios están transcritos de las tarjetas de
 * `_resources/Margarita Nativa/Productos/` (Ramos, Suscripción, Plantas,
 * Exhibidor). Al actualizar precios, actualizar también esas tarjetas para
 * que el impreso y el sitio no se desfasen.
 */

export interface Item {
  nombre: string;
  detalle?: string;
  precio: number;
  /** Para precios "desde X" en lugar de un valor cerrado. */
  desde?: boolean;
}

export const RAMOS: Item[] = [
  { nombre: 'Mini', detalle: 'Flores de temporada.', precio: 15000 },
  { nombre: 'Lirio, cala o pajarito', detalle: 'Cada uno.', precio: 20000 },
  {
    nombre: 'Clásico',
    detalle: 'Variedad de flores de temporada, con follaje y verde.',
    precio: 25000,
  },
  {
    nombre: 'Grande',
    detalle: 'Variedad de flores de temporada, con follaje y verde. Con lirio, cala o pajarito.',
    precio: 35000,
  },
  {
    nombre: 'Personalizado',
    detalle: 'Ramos únicos pensados para cada ocasión.',
    precio: 50000,
    // La planilla no tiene columna para esto: el "desde" viene de la tarjeta impresa.
    desde: true,
  },
];

/** `precio` es el valor por ramo; `precioMensual` es el total del período. */
export interface Plan extends Item {
  ramosPorMes: number;
  precioMensual: number;
}

export const SUSCRIPCION: Plan[] = [
  { nombre: 'Semanal', detalle: '4 ramos al mes', precio: 20000, ramosPorMes: 4, precioMensual: 80000 },
  { nombre: 'Quincenal', detalle: '2 ramos al mes', precio: 25000, ramosPorMes: 2, precioMensual: 50000 },
  { nombre: 'Mensual', detalle: '1 ramo al mes', precio: 30000, ramosPorMes: 1, precioMensual: 30000 },
];

export const PLANTAS: Item[] = [
  { nombre: 'Lavanda chica', precio: 12000 },
  { nombre: 'Jazmín chino', precio: 15000 },
  { nombre: 'Santa Rita', precio: 15000 },
  { nombre: 'Bambú de la suerte', precio: 16000 },
  { nombre: 'Pino', precio: 18000 },
  { nombre: 'Palo de agua', precio: 20000 },
  { nombre: 'Lavanda grande', precio: 28000 },
  { nombre: 'Platycerium', precio: 35000 },
  { nombre: 'Monstera / Costilla de Adán', precio: 35000 },
  { nombre: 'Cala de color', precio: 40000 },
  { nombre: 'Strelitzia chica', precio: 40000 },
  { nombre: 'Santuario', detalle: 'Flor roja', precio: 40000 },
  { nombre: 'Lilium', precio: 40000 },
  { nombre: 'Orquídea', precio: 60000 },
  { nombre: 'Pandurata', precio: 60000 },
  { nombre: 'Palmera areca', precio: 75000 },
  { nombre: 'Stromanthe tricolor', precio: 35000 },
  { nombre: 'Hortensia', precio: 60000 },
  { nombre: 'Helecho', precio: 50000 },
];

/**
 * El exhibidor se presta sin costo: lo que se cobra es el servicio mensual de
 * ramos, que se reponen según lo que venda el local.
 */
export const EXHIBIDOR = {
  exhibidor: {
    nombre: 'Exhibidor',
    detalle: 'Sin costo. Disponible en blanco o negro.',
    precio: 0,
  } satisfies Item,
  ramos: {
    nombre: 'Ramos',
    detalle: 'Consultá la variedad de ramos.',
    precio: 8000,
    desde: true,
  } satisfies Item,
  servicio: 'El servicio se cobra por mes, con reposición de ramos según la demanda de tu negocio.',
};

/** Condiciones comunes a suscripción y exhibidor, tal como figuran en las tarjetas. */
export const CUIDADOS = [
  'El cliente realiza los cuidados básicos de los ramos: cambio de agua, limpieza del recipiente y ubicación adecuada.',
  'De ser necesario, reponemos las flores que estén en mal estado o se deterioren.',
];

/** Formatea un precio en pesos argentinos sin decimales: 25000 → "$25.000". */
export function precio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
    .format(valor)
    .replace(/\s/g, '');
}

/* ------------------------------------------------------------------
   Vista unificada para la página de catálogo
   ------------------------------------------------------------------ */

export type Categoria = 'ramos' | 'suscripcion' | 'plantas' | 'exhibidor';

export interface ItemCatalogo extends Item {
  categoria: Categoria;
  /** Identificador estable para anclas y para mapear la foto del producto. */
  slug: string;
  /** Texto chico después del precio, p. ej. "c/u" o "por ramo". */
  sufijo?: string;
}

/**
 * `enCatalogo` marca qué categorías se listan en /catalogo. Suscripción y
 * exhibidor quedan afuera: son servicios recurrentes y viven juntos en la
 * sección de suscripción de la home, no en el listado de productos sueltos.
 */
export const CATEGORIAS: {
  clave: Categoria;
  nombre: string;
  epigrafe?: string;
  enCatalogo: boolean;
}[] = [
  { clave: 'ramos', nombre: 'Ramos', epigrafe: 'Para todas las ocasiones', enCatalogo: true },
  { clave: 'plantas', nombre: 'Plantas', enCatalogo: true },
  { clave: 'suscripcion', nombre: 'Suscripción', epigrafe: 'Flores frescas, siempre', enCatalogo: false },
  { clave: 'exhibidor', nombre: 'Exhibidor', epigrafe: 'Para locales y comercios', enCatalogo: false },
];

/** Solo lo que se muestra en /catalogo. */
export const CATEGORIAS_CATALOGO = CATEGORIAS.filter((c) => c.enCatalogo);

function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function marcar(items: Item[], categoria: Categoria, sufijo?: string): ItemCatalogo[] {
  return items.map((item) => ({ ...item, categoria, slug: aSlug(item.nombre), sufijo }));
}

/** Todo el catálogo en una sola lista, para filtrar y recorrer. */
export const CATALOGO: ItemCatalogo[] = [
  ...marcar(RAMOS, 'ramos'),
  ...marcar(SUSCRIPCION, 'suscripcion', 'por ramo'),
  ...marcar(PLANTAS, 'plantas'),
  ...marcar([EXHIBIDOR.exhibidor], 'exhibidor'),
  ...marcar([EXHIBIDOR.ramos], 'exhibidor', 'c/u'),
];

export function porCategoria(categoria: Categoria): ItemCatalogo[] {
  return CATALOGO.filter((item) => item.categoria === categoria);
}

/**
 * Precio más bajo de una categoría, para los "desde $X" de la home.
 * En exhibidor se toma el precio por ramo: el exhibidor en sí no se cobra.
 */
export function precioDesde(categoria: Categoria): number {
  if (categoria === 'exhibidor') return EXHIBIDOR.ramos.precio;
  return Math.min(...porCategoria(categoria).map((item) => item.precio));
}

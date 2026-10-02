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
  { nombre: 'Mini', detalle: 'Fresias.', precio: 15000 },
  { nombre: 'Lirio o cala', detalle: 'Cada una.', precio: 20000 },
  {
    nombre: 'Clásico',
    detalle: 'Ramo mediano y abundante. Variedad de flores de temporada, con follaje y verde.',
    precio: 25000,
  },
  {
    nombre: 'Grande',
    detalle: 'Con lirio o cala. Más cantidad de flores, follaje y verde.',
    precio: 35000,
  },
  { nombre: 'Personalizado', detalle: 'Armado a medida, según la ocasión.', precio: 50000, desde: true },
];

export const SUSCRIPCION: Item[] = [
  { nombre: 'Semanal', detalle: 'Un ramo por semana.', precio: 40000 },
  { nombre: 'Quincenal', detalle: 'Un ramo cada quince días.', precio: 45000 },
  { nombre: 'Mensual', detalle: 'Un ramo por mes.', precio: 50000 },
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
];

export const EXHIBIDOR = {
  inicio: {
    nombre: 'Inicio de servicio',
    detalle: 'Entrega del exhibidor más seis ramos de estación.',
    precio: 60000,
  } satisfies Item,
  reposicion: [
    { nombre: '6 unidades', precio: 10000 },
    { nombre: '12 unidades', precio: 8000 },
    { nombre: '24 unidades o más', precio: 6000 },
  ] satisfies Item[],
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

export const CATEGORIAS: { clave: Categoria; nombre: string; epigrafe: string }[] = [
  { clave: 'ramos', nombre: 'Ramos', epigrafe: 'Para todas las ocasiones' },
  { clave: 'suscripcion', nombre: 'Suscripción', epigrafe: 'Flores frescas, siempre' },
  { clave: 'plantas', nombre: 'Plantas', epigrafe: 'De interior y de exterior' },
  { clave: 'exhibidor', nombre: 'Exhibidor', epigrafe: 'Para locales y comercios' },
];

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
  ...marcar([EXHIBIDOR.inicio], 'exhibidor'),
  ...marcar(EXHIBIDOR.reposicion, 'exhibidor', 'c/u'),
];

export function porCategoria(categoria: Categoria): ItemCatalogo[] {
  return CATALOGO.filter((item) => item.categoria === categoria);
}

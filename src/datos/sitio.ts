/** Datos de contacto y metadatos del sitio. Un solo lugar para editarlos. */

export const SITIO = {
  nombre: 'Margarita Nativa',
  lema: 'Flores de estación, todas las semanas',
  descripcion:
    'Ramos de flores de estación, suscripciones, plantas y ambientación floral. Armamos cada ramo a mano con lo que da la temporada.',

  instagram: 'https://instagram.com/margaritanativa',
  instagramUsuario: '@margaritanativa',
  tiktok: 'https://tiktok.com/@margarita.nativa',
  tiktokUsuario: '@margarita.nativa',
  email: 'soymargaritanativa@gmail.com',

  /** Formato internacional, solo dígitos. Si queda vacío, los botones de
   *  WhatsApp desaparecen y el resto del contacto cae en Instagram. */
  whatsapp: '5491135813920',
} as const;

/** Link de WhatsApp con mensaje prearmado, o Instagram si todavía no hay número. */
export function enlaceContacto(mensaje: string): string {
  if (!SITIO.whatsapp) return SITIO.instagram;
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

// Rutas absolutas con ancla ("/#eventos") en vez de solo el ancla: así los
// enlaces funcionan igual desde la home que desde /catalogo.
export const NAVEGACION = [
  { texto: 'Ramos', href: '/catalogo#ramos' },
  { texto: 'Suscripción', href: '/catalogo#suscripcion' },
  { texto: 'Plantas', href: '/catalogo#plantas' },
  { texto: 'Locales', href: '/catalogo#exhibidor' },
  { texto: 'Eventos', href: '/#eventos' },
  { texto: 'Contacto', href: '/#contacto' },
] as const;

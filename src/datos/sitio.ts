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

  // PENDIENTE: completar con el número real, en formato internacional sin
  // signos (ej. 5491122334455). Hasta entonces los botones de WhatsApp
  // caen en Instagram.
  whatsapp: '',
} as const;

/** Link de WhatsApp con mensaje prearmado, o Instagram si todavía no hay número. */
export function enlaceContacto(mensaje: string): string {
  if (!SITIO.whatsapp) return SITIO.instagram;
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export const NAVEGACION = [
  { texto: 'Ramos', href: '#ramos' },
  { texto: 'Suscripción', href: '#suscripcion' },
  { texto: 'Plantas', href: '#plantas' },
  { texto: 'Locales', href: '#exhibidor' },
  { texto: 'Eventos', href: '#eventos' },
  { texto: 'Contacto', href: '#contacto' },
] as const;

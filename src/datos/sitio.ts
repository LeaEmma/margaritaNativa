/** Datos de contacto y metadatos del sitio. Un solo lugar para editarlos. */

export const SITIO = {
  nombre: 'Margarita Nativa',
  lema: 'Ramos de flores y plantas',
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

/**
 * Navegación por destino, no por categoría: las categorías ya las maneja el
 * filtro del catálogo. Cuando el menú también apuntaba a cada categoría, los
 * dos competían y los enlaces a una sección filtrada no hacían nada.
 *
 * Rutas absolutas con ancla ("/#eventos") para que funcionen igual desde
 * cualquier página. `pagina` marca cuáles son destinos propios: solo esas
 * reciben el estado activo.
 */
export const NAVEGACION = [
  { texto: 'Inicio', href: '/', pagina: '/' },
  { texto: 'Catálogo', href: '/catalogo', pagina: '/catalogo' },
  { texto: 'Suscripción', href: '/#suscripcion' },
  { texto: 'Eventos', href: '/#eventos' },
  { texto: 'Contacto', href: '/#contacto' },
] as const;

/** Van al final del mismo menú, después de Contacto. */
export const NAVEGACION_SOCIAL = [
  {
    texto: 'WhatsApp',
    icono: 'whatsapp',
    href: enlaceContacto('¡Hola! Te escribo desde la web.'),
    etiqueta: 'Escribinos por WhatsApp',
    visible: Boolean(SITIO.whatsapp),
  },
  {
    texto: 'IG',
    icono: 'instagram',
    href: SITIO.instagram,
    etiqueta: `Instagram ${SITIO.instagramUsuario}`,
    visible: true,
  },
] as const;

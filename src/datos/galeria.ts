import type { ImageMetadata } from 'astro';
import manifiesto from '../assets/galeria/galeria.json';

/**
 * Galerías de fotos y videos. Hay dos clases:
 *
 * - Por producto (`galeriaProducto`): lo que hay en la carpeta de ese tipo de
 *   ramo en el Drive, que se abre desde la fila del catálogo.
 * - Por sección (`galeria`): las fotos sueltas de una carpeta, para el
 *   carrusel de un bloque de la home (el exhibidor).
 *
 * El material lo deja `scripts/importar-galeria.mjs`, que escribe
 * `galeria.json` con el orden, el tamaño y la ruta de cada pieza. Acá solo se
 * resuelven las imágenes para Astro y se agregan los textos alternativos.
 */

export type Seccion = 'suscripcion' | 'eventos';

interface PiezaManifiesto {
  tipo: 'foto' | 'video';
  /** Ruta relativa a src/assets/galeria (foto o póster del video). */
  archivo: string;
  /** Solo videos: URL pública del mp4. */
  video?: string;
  ancho: number;
  alto: number;
  /** Leyenda sobre la diapositiva, si la pieza la trae. */
  titulo?: string;
}

interface Manifiesto {
  secciones: Record<string, PiezaManifiesto[]>;
  productos: Record<string, Record<string, PiezaManifiesto[]>>;
}

export type Diapositiva =
  | { tipo: 'foto'; imagen: ImageMetadata; alt: string; titulo?: string; vertical: boolean }
  | {
      tipo: 'video';
      src: string;
      poster: ImageMetadata;
      ancho: number;
      alto: number;
      alt: string;
      titulo?: string;
      vertical: boolean;
    };

const IMAGENES = import.meta.glob<{ default: ImageMetadata }>('../assets/galeria/**/*.jpg', {
  eager: true,
});

/** Texto alternativo por sección, para las piezas que no tienen uno propio. */
const ALT_POR_SECCION: Record<Seccion, string> = {
  suscripcion: 'Exhibidor de Margarita Nativa con ramos de estación en un local',
  eventos: 'Ambientación floral de Margarita Nativa en un evento',
};

/** Textos alternativos propios, por archivo, para las piezas que lo merecen. */
const ALT_POR_ARCHIVO: Record<string, string> = {};

function resolver(piezas: PiezaManifiesto[], altPorDefecto: string): Diapositiva[] {
  return piezas.flatMap((pieza): Diapositiva[] => {
    const imagen = IMAGENES[`../assets/galeria/${pieza.archivo}`]?.default;
    if (!imagen) return [];
    const alt = ALT_POR_ARCHIVO[pieza.archivo] ?? altPorDefecto;
    const vertical = pieza.alto > pieza.ancho;
    if (pieza.tipo === 'video' && pieza.video) {
      return [
        {
          tipo: 'video',
          src: pieza.video,
          poster: imagen,
          ancho: pieza.ancho,
          alto: pieza.alto,
          alt,
          titulo: pieza.titulo,
          vertical,
        },
      ];
    }
    return [{ tipo: 'foto', imagen, alt, titulo: pieza.titulo, vertical }];
  });
}

/** Diapositivas de un bloque de la home; una sección sin material devuelve una lista vacía. */
export function galeria(seccion: Seccion): Diapositiva[] {
  return resolver((manifiesto as Manifiesto).secciones[seccion] ?? [], ALT_POR_SECCION[seccion]);
}

/**
 * Diapositivas de un producto del catálogo (`categoria` y `slug` como en
 * catalogo.ts). `alt` describe el producto: "Ramo clásico de Margarita Nativa".
 */
export function galeriaProducto(categoria: string, slug: string, alt: string): Diapositiva[] {
  return resolver((manifiesto as Manifiesto).productos[categoria]?.[slug] ?? [], alt);
}

/** La imagen de la primera pieza (foto o póster), para usar de miniatura. */
export function miniaturaDe(diapositivas: Diapositiva[]): ImageMetadata | undefined {
  const primera = diapositivas[0];
  if (!primera) return undefined;
  return primera.tipo === 'foto' ? primera.imagen : primera.poster;
}

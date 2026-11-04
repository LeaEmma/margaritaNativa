import type { ImageMetadata } from 'astro';

/**
 * Empresas y comercios que trabajaron con nosotros. Aparecen en el carrusel
 * de la home en este orden. Si hay `logo` se muestra la imagen; si no, el
 * nombre en letra de marca. Los logos van en `src/assets/empresas/`.
 */
export interface Empresa {
  nombre: string;
  /** Rubro corto, debajo del nombre (solo cuando no hay logo). */
  rubro?: string;
  logo?: ImageMetadata;
}

export const EMPRESAS: Empresa[] = [
  { nombre: 'Office Center' },
  { nombre: 'La Confianza', rubro: 'Fábrica de pastas' },
  { nombre: 'La Pilarrica' },
];

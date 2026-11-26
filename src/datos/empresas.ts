import type { ImageMetadata } from 'astro';
import lasMilCasitas from '../assets/empresas/las-mil-casitas.png';
import laConfianza from '../assets/empresas/la-confianza.png';
import unicentro from '../assets/empresas/unicentro.png';
import loDeBuka from '../assets/empresas/lo-de-buka.png';
import santaTtss from '../assets/empresas/santa-ttss.png';

/**
 * Empresas y comercios que trabajaron con nosotros. Aparecen en el carrusel
 * de la home en este orden. Cada tarjeta lleva al Instagram del comercio.
 * Los logos van en `src/assets/empresas/` (avatar de Instagram, cuadrado).
 */
export interface Empresa {
  nombre: string;
  /** Rubro corto, debajo del nombre. */
  rubro?: string;
  logo?: ImageMetadata;
  /** Usuario de Instagram, sin @. */
  instagram?: string;
}

export const EMPRESAS: Empresa[] = [
  { nombre: 'Unicentro', rubro: 'Gráfica', logo: unicentro, instagram: 'unicentroliniers' },
  { nombre: 'La Confianza', rubro: 'Fábrica de pastas', logo: laConfianza, instagram: 'fabricadepastas.laconfianza' },
  { nombre: 'Las Mil Casitas', rubro: 'Grow', logo: lasMilCasitas, instagram: 'lasmilcasitas' },
  { nombre: 'Lo de Buka', rubro: 'Puesto de diarios', logo: loDeBuka, instagram: 'lodebuka' },
  { nombre: 'Santa', rubro: 'Tattoo', logo: santaTtss, instagram: 'santa.ttss' },
];

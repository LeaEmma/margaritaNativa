// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/*
 * `site` alimenta las URL canónicas, el Open Graph y el sitemap, así que tiene
 * que ser la dirección real donde queda publicado. Netlify expone la suya en
 * la variable URL, de modo que mientras el dominio propio no esté conectado el
 * sitio igual se publica con URLs correctas en vez de apuntar a un dominio que
 * todavía no responde.
 */
const sitio = process.env.SITE_URL ?? process.env.URL ?? 'https://margaritanativa.com';

// https://astro.build/config
export default defineConfig({
  site: sitio,
  integrations: [sitemap()],
  // Respeta PORT si viene del entorno, para poder levantar varias instancias
  // en paralelo sin chocar con el 4321.
  server: { port: Number(process.env.PORT) || 4321 },
  vite: {
    plugins: [tailwindcss()],
  },
});

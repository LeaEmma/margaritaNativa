// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://margaritanativa.com',
  // Respeta PORT si viene del entorno, para poder levantar varias instancias
  // en paralelo sin chocar con el 4321.
  server: { port: Number(process.env.PORT) || 4321 },
  vite: {
    plugins: [tailwindcss()],
  },
});

# Margarita Nativa

Sitio web de **Margarita Nativa**.

## Stack

- [Astro](https://astro.build) 7 — sitio estático
- [Tailwind CSS](https://tailwindcss.com) 4 — vía plugin de Vite
- TypeScript en modo `strict`

## Requisitos

- Node.js 22.19 o superior (`node --version`)

## Comandos

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo en http://localhost:4321
npm run build    # compilar el sitio a ./dist
npm run preview  # previsualizar el build
npm run check    # chequeo de tipos y plantillas
```

## Estructura

```
public/           Archivos servidos tal cual (favicon, robots, imágenes finales)
src/
  layouts/        Layout base con <head>, SEO y metadatos
  pages/          Cada archivo .astro es una ruta del sitio
  styles/         global.css — importa Tailwind y define los tokens de marca
_resources/       Material de trabajo (fotos, logos, HEIC/MOV). NO versionado.
```

## Identidad de marca

Los colores del logo están definidos como tokens de Tailwind en
[`src/styles/global.css`](src/styles/global.css), así que se usan como
clases normales (`bg-borravino`, `text-oliva`, `border-salvia`…):

| Token            | Hex       | Uso                      |
| ---------------- | --------- | ------------------------ |
| `borravino`      | `#550000` | Color principal, la flor |
| `oliva`          | `#636b2f` | Tipografía del logo      |
| `oliva-oscuro`   | `#494f22` | Texto de cuerpo          |
| `verde-profundo` | `#274903` | Acentos                  |
| `salvia`         | `#c1ca93` | Fondos suaves            |
| `crema`          | `#fffbee` | Fondo del sitio          |

Tipografía de títulos: `font-display` (Georgia), que es la del logo.

## Pendientes

- [ ] Reemplazar `public/favicon.svg` por el logo original vectorizado
      (está en `_resources/Margarita/logoMARgarita/`, falta elegir variante tipográfica)
- [ ] Definir el contenido real de la home y las secciones del sitio
- [ ] Procesar las fotos de `_resources/` (los `.HEIC` y `.MOV` necesitan
      conversión a formatos web) y moverlas a `src/assets/`
- [ ] Confirmar el dominio definitivo en `astro.config.mjs` (`site`)
- [ ] Elegir hosting (Netlify / Vercel / GitHub Pages) y configurar el deploy

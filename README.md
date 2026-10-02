# Margarita Nativa

Sitio web de **Margarita Nativa** — ramos de flores de estación, suscripciones,
plantas, exhibidor para locales y ambientación de eventos.

## Stack

- [Astro](https://astro.build) 7 — sitio estático, sin backend
- [Tailwind CSS](https://tailwindcss.com) 4 — vía plugin de Vite
- [Fontsource](https://fontsource.org) — Playfair Display y EB Garamond autoalojadas
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
public/              Favicons y archivos servidos tal cual
src/
  assets/            Imágenes procesadas por Astro (logo y fotos recortadas)
  components/        Piezas de UI reutilizables
  datos/             catalogo.ts (precios) y sitio.ts (contacto, navegación)
  layouts/           Layout base con <head>, SEO y Open Graph
  pages/             Cada archivo .astro es una ruta
  styles/            global.css — Tailwind y los tokens de marca
_resources/          Material de trabajo original. NO versionado.
```

## Identidad de marca

La paleta está muestreada del logo definitivo
(`_resources/Margarita Nativa/Diseño & Marca/Logo/Margaritalogolíneagruesa.png`)
y definida como tokens de Tailwind en [`src/styles/global.css`](src/styles/global.css),
usables como clases normales (`bg-borravino`, `text-oliva`, `border-oliva/30`…):

| Token       | Hex       | Uso                                    |
| ----------- | --------- | -------------------------------------- |
| `borravino` | `#500000` | Color principal: la flor, los titulares |
| `oliva`     | `#606828` | Tipografía del logo, texto secundario   |
| `crema`     | `#f8f0c0` | Fondo del sello, texto sobre oscuro     |
| `papel`     | `#f2efe2` | Fondo del sitio                         |
| `tinta`     | `#3f4420` | Texto de cuerpo                         |

Tipografía: `font-display` (Playfair Display) para titulares, `font-sans`
(EB Garamond) para el cuerpo. Dos utilidades propias: `titulo-seccion` y
`versalitas` / `epigrafe`.

El criterio visual: **la paleta de marca es el marco y el color lo ponen las
flores.** Los fondos, el header y la tipografía se mantienen sobrios en
borravino, oliva y papel; la saturación entra solo por las fotos.

### Fuente del diseño

Las cuatro tarjetas de `_resources/Margarita Nativa/Productos/`
(Ramos, Suscripción, Plantas, Exhibidor) son el sistema de diseño de referencia:
papel hueso, filete oliva, sello arriba, titular borravino con tracking,
trébol de tres puntos como divisor y filas de precio con guía punteada.
El sitio replica ese armado.

## Precios

El catálogo vive en [`src/datos/catalogo.ts`](src/datos/catalogo.ts), transcrito
de esas mismas tarjetas. **Al actualizar precios, actualizar también las tarjetas
impresas** para que el impreso y el sitio no se desfasen.

## Pendientes

- [ ] **Confirmar la lógica de precios de la suscripción.** En la tarjeta,
      semanal ($40.000) es más barata que mensual ($50.000). Se interpretó como
      precio *por ramo* con descuento por frecuencia y así figura en el sitio.
      Si en realidad es el total del período, hay que invertirlo.
- [ ] **Cargar el número de WhatsApp** en `src/datos/sitio.ts`. Mientras esté
      vacío, todos los botones de contacto caen en Instagram.
- [ ] Definir zonas de entrega y costo de envío (las tres referencias cobran por zona)
- [ ] Confirmar el dominio definitivo en `astro.config.mjs` (`site`)
- [ ] Imagen de Open Graph propia (hoy no hay `og:image`)
- [ ] Sección de eventos con fotos reales de ambientación
- [ ] Elegir hosting (Netlify / Vercel / GitHub Pages) y configurar el deploy

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
  pages/             index.astro (resumen), catalogo.astro (precios) y
                     cuidados/ (una ficha por variedad, destino de los QR)
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
(Lora) para el cuerpo a 18px. Dos utilidades propias: `titulo-seccion` y
`versalitas` / `epigrafe`.

**No usar modificadores de opacidad en texto** (`text-oliva/80` y similares).
Sobre el papel de marca ninguno llega a 4.5:1, ni siquiera al 90%: `text-oliva/90`
da 4.30 y el sólido 5.30. La jerarquía se construye con tamaño y peso, no
bajando el alfa. Para texto sobre foto, el velo tiene que ser lo bastante
oscuro como para que el peor caso (una foto clara) siga pasando.

### Accesibilidad

Las dos páginas cumplen WCAG AA (4.5:1 en texto chico, 3:1 en grande), con el
par más ajustado en 5.18. Al tocar colores conviene reverificar: Tailwind 4
emite los colores como `oklab()`, así que un medidor que asuma RGB da valores
sin sentido.

La elección de Lora sobre EB Garamond es por x-height: 0.50 contra 0.405, lo
que a igual tamaño da 23% más de altura aparente. EB Garamond es una garalda
pensada para imprenta y en pantalla, a 17px, dejaba el ojo medio en 6,9px.

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

La home es el resumen y no repite precios: solo muestra un "desde" por rubro,
calculado con `precioDesde()`. El detalle completo vive en `/catalogo`. Agregar
un producto al arreglo correspondiente alcanza para que aparezca en las dos
páginas.

## Fotos de producto

Las fotos llegan a una carpeta compartida de Drive, con una subcarpeta por
producto cuyo nombre coincide con el de la planilla:

```
<origen>/Plantas/<Nombre del producto>/<cualquier foto>
```

Para importarlas:

```bash
node scripts/importar-fotos.mjs            # lee la carpeta de Drive en G:
node scripts/importar-fotos.mjs <ruta>     # o cualquier otro origen
```

El script recorta cuadrado, deja el resultado en `src/assets/fotos/<categoria>/`
y **reporta en los dos sentidos**: qué productos quedaron sin foto y qué carpetas
no coinciden con ningún producto. Ese segundo reporte es el que detecta los
errores de nombre, que de otro modo pasan desapercibidos.

Las carpetas cuyo nombre no puede coincidir con el producto se resuelven con el
mapa `ALIAS` del script, no renombrando en Drive: `Monstera` no puede llamarse
`Monstera / Costilla de Adán` porque la barra no es válida en un nombre de
archivo.

## Pedido por WhatsApp

El carrito ([`src/components/Carrito.astro`](src/components/Carrito.astro)) arma
el pedido en el navegador y lo envía como mensaje de WhatsApp ya detallado.
Vive en `localStorage`: no hay servidor, ni sesión, ni base de datos.

**No cobra ni reserva stock, y es deliberado.** Las flores son de estación y las
plantas salen del mercado, así que la disponibilidad real cambia día a día.
Cobrar antes de confirmar abre la puerta a vender algo que no hay. Lo que el
carrito resuelve es que el pedido llegue detallado en vez de "hola, quiero
flores".

El campo del nombre existe porque WhatsApp aporta el número pero no quién
escribe. Si queda vacío el pedido se manda igual, sin la presentación.

Los productos marcados `desde` no se pueden agregar: no tienen precio cerrado.

## Cuidados

`/cuidados/<variedad>` es el destino de los QR que van en la etiqueta de cada
planta. Son páginas separadas y no una sección única a propósito: quien escanea
tiene esa planta en la mano y quiere esos cuidados, no una lista de diecisiete.
Además cada una posiciona por su cuenta en búsquedas del tipo "cómo cuidar
monstera".

El contenido vive en [`src/datos/cuidados.ts`](src/datos/cuidados.ts), con cuatro
datos por variedad y nada más. La tentación de extenderlo conviene resistirla:
se lee de pie, en el celular, en el momento de recibir la planta.

## Pendientes

- [ ] **Confirmar la lógica de precios de la suscripción.** En la tarjeta,
      semanal ($40.000) es más barata que mensual ($50.000). Se interpretó como
      precio *por ramo* con descuento por frecuencia y así figura en el sitio.
      Si en realidad es el total del período, hay que invertirlo.
- [ ] Definir zonas de entrega y costo de envío (las tres referencias cobran por zona)
- [ ] Foto propia por producto en el catálogo. Hoy hay una foto por categoría;
      en `_resources/.../Fotos & Videos/` hay material para orquídeas, palmeras,
      monstera y strelitzia, pero el resto de las plantas no está identificado.
- [ ] Confirmar el dominio definitivo en `astro.config.mjs` (`site`)
- [ ] Imagen de Open Graph propia (hoy no hay `og:image`)
- [ ] Sección de eventos con fotos reales de ambientación
- [ ] Elegir hosting (Netlify / Vercel / GitHub Pages) y configurar el deploy

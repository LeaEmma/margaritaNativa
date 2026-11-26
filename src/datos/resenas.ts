/**
 * Opiniones del Perfil de Empresa en Google, copiadas a mano (sin widgets ni
 * API, para no sumar scripts de terceros). Se muestran en el carrusel de la
 * home: en cada visita se sortean 6 (ver `CarruselResenas.astro`), con 2 o 3
 * de las más largas siempre adentro. Las citas pueden ir recortadas y con la ortografía
 * corregida, pero sin cambiar lo que dijo la persona. El nombre va como nombre
 * de pila + inicial del apellido.
 *
 * Al sumar opiniones nuevas, actualizar también `cantidad` y `promedio` con lo
 * que muestra Google.
 */
export interface Resena {
  nombre: string;
  /** Qué compró, en una o dos palabras. */
  producto: string;
  cita: string;
  /** `true` para dejarla cargada pero sin mostrarla en el sitio. */
  oculta?: boolean;
}

export const RESUMEN_GOOGLE = {
  promedio: '5,0',
  cantidad: 24,
};

export const RESENAS: Resena[] = [
  {
    nombre: 'Aylen N.',
    producto: 'Suscripción',
    cita: 'Estoy fascinada con la suscripción mensual, el servicio es impecable. Tengo flores frescas en todos los rincones de mi casa: llegan hermosas una vez por mes y duran un montón.',
  },
  {
    nombre: 'Dana V.',
    producto: 'Plantas y ramos',
    cita: 'Me asesoraron con mucha paciencia para elegir lo ideal para mi balcón. Los ramos son hermosos y súper frescos, pero lo que amé es el detalle en la presentación.',
  },
  {
    nombre: 'Claudia L.',
    producto: 'Flores',
    cita: 'Entrega inmediata, buen precio y lo mejor: las flores, frescas y hermosas. ¡Gracias por embellecer mi espacio de trabajo!',
  },
  {
    nombre: 'Laura B.',
    producto: 'Souvenirs',
    cita: '¡Los souvenirs del cumple de 10 años de mi sobrina fueron lo más! Hermosos arreglos florales que llenaron de color y alegría un día tan especial.',
  },
  {
    nombre: 'Clara D.',
    producto: 'Plantas',
    cita: 'Las plantas son preciosas, y la atención desde el pedido hasta los consejos para sus cuidados es destacable.',
  },
  {
    nombre: 'María José P.',
    producto: 'Flores y plantas',
    cita: 'Hermosas flores y plantas. Las chicas son 10, súper atentas y amorosas. Ya encargué mis próximas plantas.',
  },
  {
    nombre: 'Cata S.',
    producto: 'Ramos',
    cita: 'Hermosos ramos personalizados, súper atentas a los detalles.',
  },
  {
    nombre: 'Alejandro O.',
    producto: 'Plantas',
    cita: 'Excelente atención, hermosa la calidad y el cuidado de las plantas. Súper recomendado.',
  },
  {
    nombre: 'Nélida P.',
    producto: 'Plantas',
    cita: 'Son hermosas, las plantas son recomendables. Muy buena la atención.',
  },
  {
    nombre: 'Agostina B.',
    producto: 'Ramo personalizado',
    cita: 'Encargué un ramo personalizado, la atención fue bárbara. Mariela me asesoró y asistió no solo con la elección sino con el buen mantenimiento. Lo recibí en perfectas condiciones. Uso y recomiendo, muchas gracias 💐🌺🌻',
  },
  {
    nombre: 'Yamila A.',
    producto: 'Ramos',
    cita: 'Hermoso lugar! Resuelven rápido y hacen unos ramos super lindos, se nota que le ponen mucho amor. Sin duda los volvería a elegir!',
  },
  {
    // En Google el texto sigue; completar si se consigue entero.
    nombre: 'Agostina S.',
    producto: 'Orquídea',
    cita: 'Hermosa experiencia! ❤️ Pude hacerle llegar una orquídea a mi mamá para el Día de la Madre a pesar de estar lejos.',
  },
  {
    // Pendiente de confirmar si se muestra: es de la familia.
    nombre: 'Osvaldo I.',
    producto: 'Ramos',
    cita: 'La verdad hermoso ramo, nos gustó mucho. Serán recomendados... Saludos!!!!',
    oculta: true,
  },
  {
    nombre: 'Ignacio M.',
    producto: 'Casamiento',
    cita: 'Encargué flores para los centros de mesa de mi casamiento. Todo excelente, las flores super frescas, presentaciones hermosas y una atención de diez. Muy recomendable por su asesoramiento y buena predisposición.',
  },
  {
    nombre: 'Hernán L.',
    producto: 'Flores',
    cita: 'Flores frescas con una presentación hermosa! Cuidan los detalles al máximo y a muy buenos precios! Muchas gracias!',
  },
  {
    // En Google el texto sigue; completar si se consigue entero.
    nombre: 'Giuliana G.',
    producto: 'Plantas y ramos',
    cita: 'Las plantas y los ramos son preciosos, muy buen gusto! Atención 10/10 🙌',
  },
  {
    nombre: 'Waly P.',
    producto: 'Regalo',
    cita: 'Excelente producto terminado. Se nota el amor y dedicación que le ponen a lo que hacen. Es un obsequio ya listo para regalar. Super recomendable',
  },
  {
    nombre: 'Andrea V.',
    producto: 'Flores',
    cita: 'La atención y los productos muy buenos',
  },
  {
    nombre: 'Mariel F.',
    producto: 'Eventos',
    cita: 'Los arreglos florales estuvieron divinos!!!! Fueron gran parte del look especial de casa para el festejo del civil de mi hijo. Las volvería a contratar una y mil veces más! Super!!!!!',
  },
  {
    nombre: 'Macarena L.',
    producto: 'Flores',
    cita: 'Excelente atención! Hermosas las flores y duran un montón! Gracias!',
  },
  {
    nombre: 'Esteban P.',
    producto: 'Lirios y ramo',
    cita: '¡Súper recomendados! Compré dos lirios y un ramo para el Día de la Madre y la verdad es que quedaron encantadas. Las flores frescas y armadas con mucho amor y delicadeza. Sin duda les volveré a comprar.',
  },
  {
    nombre: 'Luciana A.',
    producto: 'Ramos',
    cita: 'Me encantó todo lo que compré. Los ramos tienen un amor y dedicación impresionantes. Seguiré comprando siempre!',
  },
];

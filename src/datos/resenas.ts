/**
 * Opiniones del Perfil de Empresa en Google, copiadas a mano (sin widgets ni
 * API, para no sumar scripts de terceros). Se muestran en el carrusel de la
 * home en este orden. Las citas pueden ir recortadas y con la ortografía
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
}

export const RESUMEN_GOOGLE = {
  promedio: '5,0',
  cantidad: 12,
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
];

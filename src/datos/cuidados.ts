/**
 * Pautas de cuidado por variedad, pensadas para leerse en el celular apenas
 * se recibe la planta (el QR de la etiqueta apunta acá).
 *
 * Criterio: cuatro datos y nada más. Luz, riego, dónde ponerla y el error que
 * la gente comete más seguido con esa planta en particular. Un texto largo en
 * ese momento no se lee.
 *
 * Una ficha por variedad, no por producto: la lavanda chica y la grande son la
 * misma planta y se cuidan igual, así que comparten página. `productos` lista
 * los slugs del catálogo que cubre cada ficha, y de ahí salen la foto y el
 * precio sin duplicar nada.
 */

export interface Cuidado {
  /** Nombre de la variedad, que puede diferir del nombre comercial. */
  nombre: string;
  /** Las fichas son de plantas salvo que se indique otra cosa. */
  tipo?: 'planta' | 'ramo';
  /** Slugs del catálogo que cubre esta ficha. */
  productos: string[];
  /** Una línea que ubique la planta antes de los detalles. */
  resumen: string;
  luz: string;
  riego: string;
  ubicacion: string;
  /** El dato que cambia el resultado: lo que casi todos hacen mal. */
  dato: string;
}

export const CUIDADOS: Record<string, Cuidado> = {
  // Sin productos: aplica a todos los ramos, y un "Ver cuidados" en cada fila
  // del catálogo de ramos repetiría el mismo enlace cinco veces.
  'ramos-de-flores': {
    nombre: 'Ramos de flores',
    tipo: 'ramo',
    productos: [],
    resumen: 'Flores de estación, recién cortadas. Con unos cuidados simples duran bastante más.',
    luz: 'Luz natural, pero nunca sol directo.',
    riego: 'Cambiá el agua cada dos días y lavá el florero. Cada vez, recortá un centímetro de los tallos en diagonal.',
    ubicacion: 'Lejos de estufas, del aire acondicionado y de la fruta, que suelta un gas que marchita las flores.',
    dato: 'Sacá las hojas que queden bajo el agua: se pudren, enturbian el agua y acortan la vida del ramo.',
  },
  lavanda: {
    nombre: 'Lavanda',
    productos: ['lavanda-chica', 'lavanda-grande'],
    resumen: 'Aromática, rústica y de sol. Podala después de la floración y dura años.',
    luz: 'Pleno sol, al menos seis horas directas por día.',
    riego: 'Poco. Regá recién cuando la tierra esté seca al tacto.',
    ubicacion: 'Exterior, en maceta con buen drenaje. Balcón, patio o jardín.',
    dato: 'El exceso de agua la mata mucho más rápido que la sequía. Si dudás, no riegues.',
  },
  'jazmin-chino': {
    nombre: 'Jazmín chino',
    productos: ['jazmin-chino'],
    resumen: 'Trepadora de hoja perenne y flor muy perfumada en primavera.',
    luz: 'Sol directo o media sombra.',
    riego: 'Regular en verano, bastante más espaciado en invierno.',
    ubicacion: 'Exterior. Dale una reja, un tutor o una pared para agarrarse.',
    dato: 'Podala apenas termina de florecer: si la podás después, cortás los brotes del año que viene.',
  },
  'santa-rita': {
    nombre: 'Santa Rita',
    productos: ['santa-rita'],
    resumen: 'Explosión de color en verano. Es de las más resistentes que hay.',
    luz: 'Pleno sol. Cuanto más, mejor.',
    riego: 'Poco. Florece más cuando pasa algo de sed.',
    ubicacion: 'Exterior, protegida de los vientos fuertes.',
    dato: 'Si le das mucha agua y abono, te hace hojas en vez de flores.',
  },
  'bambu-de-la-suerte': {
    nombre: 'Bambú de la suerte',
    productos: ['bambu-de-la-suerte'],
    resumen: 'No es un bambú: es una dracena. Vive en agua o en tierra.',
    luz: 'Luz indirecta. El sol directo le quema las hojas.',
    riego: 'En agua, cambiala cada quince días. En tierra, mantenela húmeda.',
    ubicacion: 'Interior. Anda bien en escritorios y ambientes con poca luz.',
    dato: 'Usá agua sin cloro: dejá reposar la de la canilla 24 horas antes de usarla.',
  },
  'palo-de-agua': {
    nombre: 'Palo de agua',
    productos: ['palo-de-agua'],
    resumen: 'Clásica de interior, de las que más perdonan el olvido.',
    luz: 'Luz indirecta abundante, aunque tolera ambientes poco iluminados.',
    riego: 'Moderado. Dejá secar los primeros centímetros de tierra.',
    ubicacion: 'Interior, lejos de estufas y del aire acondicionado.',
    dato: 'Puntas marrones casi siempre significan cloro en el agua o aire muy seco.',
  },
  pandurata: {
    nombre: 'Pandurata',
    productos: ['pandurata'],
    resumen: 'Hojas grandes y escultóricas. Exigente, pero vale la pena.',
    luz: 'Mucha luz indirecta, cerca de una ventana.',
    riego: 'Cuando los primeros tres centímetros de tierra estén secos.',
    ubicacion: 'Interior. Elegí un lugar bueno y dejala ahí.',
    dato: 'Odia los cambios. Si la movés de lugar, es probable que tire algunas hojas.',
  },
  lilium: {
    nombre: 'Lilium',
    productos: ['lilium'],
    resumen: 'Florece de un bulbo y vuelve cada año si lo cuidás bien.',
    luz: 'Sol de mañana y media sombra a la tarde.',
    riego: 'Mantené la tierra húmeda, sin llegar a encharcarla.',
    ubicacion: 'Interior o exterior, mientras tenga buena luz.',
    dato: 'Cuando termina de florecer, cortá la flor pero dejá las hojas: son las que alimentan el bulbo.',
  },
  'palmera-areca': {
    nombre: 'Palmera areca',
    productos: ['palmera-areca'],
    resumen: 'Palmera de interior, liviana y de crecimiento parejo.',
    luz: 'Luz indirecta. El sol directo le amarillea las hojas.',
    riego: 'Regular. Tierra apenas húmeda, nunca encharcada.',
    ubicacion: 'Interior luminoso. Agradece que le pulverices las hojas.',
    dato: 'Si el ambiente es seco le salen puntas marrones. Un plato con piedras y agua debajo ayuda.',
  },
  santuario: {
    nombre: 'Santuario',
    productos: ['santuario'],
    resumen: 'Floración roja que dura semanas enteras.',
    luz: 'Mucha luz indirecta.',
    riego: 'Cuando la capa superior de la tierra esté seca.',
    ubicacion: 'Interior con algo de humedad. El baño le viene bien.',
    dato: 'Lo rojo no es la flor sino una hoja modificada. Por eso dura tanto.',
  },
  'stromanthe-tricolor': {
    nombre: 'Stromanthe tricolor',
    productos: ['stromanthe-tricolor'],
    resumen: 'Hojas en rosa, verde y crema. De las más decorativas.',
    luz: 'Luz indirecta filtrada. Nada de sol directo.',
    riego: 'Tierra siempre húmeda, sin excesos.',
    ubicacion: 'Interior con buena humedad.',
    dato: 'A la noche levanta las hojas y las vuelve a abrir de día. Es normal: está sana.',
  },
  'monstera-costilla-de-adan': {
    nombre: 'Monstera / Costilla de Adán',
    productos: ['monstera-costilla-de-adan'],
    resumen: 'La trepadora de interior por excelencia. Crece rápido y perdona.',
    luz: 'Luz indirecta. Tolera sombra, pero ahí crece más lento.',
    riego: 'Cuando los primeros centímetros estén secos. Mejor de menos que de más.',
    ubicacion: 'Interior. Con un tutor trepa y saca hojas bastante más grandes.',
    dato: 'Los agujeros de las hojas llegan con la madurez. Si no los tiene, le falta luz o tiempo.',
  },
  pino: {
    nombre: 'Pino limón',
    productos: ['pino'],
    resumen: 'Conífera de follaje dorado que perfuma a limón cuando la rozás.',
    luz: 'Sol directo. Con poca luz pierde el color dorado y se pone verde.',
    riego: 'Regular. Que la tierra no se seque del todo, sobre todo en verano.',
    ubicacion: 'Exterior: balcón, patio o jardín. Adentro dura poco.',
    dato: 'Si una rama se seca, no rebrota. Una sola sequía fuerte le deja manchas marrones para siempre.',
  },
  'cala-de-color': {
    nombre: 'Cala de color',
    productos: ['cala-de-color'],
    resumen: 'Flor elegante que nace de un rizoma y vuelve a florecer cada primavera.',
    luz: 'Mucha luz, con sol suave de mañana.',
    riego: 'Tierra húmeda mientras florece. Cuando se secan las hojas, cortá el riego.',
    ubicacion: 'Interior luminoso o exterior protegido del sol fuerte de la tarde.',
    dato: 'Después de florecer necesita descansar: dejá que las hojas se sequen solas y volvé a regar en primavera.',
  },
  orquidea: {
    nombre: 'Orquídea',
    productos: ['orquidea'],
    resumen: 'Phalaenopsis: la orquídea más agradecida para tener en casa. Florece durante meses.',
    luz: 'Mucha luz indirecta. El sol directo le quema las hojas.',
    riego: 'Una vez por semana: sumergí la maceta en agua diez minutos y dejala escurrir bien.',
    ubicacion: 'Interior, cerca de una ventana, sin corrientes de aire.',
    dato: 'Las raíces verdes están bien regadas; las plateadas piden agua. Nunca la dejes con agua en el cachepot.',
  },
  hortensia: {
    nombre: 'Hortensia',
    productos: ['hortensia'],
    resumen: 'Flores enormes de primavera a otoño. Le gusta el agua más que a ninguna.',
    luz: 'Sol de mañana y sombra a la tarde.',
    riego: 'Abundante. La tierra tiene que estar siempre húmeda.',
    ubicacion: 'Exterior o interior muy luminoso, protegida del sol fuerte.',
    dato: 'Si se desmaya al mediodía es sed: un buen riego y en un rato se levanta.',
  },
  helecho: {
    nombre: 'Helecho',
    productos: ['helecho'],
    resumen: 'Verde, frondoso y fácil, siempre que no le falte humedad.',
    luz: 'Luz indirecta o media sombra. Nada de sol directo.',
    riego: 'Tierra siempre húmeda, sin encharcar.',
    ubicacion: 'Interior luminoso con humedad. El baño o la cocina le vienen bien.',
    dato: 'Las hojas secas y crujientes son aire seco: pulverizalo seguido y alejalo de estufas.',
  },
};

/** Ficha de cuidados que cubre a un producto del catálogo, si existe. */
export function variedadDe(slugProducto: string): string | undefined {
  return Object.keys(CUIDADOS).find((v) => CUIDADOS[v]!.productos.includes(slugProducto));
}

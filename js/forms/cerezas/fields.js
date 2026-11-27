// Filas de cada tabla del Informecampo Cerezas.
// v1.1: Daño insecto y Pitting pasan a condición (pedido Merex) y se agregan
// los parámetros de la tabla de tolerancias "Bulk directo de huerto".

export const COLORES = [
  { id: 'faltaColor', l: 'Falta de color' },
  { id: 'rojoClaro', l: 'Rojo claro' },
  { id: 'rojo', l: 'Rojo' },
  { id: 'rojoCaoba', l: 'Rojo caoba' },
  { id: 'caobaOscuro', l: 'Caoba oscuro' },
  { id: 'negro', l: 'Negro' }
];

export const CALIBRES = [
  { id: 'L', l: 'L', hint: '22-24 mm' },
  { id: 'XL', l: 'XL', hint: '24-26 mm' },
  { id: 'J', l: 'J', hint: '26-28 mm' },
  { id: '2J', l: '2J', hint: '28-30 mm' },
  { id: '3J', l: '3J', hint: '30-32 mm' },
  { id: '4J', l: '4J', hint: '>32 mm' }
];

export const CONDICION = [
  { id: 'pudricion', l: 'Pudrición' },
  { id: 'pudricionSeca', l: 'Pudrición seca' },
  { id: 'pediceloDesh', l: 'Pedicelo deshidratado' },
  { id: 'frutaDesh', l: 'Fruta deshidratada' },
  { id: 'frutaBlanda', l: 'Fruta blanda' },
  { id: 'machucon', l: 'Machucón' },
  { id: 'machuconHombros', l: 'Machucón de hombros' },
  { id: 'golpeSol', l: 'Golpe de sol' },
  { id: 'partiduraLateral', l: 'Partidura lateral' },
  { id: 'partiduraApical', l: 'Partidura apical' },
  { id: 'medialuna', l: 'Medialuna' },
  { id: 'partiduraAgua', l: 'Partidura por agua' },
  { id: 'heridaAbierta', l: 'Herida abierta' },
  { id: 'danoInsecto', l: 'Daño insecto' },
  { id: 'pitting', l: 'Pitting' },
  { id: 'desgarroPedicelar', l: 'Desgarro pedicelar' },
  { id: 'exudacion', l: 'Exudación / colapsado' },
  { id: 'sobreMadura', l: 'Fruta sobre madura' },
  { id: 'otros', l: 'Otros', otros: true }
];

export const CALIDAD = [
  { id: 'deformes', l: 'Frutos deformes' },
  { id: 'dobles', l: 'Frutos dobles' },
  { id: 'heridaCicatrizada', l: 'Herida cicatrizada' },
  { id: 'manchasDoradas', l: 'Manchas doradas' },
  { id: 'russet', l: 'Russet' },
  { id: 'danoSol', l: 'Daño por sol' },
  { id: 'faltaColor', l: 'Falta color' },
  { id: 'sinPedicelo', l: 'Frutos s/ pedicelo' },
  { id: 'tierra', l: 'Polvo / tierra' },
  { id: 'contaminacion', l: 'Contaminación / residuos / elem. extraños' },
  { id: 'insectos', l: 'Insectos' },
  { id: 'preCalibre', l: 'Pre-calibre' },
  { id: 'restoFloral', l: 'Resto floral' },
  { id: 'faltaPruina', l: 'Falta de pruina (bloom)' },
  { id: 'sutura', l: 'Sutura' },
  { id: 'otros', l: 'Otros', otros: true }
];

// Se mide aparte (no suma al total de condición, igual que en la tabla Merex)
export const OXIDADA = [
  { id: 'pulpaOxidada', l: 'Frutos pulpa oxidada' }
];

export const FIRMPRO = [
  { id: 'sensible', l: 'Sensible' },
  { id: 'firme', l: 'Firme' },
  { id: 'muyFirme', l: 'Muy firme' }
];

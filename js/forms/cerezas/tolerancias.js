// Tolerancias "Bulk directo de huerto" (tabla entregada por Merex, nov-2026).
//
// Cada parámetro toma su valor (%) sumando una o más filas del formulario (`from`).
// Clasificación, con el valor redondeado a 1 decimal (igual que se muestra):
//   valor <= a  -> nivel 0 (A / 1, verde)
//   valor <= b  -> nivel 1 (B / 2, amarillo)
//   valor >  b  -> nivel 2 (C / 3, rojo)
// pres: true   -> "Ausente / Ausente / Presente": cualquier valor > 0 es rojo.
// min: n       -> "> n / – / < n" (Brix): bajo n es rojo.
//
// Para corregir un rango o una equivalencia, basta con editar este archivo.

export const NIVELES = {
  cond: ['A', 'B', 'C'],
  calid: ['1', '2', '3']
};

export const TOLERANCIAS = {
  cond: [
    { id: 'pudricion', l: 'Pudrición blanca / micelio', from: ['cond.pudricion', 'cond.pudricionSeca'], pres: true },
    { id: 'partidura', l: 'Partidura', from: ['cond.partiduraLateral', 'cond.partiduraApical', 'cond.medialuna', 'cond.partiduraAgua'], a: 0, b: 3, txt: ['0', '0,1 – 3', '> 3'] },
    { id: 'blanda', l: 'Fruta blanda', from: ['cond.frutaBlanda'], a: 2.9, b: 6, txt: ['0 – 2,9', '3 – 6', '> 6'] },
    { id: 'machucon', l: 'Machucón', from: ['cond.machucon', 'cond.machuconHombros'], a: 2.9, b: 4, txt: ['0 – 2,9', '3 – 4', '> 4'] },
    { id: 'herida', l: 'Herida abierta', from: ['cond.heridaAbierta'], pres: true },
    { id: 'desgarro', l: 'Desgarro pedicelar', from: ['cond.desgarroPedicelar'], a: 2.9, b: 5, txt: ['0 – 2,9', '3 – 5', '> 5'] },
    { id: 'deshidratacion', l: 'Deshidratación', from: ['cond.frutaDesh'], a: 2.9, b: 6, txt: ['0 – 2,9', '3 – 6', '> 6'] },
    { id: 'exudacion', l: 'Exudación / colapsado', from: ['cond.exudacion'], pres: true },
    { id: 'sobreMadura', l: 'Fruta sobre madura', from: ['cond.sobreMadura'], a: 0.9, b: 3, txt: ['0 – 0,9', '1 – 3', '> 3'] },
    { id: 'total', l: 'TOTAL CONDICIÓN', from: ['cond.total'], a: 4.9, b: 10, txt: ['0 – 4,9', '5 – 10', '> 10'], total: true },
    { id: 'oxidada', l: 'Frutos pulpa oxidada', from: ['oxid.pulpaOxidada'], a: 30, b: 50, txt: ['0 – 30', '30,1 – 50', '> 50'] }
  ],
  calid: [
    { id: 'polvo', l: 'Polvo / tierra', from: ['calid.tierra'], pres: true },
    { id: 'contaminacion', l: 'Contaminación / residuos / elem. extraños', from: ['calid.contaminacion'], pres: true },
    { id: 'insectos', l: 'Insectos', from: ['calid.insectos'], pres: true },
    { id: 'rojos', l: 'Frutos rojos (color rojo claro)', from: ['color.rojoClaro'], a: 2.9, b: 8, txt: ['0 – 2,9', '3 – 8', '> 8'] },
    { id: 'verdes', l: 'Frutos verdes (falta de color)', from: ['color.faltaColor'], a: 0.9, b: 4, txt: ['0 – 0,9', '1 – 4', '> 4'] },
    { id: 'russet', l: 'Russet y cicatrices', from: ['calid.russet', 'calid.heridaCicatrizada'], a: 3.9, b: 8, txt: ['0 – 3,9', '4 – 8', '> 8'] },
    { id: 'pedicelo', l: 'Pedicelo (frutos s/ pedicelo)', from: ['calid.sinPedicelo'], a: 3.9, b: 8, txt: ['0 – 3,9', '4 – 8', '> 8'] },
    { id: 'preCalibre', l: 'Pre-calibre', from: ['calid.preCalibre'], a: 1.9, b: 5, txt: ['0 – 1,9', '2 – 5', '> 5'] },
    { id: 'restoFloral', l: 'Resto floral', from: ['calid.restoFloral'], a: 3.9, b: 11, txt: ['0 – 3,9', '4 – 11', '> 11'] },
    { id: 'brix', l: 'Grados Brix (promedio)', from: ['brix'], min: 8, unit: '°Bx', txt: ['> 8 °Bx', '', '< 8 °Bx'] },
    { id: 'pruina', l: 'Falta de pruina (bloom)', from: ['calid.faltaPruina'], a: 8.9, b: 15, txt: ['0 – 8,9', '9 – 15', '> 15'] },
    { id: 'total', l: 'TOTAL CALIDAD', from: ['calid.total'], a: 6.9, b: 12, txt: ['0 – 6,9', '7 – 12', '> 12'], total: true }
  ]
};

const PRES_TXT = ['Ausente', 'Ausente', 'Presente'];
export const rangos = (p) => (p.pres ? PRES_TXT : p.txt);

const r1 = (v) => Math.round(v * 10) / 10;

export function nivel(p, v) {
  if (v === null || v === undefined) return null;
  const x = r1(v);
  if (p.pres) return x > 0 ? 2 : 0;
  if (p.min !== undefined) return x < p.min ? 2 : 0;
  if (x <= p.a) return 0;
  if (x <= p.b) return 1;
  return 2;
}

/** ¿La tabla `k` tiene datos con los que se pueda calcular %? (vacío = 0 en ese caso) */
function evaluable(meta, k) {
  const m = meta.dist[k];
  return !!(m && m.any && (m.modo === 'pct' || m.base > 0));
}

/**
 * Evalúa todos los parámetros. Devuelve, por grupo (cond / calid):
 *  { items: [{ p, v, n }], peor: { n, p } | null, total: { v, n } }
 */
export function evaluar(d, calc, meta) {
  const out = {};
  for (const g of Object.keys(TOLERANCIAS)) {
    const items = TOLERANCIAS[g].map((p) => {
      let v = null;
      if (p.from[0] === 'brix') {
        const vals = [...(calc['brix.dark.vals'] || []), ...(calc['brix.light.vals'] || [])];
        v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      } else {
        const k = p.from[0].split('.')[0];
        if (evaluable(meta, k)) {
          v = p.from.reduce((acc, key) => acc + (calc[key.endsWith('.total') ? key : `${key}.pct`] ?? 0), 0);
        }
      }
      return { p, v, n: nivel(p, v) };
    });
    let peor = null;
    for (const it of items) if (it.n !== null && (!peor || it.n > peor.n)) peor = it;
    const tot = items.find((it) => it.p.total);
    out[g] = { items, peor, total: tot };
  }
  return out;
}

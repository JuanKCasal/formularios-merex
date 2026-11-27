// Formulario "Informecampo Cerezas" (formato impreso Merex)
import { todayISO, nowHM } from '../../util.js';
import { compute, renderSummary, strip, decorate } from './compute.js';
import { generatePdf } from './pdf.js';
import { COLORES, CALIBRES, CONDICION, CALIDAD, OXIDADA, FIRMPRO } from './fields.js';
import { num } from '../../util.js';

// Versión de los datos del informe (sube cuando cambian las filas)
const DATA_V = 2;

const form = {
  id: 'cerezas',
  title: 'Informecampo Cerezas',
  description: 'Control de recepción de cereza: color, calibres, defectos, firmeza y Brix.',

  // Valores fijos del documento Merex. PENDIENTE: completar cuando estén disponibles.
  codigo: '',
  revision: '',

  // Sugerencias iniciales (se suman los valores que se vayan escribiendo)
  listas: {
    variedad: ['Bing', 'Kordia', 'Lapins', 'Rainier', 'Regina', 'Royal Dawn', 'Santina', 'Skeena', 'Sweetheart']
  },

  newData(settings) {
    return {
      fecha: todayISO(),
      hora: nowHM(),
      unidad: 'gr',
      'brix.dark': ['', '', ''],
      'brix.light': ['', '', ''],
      inspector: settings.inspector || '',
      fotos: [],
      _v: DATA_V
    };
  },

  /** Adapta informes guardados con versiones anteriores. Devuelve true si cambió algo. */
  migrate(d) {
    if ((d._v || 1) >= DATA_V) return false;
    // v1 -> v2: Daño insecto y Pitting pasan de calidad a condición
    const muestra = num(d.muestra);
    const modoDe = (k) => d[`${k}.modo`] || 'cant';
    for (const id of ['danoInsecto', 'pitting']) {
      const cant = d[`calid.${id}.cant`];
      const pct = d[`calid.${id}.pct`];
      const destPct = modoDe('cond') === 'pct';
      const origPct = modoDe('calid') === 'pct';
      if (destPct === origPct) {
        if (cant !== undefined) d[`cond.${id}.cant`] = cant;
        if (pct !== undefined) d[`cond.${id}.pct`] = pct;
      } else if (destPct) {
        const c = num(cant);
        if (pct !== undefined && pct !== '') d[`cond.${id}.pct`] = pct;
        else if (c !== null && muestra > 0) d[`cond.${id}.pct`] = String(Math.round((c / muestra) * 1000) / 10).replace('.', ',');
      } else {
        const q = num(pct);
        if (cant !== undefined && cant !== '') d[`cond.${id}.cant`] = cant;
        else if (q !== null && muestra > 0) d[`cond.${id}.cant`] = String(Math.round(q * muestra) / 100).replace('.', ',');
      }
      delete d[`calid.${id}.cant`];
      delete d[`calid.${id}.pct`];
    }
    if (!Array.isArray(d.fotos)) d.fotos = [];
    d._v = DATA_V;
    return true;
  },

  recordTitle: (d) => d.productor || 'Sin productor',
  recordSubtitle: (d) => [d.variedad, d.fecha ? d.fecha.split('-').reverse().join('-') : '', d.lote ? `Lote ${d.lote}` : ''].filter(Boolean).join(' · '),

  sections: [
    {
      id: 'recepcion',
      title: 'Recepción',
      items: [
        { type: 'text', k: 'productor', label: 'Productor', list: 'productor' },
        { type: 'text', k: 'variedad', label: 'Variedad', list: 'variedad' },
        { type: 'date', k: 'fecha', label: 'Fecha recepción', half: true },
        { type: 'time', k: 'hora', label: 'Hora recepción', half: true },
        { type: 'text', k: 'lote', label: 'N° Lote', list: 'lote', half: true },
        { type: 'number', k: 'bandejas', label: 'N° Bandejas', int: true, half: true },
        { type: 'number', k: 'pesoNeto', label: 'Peso neto', unit: 'kg', half: true },
        { type: 'seg', k: 'unidad', label: 'Unidad de la muestra', options: [{ v: 'gr', l: 'Gramos' }, { v: 'frutos', l: 'N° frutos' }], help: 'Se usa en toda la hoja: color, calibres y defectos.' },
        { type: 'number', k: 'muestra', label: 'Muestra', unitFrom: 'unidad', help: 'Los porcentajes se calculan sobre este valor.' }
      ]
    },
    {
      id: 'temperatura',
      title: 'Temperatura y envase',
      items: [
        { type: 'number', k: 'tPulpa', label: 'T° pulpa', unit: '°C', third: true },
        { type: 'number', k: 'tCamion', label: 'T° camión', unit: '°C', third: true },
        { type: 'number', k: 'tPostHD', label: 'T° post HD', unit: '°C', third: true },
        { type: 'heading', label: 'Envase' },
        { type: 'check3', k: 'estiba', label: 'Estiba' },
        { type: 'check3', k: 'llenado', label: 'Llenado' },
        { type: 'check3', k: 'limpieza', label: 'Limpieza envase' }
      ]
    },
    {
      id: 'color',
      title: 'Color',
      items: [
        { type: 'heading', label: 'Distribución de color' },
        {
          type: 'dist', k: 'color', layout: 'cards', rows: COLORES,
          extra: [{ id: 'ss', l: 'SS color predom.' }, { id: 'firmeza', l: 'Firmeza prom. (UD)' }]
        }
      ]
    },
    {
      id: 'calibres',
      title: 'Calibres',
      items: [
        { type: 'heading', label: 'Distribución de calibres' },
        { type: 'dist', k: 'calibre', colLabel: 'Calibre', rows: CALIBRES }
      ]
    },
    {
      id: 'condicion',
      title: 'Defectos de condición',
      items: [
        { type: 'dist', k: 'cond', colLabel: 'Defecto', rows: CONDICION, totalLabel: 'Total condición' },
        { type: 'heading', label: 'Pulpa oxidada', help: 'Se evalúa aparte: no suma al total de condición.' },
        { type: 'dist', k: 'oxid', colLabel: 'Frutos', rows: OXIDADA, noTotal: true },
        { type: 'slot', id: 'tol-cond' }
      ]
    },
    {
      id: 'calidad',
      title: 'Defectos de calidad',
      items: [
        { type: 'dist', k: 'calid', colLabel: 'Defecto', rows: CALIDAD, totalLabel: 'Total calidad' },
        { type: 'number', k: 'racimo', label: 'Presencia racimo', unit: '%', half: true },
        { type: 'text', k: 'hoja', label: 'Presencia de hoja', half: true },
        { type: 'slot', id: 'tol-calid' }
      ]
    },
    {
      id: 'firmeza',
      title: 'Firmeza y Brix',
      items: [
        { type: 'counts', k: 'firmpro', label: 'Firmeza FirmPro', rows: FIRMPRO },
        { type: 'heading', label: 'Brix (°Bx)' },
        { type: 'readings', k: 'brix.dark', label: 'Dark' },
        { type: 'readings', k: 'brix.light', label: 'Light' }
      ]
    },
    {
      id: 'fotos',
      title: 'Fotos',
      items: [
        { type: 'photos', k: 'fotos', help: 'Hasta 12 fotos. Se guardan reducidas en este teléfono y salen como anexo al final del PDF.' }
      ]
    },
    {
      id: 'cierre',
      title: 'Observaciones y firma',
      items: [
        { type: 'textarea', k: 'observaciones', label: 'Observaciones', rows: 4 },
        { type: 'text', k: 'inspector', label: 'Inspector (nombre)' },
        { type: 'signature', k: 'firma', label: 'Firma del inspector' }
      ]
    },
    {
      id: 'resumen',
      title: 'Resumen y PDF',
      items: [{ type: 'summary' }]
    }
  ],

  compute,
  renderSummary,
  strip,
  decorate,
  generatePdf
};

export default form;

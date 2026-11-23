// Cálculos y avisos propios del Informecampo Cerezas
import { num, fmt, esc } from '../../util.js';
import { icon } from '../../ui.js';

const P = (v) => (v === null || v === undefined ? '–' : fmt(v, 1) + '%');

/** Completa los cálculos genéricos con los totales de la hoja y genera los avisos. */
export function compute(d, calc, meta) {
  const cond = calc['cond.total'];
  const calid = calc['calid.total'];
  const hayDefectos = cond !== null || calid !== null;
  calc.suma = hayDefectos ? (cond ?? 0) + (calid ?? 0) : null;
  calc.exportable = hayDefectos ? 100 - calc.suma : null;

  const warnings = [];
  const muestra = num(d.muestra);

  const faltan = [];
  if (!d.productor) faltan.push('productor');
  if (!d.variedad) faltan.push('variedad');
  if (!d.fecha) faltan.push('fecha');
  if (muestra === null) faltan.push('muestra');
  if (faltan.length) warnings.push({ level: 'info', section: 'recepcion', text: `Falta completar: ${faltan.join(', ')}.` });

  const usaCant = Object.values(meta.dist).some((m) => m.modo === 'cant' && m.any);
  if (usaCant && !(muestra > 0)) {
    warnings.push({ level: 'warn', section: 'recepcion', text: 'Ingresa la muestra para calcular los porcentajes.' });
  }

  const nombres = { color: 'color', calibre: 'calibres' };
  for (const k of ['color', 'calibre']) {
    const m = meta.dist[k];
    const t = calc[`${k}.total`];
    if (m && m.any && t !== null && Math.abs(t - 100) > 0.5 && (m.modo === 'pct' || muestra > 0)) {
      warnings.push({ level: 'warn', section: k === 'color' ? 'color' : 'calibres', text: `La distribución de ${nombres[k]} suma ${fmt(t, 1)}% (debería sumar 100%).` });
    }
  }

  for (const [k, sec, rows] of [['cond', 'condicion', meta.dist.cond?.f.rows || []], ['calid', 'calidad', meta.dist.calid?.f.rows || []]]) {
    for (const r of rows) {
      const p = calc[`${k}.${r.id}.pct`];
      if (p !== null && p > 100) warnings.push({ level: 'warn', section: sec, text: `${r.l}: el valor supera la muestra (${fmt(p, 1)}%).` });
    }
  }

  if (calc.suma !== null && calc.suma > 100) {
    warnings.push({ level: 'warn', section: 'condicion', text: `La suma de defectos (${fmt(calc.suma, 1)}%) supera el 100%.` });
  }

  if (!d.inspector) warnings.push({ level: 'info', section: 'cierre', text: 'Falta el nombre del inspector.' });
  if (!d.firma) warnings.push({ level: 'info', section: 'cierre', text: 'Falta la firma.' });

  return { warnings };
}

/** Totales que se ven siempre en la barra inferior. */
export function strip(calc) {
  return [
    { l: 'Condición', v: P(calc['cond.total']) },
    { l: 'Calidad', v: P(calc['calid.total']) },
    { l: 'Exportable', v: P(calc.exportable), strong: true }
  ];
}

export function renderSummary(d, calc, warnings) {
  const kpi = (l, v, cls = '') => `<div class="kpi ${cls}"><span>${l}</span><strong>${v}</strong></div>`;
  const brix = (k) => (calc[`${k}.avg`] !== null ? fmt(calc[`${k}.avg`], 1) : '–');
  const fp = (id) => P(calc[`firmpro.${id}.pct`]);

  const warnHtml = warnings.length
    ? `<ul class="warns">${warnings.map((w) => `
        <li class="${w.level}">
          <span class="wi">${w.level === 'warn' ? icon.warn : icon.doc}</span>
          <span class="wt">${esc(w.text)}</span>
          <button type="button" class="link" data-goto="${esc(w.section)}">Ir</button>
        </li>`).join('')}</ul>`
    : `<p class="ok-msg">${icon.check} Todo cuadra. El informe está listo.</p>`;

  return `
    <div class="kpis">
      ${kpi('Total condición', P(calc['cond.total']))}
      ${kpi('Total calidad', P(calc['calid.total']))}
      ${kpi('Suma total de defectos', P(calc.suma))}
      ${kpi('Estimación exportable', P(calc.exportable), 'main')}
    </div>
    <div class="kpis small">
      ${kpi('Brix Dark (prom.)', brix('brix.dark'))}
      ${kpi('Brix Light (prom.)', brix('brix.light'))}
      ${kpi('FirmPro Sensible / Firme / Muy firme', `${fp('sensible')} · ${fp('firme')} · ${fp('muyFirme')}`, 'wide')}
    </div>
    <h3 class="sub">Revisión</h3>
    ${warnHtml}
    <div class="actions">
      <button type="button" class="btn primary big" data-act="pdf">${icon.download} Descargar PDF</button>
      <button type="button" class="btn secondary big" data-act="share">${icon.share} Compartir PDF</button>
    </div>
    <p class="help center">Puedes descargar el PDF aunque haya avisos. El informe queda guardado en este teléfono.</p>`;
}

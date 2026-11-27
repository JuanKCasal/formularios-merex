// Cálculos y avisos propios del Informecampo Cerezas
import { num, fmt, esc } from '../../util.js';
import { icon } from '../../ui.js';
import { evaluar, NIVELES, rangos } from './tolerancias.js';

const LV_TXT = ['Dentro de tolerancia', 'En el límite', 'Fuera de tolerancia'];
const lvCls = (n) => (n === null || n === undefined ? 'lvx' : `lv${n}`);
const nivelTxt = (g, n) => (n === null || n === undefined ? '–' : NIVELES[g][n]);
const valTxt = (it) => (it.v === null ? '–' : it.p.unit ? `${fmt(it.v, 1)} ${it.p.unit}` : fmt(it.v, 1) + '%');

const P = (v) => (v === null || v === undefined ? '–' : fmt(v, 1) + '%');

/** Completa los cálculos genéricos con los totales de la hoja y genera los avisos. */
export function compute(d, calc, meta) {
  const cond = calc['cond.total'];
  const calid = calc['calid.total'];
  const hayDefectos = cond !== null || calid !== null;
  calc.suma = hayDefectos ? (cond ?? 0) + (calid ?? 0) : null;
  calc.exportable = hayDefectos ? 100 - calc.suma : null;
  calc.tol = evaluar(d, calc, meta);

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
  const t = calc.tol || {};
  return [
    { l: 'Condición', v: P(calc['cond.total']), cls: lvCls(t.cond?.total?.n) },
    { l: 'Calidad', v: P(calc['calid.total']), cls: lvCls(t.calid?.total?.n) },
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

  const t = calc.tol;
  const res = (g, nombre) => {
    const pe = t[g].peor;
    if (!pe) return `<div class="tol-res lvx"><span>${nombre}</span><strong>Sin datos</strong></div>`;
    const fuera = t[g].items.filter((it) => it.n > 0);
    const det = fuera.length
      ? fuera.map((it) => `<li class="${lvCls(it.n)}"><i>${nivelTxt(g, it.n)}</i> ${esc(it.p.l)}: ${valTxt(it)}</li>`).join('')
      : '<li class="lv0"><i>' + nivelTxt(g, 0) + '</i> Todos los parámetros evaluados están en tolerancia</li>';
    return `<div class="tol-res ${lvCls(pe.n)}"><span>${nombre} — peor parámetro</span><strong>${nivelTxt(g, pe.n)} · ${LV_TXT[pe.n]}</strong><ul>${det}</ul></div>`;
  };
  return `
    <div class="kpis">
      ${kpi('Total condición', P(calc['cond.total']), lvCls(t.cond.total.n))}
      ${kpi('Total calidad', P(calc['calid.total']), lvCls(t.calid.total.n))}
      ${kpi('Suma total de defectos', P(calc.suma))}
      ${kpi('Estimación exportable', P(calc.exportable), 'main')}
    </div>
    <div class="kpis small">
      ${kpi('Brix Dark (prom.)', brix('brix.dark'))}
      ${kpi('Brix Light (prom.)', brix('brix.light'))}
      ${kpi('FirmPro Sensible / Firme / Muy firme', `${fp('sensible')} · ${fp('firme')} · ${fp('muyFirme')}`, 'wide')}
    </div>
    <h3 class="sub">Tolerancias (Bulk directo de huerto)</h3>
    <div class="tol-resumen">${res('cond', 'Condición')}${res('calid', 'Calidad')}</div>
    <h3 class="sub">Revisión</h3>
    ${warnHtml}
    <div class="actions">
      <button type="button" class="btn primary big" data-act="pdf">${icon.download} Descargar PDF</button>
      <button type="button" class="btn secondary big" data-act="share">${icon.share} Compartir PDF</button>
    </div>
    <p class="help center">Puedes descargar el PDF aunque haya avisos. El informe queda guardado en este teléfono.</p>`;
}

function tolCard(g, titulo, ev) {
  const rows = ev.items.map((it) => {
    const r = rangos(it.p);
    const rango = NIVELES[g].map((n, i) => (r[i] ? `${n} ${r[i]}` : '')).filter(Boolean).join(' · ');
    return `
      <div class="tol-row ${lvCls(it.n)} ${it.p.total ? 'tot' : ''}">
        <span class="tl">${esc(it.p.l)}<small>${esc(rango)}</small></span>
        <span class="tv">${valTxt(it)}</span>
        <span class="tb">${nivelTxt(g, it.n)}</span>
      </div>`;
  }).join('');
  return `<div class="tolcard"><h3>Tolerancias — ${titulo}</h3><p class="help">Bulk directo de huerto. Verde: dentro · Amarillo: en el límite · Rojo: fuera.</p>${rows}</div>`;
}

/** Pinta en pantalla el semáforo de tolerancias (filas, totales y tarjetas). */
export function decorate(root, d, calc) {
  const t = calc.tol;
  if (!t) return;
  root.querySelectorAll('[data-row].lv0, [data-row].lv1, [data-row].lv2').forEach((el) => el.classList.remove('lv0', 'lv1', 'lv2'));
  for (const g of Object.keys(t)) {
    for (const it of t[g].items) {
      if (it.p.total || it.n === null || it.p.from[0] === 'brix') continue;
      for (const key of it.p.from) {
        const el = root.querySelector(`[data-row="${CSS.escape(key)}"]`);
        if (el && (calc[`${key}.pct`] ?? 0) > 0) el.classList.add(`lv${it.n}`);
      }
    }
    const tot = root.querySelector(`[data-total="${g}"]`);
    if (tot) {
      tot.classList.remove('lv0', 'lv1', 'lv2', 'lvx');
      tot.classList.add(lvCls(t[g].total.n));
      const b = tot.querySelector('[data-badge]');
      if (b) b.textContent = t[g].total.n === null ? '' : NIVELES[g][t[g].total.n];
    }
    const slot = root.querySelector(`[data-slot="tol-${g}"]`);
    if (slot && slot.offsetParent !== null) slot.innerHTML = tolCard(g, g === 'cond' ? 'Condición' : 'Calidad', t[g]);
  }
}

// Motor de formularios: dibuja las secciones a partir del esquema, enlaza los
// campos con los datos y hace los cálculos genéricos (porcentajes, promedios).
// Sirve para cualquier formulario nuevo que se agregue en js/forms/.

import { num, fmt, avg, sum, esc } from './util.js';
import { getSettings } from './storage.js';
import { icon } from './ui.js';

export const unitLabel = (u) => (u === 'frutos' ? 'n° frutos' : 'gr');

/* ---------------------------- Render ---------------------------- */

const val = (d, k) => esc(d[k] ?? '');

function wrapField(f, inner) {
  const cls = ['fld', f.half ? 'half' : '', f.third ? 'third' : ''].join(' ');
  return `<div class="${cls}"><label class="lbl" for="f-${esc(f.k)}">${esc(f.label)}</label>${inner}${f.help ? `<small class="help">${esc(f.help)}</small>` : ''}</div>`;
}

function unitSpan(f) {
  if (f.unitFrom) return `<span class="unit" data-unit="${esc(f.unitFrom)}"></span>`;
  return f.unit ? `<span class="unit">${esc(f.unit)}</span>` : '';
}

const R = {
  text(f, d) {
    const list = f.list ? ` list="dl-${esc(f.list)}" data-remember="${esc(f.list)}" autocomplete="off"` : '';
    return wrapField(f, `<input id="f-${esc(f.k)}" type="text" data-k="${esc(f.k)}" value="${val(d, f.k)}" placeholder="${esc(f.placeholder || '')}"${list} enterkeyhint="next">`);
  },
  date(f, d) {
    return wrapField(f, `<input id="f-${esc(f.k)}" type="date" data-k="${esc(f.k)}" value="${val(d, f.k)}">`);
  },
  time(f, d) {
    return wrapField(f, `<input id="f-${esc(f.k)}" type="time" data-k="${esc(f.k)}" value="${val(d, f.k)}">`);
  },
  number(f, d) {
    const mode = f.int ? 'numeric' : 'decimal';
    return wrapField(f, `<div class="inp-unit"><input id="f-${esc(f.k)}" type="text" inputmode="${mode}" data-k="${esc(f.k)}" data-num="1" value="${val(d, f.k)}" placeholder="${esc(f.placeholder || '')}" enterkeyhint="next">${unitSpan(f)}</div>`);
  },
  textarea(f, d) {
    return wrapField(f, `<textarea id="f-${esc(f.k)}" data-k="${esc(f.k)}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${val(d, f.k)}</textarea>`);
  },
  seg(f, d) {
    const btns = f.options.map((o) => `<button type="button" class="${d[f.k] === o.v ? 'on' : ''}" data-seg="${esc(f.k)}" data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('');
    return `<div class="fld ${f.half ? 'half' : ''}"><span class="lbl">${esc(f.label)}</span><div class="seg" role="group">${btns}</div>${f.help ? `<small class="help">${esc(f.help)}</small>` : ''}</div>`;
  },
  check3(f, d) {
    const opts = [{ v: 'cumple', l: 'Cumple' }, { v: 'nocumple', l: 'No cumple' }];
    const btns = opts.map((o) => `<button type="button" class="${d[f.k] === o.v ? 'on ' + o.v : ''}" data-seg="${esc(f.k)}" data-v="${o.v}" data-toggle="1">${o.l}</button>`).join('');
    return `<div class="check3"><span class="lbl">${esc(f.label)}</span><div class="seg sm">${btns}</div></div>`;
  },
  heading(f) {
    return `<h3 class="sub">${esc(f.label)}</h3>${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}`;
  },
  note(f) {
    return `<p class="note">${f.html}</p>`;
  },
  dist(f, d) {
    const k = f.k;
    const modo = d[`${k}.modo`] || 'cant';
    const cards = f.layout === 'cards';
    const unitTag = `<span data-unit="${esc(f.base || 'muestra')}"></span>`;
    const head = `
      <div class="dist-head">
        <span class="lbl">Ingresar en</span>
        <div class="seg sm">
          <button type="button" class="${modo === 'cant' ? 'on' : ''}" data-seg="${k}.modo" data-v="cant">Cantidad</button>
          <button type="button" class="${modo === 'pct' ? 'on' : ''}" data-seg="${k}.modo" data-v="pct">%</button>
        </div>
      </div>`;

    const rowLabel = (r) => {
      if (r.otros) {
        return `<input class="otros-name" type="text" data-k="${k}.${r.id}.nombre" value="${val(d, `${k}.${r.id}.nombre`)}" placeholder="${esc(r.l)} (especificar)">`;
      }
      return `<span class="dl">${esc(r.l)}${r.hint ? ` <small>${esc(r.hint)}</small>` : ''}</span>`;
    };

    const cantIn = (r) => `<input class="c-cant" type="text" inputmode="decimal" data-k="${k}.${r.id}.cant" data-num="1" value="${val(d, `${k}.${r.id}.cant`)}" aria-label="${esc(r.l)} cantidad">`;
    const pctOut = (r) => `<output class="c-pctcalc" data-calc="${k}.${r.id}.pct" data-suffix="%"></output>`;
    const pctIn = (r) => `<div class="inp-unit c-pctin"><input type="text" inputmode="decimal" data-k="${k}.${r.id}.pct" data-num="1" value="${val(d, `${k}.${r.id}.pct`)}" aria-label="${esc(r.l)} %"><span class="unit">%</span></div>`;

    let body;
    if (cards) {
      body = f.rows.map((r) => `
        <div class="dcard" data-row="${k}.${r.id}">
          <div class="dcard-t">${rowLabel(r)}</div>
          <div class="dcard-g">
            <label class="mini c-cant-w"><span>Cant. (${unitTag})</span>${cantIn(r)}</label>
            <label class="mini"><span>%</span>${pctOut(r)}${pctIn(r)}</label>
            ${(f.extra || []).map((x) => `
              <label class="mini"><span>${esc(x.l)}</span><input type="text" inputmode="decimal" data-k="${k}.${r.id}.${x.id}" data-num="1" value="${val(d, `${k}.${r.id}.${x.id}`)}"></label>`).join('')}
          </div>
        </div>`).join('');
    } else {
      body = `
        <div class="dist-row dist-cols"><span>${esc(f.colLabel || '')}</span><span class="c-cant">Cant. (${unitTag})</span><span class="c-pcthead">%</span></div>
        ${f.rows.map((r) => `<div class="dist-row" data-row="${k}.${r.id}">${rowLabel(r)}${cantIn(r)}${pctOut(r)}${pctIn(r)}</div>`).join('')}`;
    }

    const total = f.noTotal ? '' : f.totalLabel
      ? `<div class="dist-total" data-total="${k}"><span>${esc(f.totalLabel)}</span><span class="tot-v"><i class="tol-badge" data-badge="${k}"></i><output data-calc="${k}.total" data-suffix="%"></output></span></div>`
      : `<div class="dist-total soft"><span>Suma</span><output data-calc="${k}.total" data-suffix="%"></output></div>`;

    return `<div class="dist ${cards ? 'cards' : ''} mode-${modo}" data-dist="${k}">${head}${body}${total}</div>`;
  },
  readings(f, d) {
    const arr = Array.isArray(d[f.k]) ? d[f.k] : [];
    const items = arr.map((v, i) => `
      <div class="rd">
        <span class="rd-n">${i + 1}</span>
        <input type="text" inputmode="decimal" data-rk="${esc(f.k)}" data-i="${i}" value="${esc(v ?? '')}" aria-label="${esc(f.label)} lectura ${i + 1}">
        <button type="button" class="icon-btn" data-rdel="${esc(f.k)}" data-i="${i}" aria-label="Quitar lectura">${icon.x}</button>
      </div>`).join('');
    return `
      <div class="readings" data-readings="${esc(f.k)}">
        <div class="readings-h"><span class="lbl">${esc(f.label)}</span><span class="avg">Promedio <output data-calc="${esc(f.k)}.avg"></output></span></div>
        <div class="rd-list">${items}</div>
        <button type="button" class="btn ghost sm" data-radd="${esc(f.k)}">${icon.plus} Agregar lectura</button>
      </div>`;
  },
  counts(f, d) {
    const rows = f.rows.map((r) => `
      <div class="dist-row">
        <span class="dl">${esc(r.l)}</span>
        <input type="text" inputmode="numeric" data-k="${esc(f.k)}.${r.id}" data-num="1" value="${val(d, `${f.k}.${r.id}`)}" aria-label="${esc(r.l)}">
        <output data-calc="${esc(f.k)}.${r.id}.pct" data-suffix="%"></output>
      </div>`).join('');
    return `
      <div class="dist mode-cant counts">
        <div class="readings-h"><span class="lbl">${esc(f.label)}</span></div>
        <div class="dist-row dist-cols"><span>Categoría</span><span>N° frutos</span><span>%</span></div>
        ${rows}
        <div class="dist-total soft"><span>Total frutos</span><output data-calc="${esc(f.k)}.total"></output></div>
      </div>`;
  },
  signature(f, d) {
    return `
      <div class="fld sig-wrap">
        <span class="lbl">${esc(f.label)}</span>
        <div class="sig"><canvas data-sig="${esc(f.k)}" aria-label="Área de firma"></canvas><span class="sig-ph ${d[f.k] ? 'hide' : ''}">Firme aquí con el dedo</span></div>
        <div class="row-end"><button type="button" class="btn ghost sm" data-sigclear="${esc(f.k)}">${icon.trash} Borrar firma</button></div>
      </div>`;
  },
  summary() {
    return `<div data-summary></div>`;
  },
  // Espacio que llena el propio formulario (p. ej. tarjeta de tolerancias)
  slot(f) {
    return `<div class="slot" data-slot="${esc(f.id)}"></div>`;
  },
  photos(f) {
    return `<div class="photos" data-photos="${esc(f.k)}">${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}<div class="ph-grid"></div>
      <div class="ph-acts">
        <label class="btn primary">${icon.camera} Tomar foto<input type="file" accept="image/*" capture="environment" data-phadd="${esc(f.k)}" hidden></label>
        <label class="btn secondary">${icon.image} Desde galería<input type="file" accept="image/*" multiple data-phadd="${esc(f.k)}" hidden></label>
      </div></div>`;
  }
};

export function renderSection(section, d) {
  return section.items.map((f) => (R[f.type] ? R[f.type](f, d) : '')).join('');
}

export function renderReadings(root, form, d, k) {
  const f = findField(form, k);
  const el = root.querySelector(`[data-readings="${CSS.escape(k)}"]`);
  if (f && el) el.outerHTML = R.readings(f, d);
}

export function datalists(form) {
  const s = getSettings();
  const lists = new Set();
  form.sections.forEach((sec) => sec.items.forEach((f) => f.list && lists.add(f.list)));
  return [...lists].map((l) => {
    const vals = new Set([...(s.listas[l] || []), ...((form.listas && form.listas[l]) || [])]);
    const opts = [...vals].sort((a, b) => a.localeCompare(b, 'es')).map((v) => `<option value="${esc(v)}">`).join('');
    return `<datalist id="dl-${esc(l)}">${opts}</datalist>`;
  }).join('');
}

export function findField(form, k) {
  for (const s of form.sections) for (const f of s.items) if (f.k === k) return f;
  return null;
}

/* ---------------------------- Cálculo ---------------------------- */

export function computeGeneric(form, d) {
  const calc = {};
  const meta = { dist: {} };
  for (const s of form.sections) {
    for (const f of s.items) {
      if (f.type === 'dist') {
        const base = num(d[f.base || 'muestra']);
        const modo = d[`${f.k}.modo`] || 'cant';
        const pcts = [];
        const cants = [];
        let any = false;
        for (const r of f.rows) {
          const cant = num(d[`${f.k}.${r.id}.cant`]);
          let pct;
          if (modo === 'pct') {
            pct = num(d[`${f.k}.${r.id}.pct`]);
          } else {
            pct = cant !== null && base > 0 ? (cant / base) * 100 : null;
            cants.push(cant);
          }
          if (pct !== null || cant !== null) any = true;
          calc[`${f.k}.${r.id}.pct`] = pct;
          calc[`${f.k}.${r.id}.cant`] = modo === 'pct' ? null : cant;
          pcts.push(pct);
        }
        calc[`${f.k}.total`] = any ? sum(pcts) : null;
        calc[`${f.k}.totalCant`] = modo === 'cant' && cants.some((c) => c !== null) ? sum(cants) : null;
        meta.dist[f.k] = { modo, base, any, f, maxCant: Math.max(0, ...cants.map((c) => c ?? 0)) };
      } else if (f.type === 'readings') {
        const vals = (Array.isArray(d[f.k]) ? d[f.k] : []).map(num);
        calc[`${f.k}.avg`] = avg(vals);
        calc[`${f.k}.vals`] = vals.filter((v) => v !== null);
      } else if (f.type === 'counts') {
        const ns = f.rows.map((r) => num(d[`${f.k}.${r.id}`]));
        const total = sum(ns);
        calc[`${f.k}.total`] = ns.some((n) => n !== null) ? total : null;
        f.rows.forEach((r, i) => {
          calc[`${f.k}.${r.id}.pct`] = ns[i] !== null && total > 0 ? (ns[i] / total) * 100 : null;
        });
      }
    }
  }
  return { calc, meta };
}

/** Escribe los valores calculados en pantalla. */
export function applyCalc(root, d, calc) {
  root.querySelectorAll('[data-calc]').forEach((el) => {
    const v = calc[el.dataset.calc];
    const dec = el.dataset.dec ? Number(el.dataset.dec) : 1;
    const s = v === null || v === undefined ? '–' : fmt(v, dec) + (el.dataset.suffix || '');
    if (el.textContent !== s) el.textContent = s;
  });
  const u = unitLabel(d.unidad);
  root.querySelectorAll('[data-unit]').forEach((el) => {
    if (el.textContent !== u) el.textContent = u;
  });
}

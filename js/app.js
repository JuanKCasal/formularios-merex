// App principal: rutas, pantallas (inicio, lista de informes, editor, ajustes)
import { APP_VERSION } from './config.js';
import { FORMS, getForm } from './forms/registry.js';
import { listRecords, getRecord, saveRecord, deleteRecord, getSettings, saveSettings, rememberValue, requestPersist } from './storage.js';
import { renderSection, renderReadings, datalists, computeGeneric, applyCalc } from './engine.js';
import { mountSignature } from './signature.js';
import { mountPhotos, delFotosDeInforme, allFotos, putFoto, blobToDataURL, dataURLToBlob } from './photos.js';
import { icon, toast, confirmBox } from './ui.js';
import { uid, esc, debounce, fechaHoraCL, todayISO, nowHM } from './util.js';

const app = document.getElementById('app');
let cleanup = null;
let installEvt = null;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/* ---------------------------- Rutas ---------------------------- */

function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.getElementById('modal-root').innerHTML = '';
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === 'ajustes') return screenAjustes();
  if (parts[0] === 'f') {
    const form = getForm(parts[1]);
    if (form) return parts[2] ? screenEditor(form, decodeURIComponent(parts[2])) : screenList(form);
  }
  return screenHome();
}

/* ---------------------------- Inicio ---------------------------- */

function screenHome() {
  const cards = FORMS.map((f) => {
    const recs = listRecords(f.id);
    const bor = recs.filter((r) => r.status !== 'finalizado').length;
    const fin = recs.length - bor;
    return `
      <a class="form-card" href="#/f/${f.id}">
        <span class="fc-ic">${icon.doc}</span>
        <span class="fc-tx">
          <strong>${esc(f.title)}</strong>
          <small>${esc(f.description)}</small>
          <span class="fc-meta">${bor} en curso · ${fin} finalizados</span>
        </span>
        <span class="fc-go">${icon.next}</span>
      </a>`;
  }).join('');

  app.innerHTML = `
    <header class="home-h">
      <img src="img/logo_merex.svg" alt="Merex" class="home-logo">
      <p>Formularios de control de calidad</p>
    </header>
    <main class="wrap">
      <h2 class="list-t">Formularios</h2>
      ${cards}
      <div id="install"></div>
      <a class="plain-link" href="#/ajustes">${icon.gear} Ajustes y respaldo</a>
    </main>
    <footer class="foot">Versión ${APP_VERSION}</footer>`;
  renderInstall();
}

function renderInstall() {
  const el = document.getElementById('install');
  if (!el || isStandalone()) return;
  if (installEvt) {
    el.innerHTML = `<div class="tip"><p><strong>Instala la app</strong> para usarla sin señal y que los borradores no se pierdan.</p><button class="btn primary" id="btnInstall">Instalar</button></div>`;
    document.getElementById('btnInstall').onclick = async () => {
      installEvt.prompt();
      await installEvt.userChoice.catch(() => null);
      installEvt = null;
      el.innerHTML = '';
    };
  } else {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    el.innerHTML = `<div class="tip"><p><strong>Consejo:</strong> agrega esta página a la pantalla de inicio para usarla sin señal${ios ? ' (botón Compartir → «Agregar a inicio»)' : ' (menú del navegador → «Instalar app» o «Agregar a pantalla de inicio»)'}.</p></div>`;
  }
}

/* ---------------------------- Lista de informes ---------------------------- */

function newRecord(form, base = {}) {
  const rec = {
    id: uid(),
    form: form.id,
    v: 1,
    created: Date.now(),
    status: 'borrador',
    section: 0,
    data: { ...form.newData(getSettings()), ...base }
  };
  saveRecord(rec);
  return rec;
}

function screenList(form) {
  const recs = listRecords(form.id);
  const items = recs.map((r) => `
    <article class="item">
      <a class="item-main" href="#/f/${form.id}/${encodeURIComponent(r.id)}">
        <strong>${esc(form.recordTitle(r.data))}</strong>
        <span class="item-sub">${esc(form.recordSubtitle(r.data)) || '&nbsp;'}</span>
        <span class="item-meta"><span class="chip ${r.status === 'finalizado' ? 'ok' : ''}">${r.status === 'finalizado' ? 'PDF generado' : 'Borrador'}</span> Editado ${fechaHoraCL(r.updated)}</span>
      </a>
      <div class="item-acts">
        <button class="icon-btn" data-dup="${esc(r.id)}" aria-label="Nuevo informe con el mismo productor" title="Nuevo con el mismo productor">${icon.copy}</button>
        <button class="icon-btn danger" data-del="${esc(r.id)}" aria-label="Eliminar informe" title="Eliminar">${icon.trash}</button>
      </div>
    </article>`).join('');

  app.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="#/" aria-label="Volver">${icon.back}</a>
      <div class="bar-t"><h1>${esc(form.title)}</h1></div>
    </header>
    <main class="wrap">
      <button class="btn primary big full" id="btnNew">${icon.plus} Nuevo informe</button>
      <h2 class="list-t">Informes guardados en este teléfono</h2>
      ${items || '<p class="empty">Aún no hay informes. Toca «Nuevo informe» para empezar.</p>'}
    </main>`;

  document.getElementById('btnNew').onclick = () => {
    const rec = newRecord(form);
    location.hash = `#/f/${form.id}/${encodeURIComponent(rec.id)}`;
  };

  app.querySelector('main').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    const dup = e.target.closest('[data-dup]');
    if (del) {
      const r = getRecord(del.dataset.del);
      const ok = await confirmBox({
        title: '¿Eliminar este informe?',
        text: `${esc(form.recordTitle(r?.data || {}))} — se borrará de este teléfono y no se puede recuperar.`,
        ok: 'Eliminar', danger: true
      });
      if (ok) { deleteRecord(del.dataset.del); delFotosDeInforme(del.dataset.del); toast('Informe eliminado'); screenList(form); }
    } else if (dup) {
      const r = getRecord(dup.dataset.dup);
      if (!r) return;
      const keep = ['productor', 'variedad', 'unidad', 'muestra', 'inspector'];
      const base = {};
      keep.forEach((k) => { if (r.data[k] !== undefined) base[k] = r.data[k]; });
      base.fecha = todayISO();
      base.hora = nowHM();
      const rec = newRecord(form, base);
      toast('Nuevo informe con el mismo productor');
      location.hash = `#/f/${form.id}/${encodeURIComponent(rec.id)}`;
    }
  });
}

/* ---------------------------- Editor ---------------------------- */

function screenEditor(form, id) {
  const rec = getRecord(id);
  if (!rec) {
    toast('No se encontró el informe');
    location.hash = `#/f/${form.id}`;
    return;
  }
  const d = rec.data;
  if (form.migrate && form.migrate(d)) saveRecord(rec);
  const secs = form.sections;
  let cur = Math.min(Math.max(0, rec.section || 0), secs.length - 1);
  let lastWarnings = [];

  app.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="#/f/${form.id}" aria-label="Volver a la lista">${icon.back}</a>
      <div class="bar-t">
        <h1>${esc(form.title)}</h1>
        <span class="save-st" id="saveSt">${icon.check} Guardado</span>
      </div>
    </header>
    <nav class="steps" id="steps" aria-label="Secciones">
      ${secs.map((s, i) => `<button type="button" data-step="${i}"><span class="n">${i + 1}</span>${esc(s.title)}<i class="dot"></i></button>`).join('')}
    </nav>
    <main class="editor" id="ed">
      ${datalists(form)}
      ${secs.map((s, i) => `<section class="sec" data-sec="${i}" id="sec-${s.id}" hidden><h2>${esc(s.title)}</h2><div class="grid">${renderSection(s, d)}</div></section>`).join('')}
    </main>
    <footer class="dock">
      <div class="strip" id="strip"></div>
      <div class="nav">
        <button type="button" class="btn ghost" id="prev">${icon.back} Anterior</button>
        <span class="pos" id="pos"></span>
        <button type="button" class="btn primary" id="next">Siguiente ${icon.next}</button>
      </div>
    </footer>`;

  const ed = document.getElementById('ed');
  const saveSt = document.getElementById('saveSt');
  const stepsEl = document.getElementById('steps');

  const setSt = (html, cls = '') => { saveSt.innerHTML = html; saveSt.className = 'save-st ' + cls; };
  const persist = debounce(() => {
    rec.section = cur;
    const ok = saveRecord(rec);
    if (ok) setSt(`${icon.check} Guardado`);
    else setSt(`${icon.warn} No se pudo guardar`, 'err');
  }, 400);

  function changed() {
    setSt('Guardando…', 'busy');
    persist();
    recalc();
  }

  function recalc() {
    const { calc, meta } = computeGeneric(form, d);
    const { warnings } = form.compute(d, calc, meta);
    lastWarnings = warnings;
    applyCalc(ed, d, calc);
    if (form.decorate) form.decorate(ed, d, calc);
    document.getElementById('strip').innerHTML = form.strip(calc)
      .map((s) => `<div class="${s.strong ? 'strong' : ''} ${s.cls || ''}"><span>${s.l}</span><b>${s.v}</b></div>`).join('');
    const warnSecs = new Set(warnings.filter((w) => w.level === 'warn').map((w) => w.section));
    stepsEl.querySelectorAll('[data-step]').forEach((b) => {
      b.classList.toggle('has-warn', warnSecs.has(secs[+b.dataset.step].id));
    });
    if (secs[cur].items.some((f) => f.type === 'summary')) {
      ed.querySelector(`[data-sec="${cur}"] [data-summary]`).innerHTML = form.renderSummary(d, calc, warnings);
    }
    return calc;
  }

  function go(i, focusTop = true) {
    cur = Math.min(Math.max(0, i), secs.length - 1);
    ed.querySelectorAll('.sec').forEach((s) => { s.hidden = +s.dataset.sec !== cur; });
    stepsEl.querySelectorAll('[data-step]').forEach((b) => b.classList.toggle('on', +b.dataset.step === cur));
    const active = stepsEl.querySelector('.on');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    document.getElementById('pos').textContent = `${cur + 1} / ${secs.length}`;
    document.getElementById('prev').disabled = cur === 0;
    const next = document.getElementById('next');
    next.hidden = cur === secs.length - 1;
    next.innerHTML = cur === secs.length - 2 ? `Ver resumen ${icon.next}` : `Siguiente ${icon.next}`;
    if (focusTop) window.scrollTo({ top: 0 });
    recalc();
    persist();
  }

  // Firma
  const pads = [];
  ed.querySelectorAll('[data-sig]').forEach((cv) => {
    const k = cv.dataset.sig;
    const ph = cv.parentElement.querySelector('.sig-ph');
    pads.push({
      k,
      pad: mountSignature(cv, {
        value: d[k] || '',
        onChange: (v) => { d[k] = v; ph.classList.toggle('hide', !!v); changed(); }
      })
    });
  });

  // Fotos
  const galerias = [];
  ed.querySelectorAll('[data-photos]').forEach((el) => {
    galerias.push(mountPhotos(el, { recId: rec.id, d, k: el.dataset.photos, onChange: changed }));
  });

  // Entradas de texto
  ed.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.k) {
      d[t.dataset.k] = t.value;
      changed();
    } else if (t.dataset.rk) {
      const arr = Array.isArray(d[t.dataset.rk]) ? d[t.dataset.rk] : (d[t.dataset.rk] = []);
      arr[+t.dataset.i] = t.value;
      changed();
    }
  });

  ed.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.remember) rememberValue(t.dataset.remember, t.value);
    if (t.dataset.k === 'inspector') {
      const s = getSettings();
      s.inspector = t.value.trim();
      saveSettings(s);
    }
  });

  // Enter = pasar al siguiente campo
  ed.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const fields = [...ed.querySelectorAll(`[data-sec="${cur}"] input:not([type=hidden])`)].filter((x) => x.offsetParent !== null);
    const i = fields.indexOf(e.target);
    if (i >= 0 && fields[i + 1]) fields[i + 1].focus();
    else e.target.blur();
  });

  ed.addEventListener('click', async (e) => {
    const seg = e.target.closest('[data-seg]');
    if (seg) {
      const k = seg.dataset.seg;
      const v = seg.dataset.v;
      d[k] = seg.dataset.toggle && d[k] === v ? '' : v;
      seg.parentElement.querySelectorAll('[data-seg]').forEach((b) => {
        const on = d[k] === b.dataset.v;
        b.classList.toggle('on', on);
        if (b.dataset.toggle) { b.classList.toggle('cumple', on && b.dataset.v === 'cumple'); b.classList.toggle('nocumple', on && b.dataset.v === 'nocumple'); }
      });
      if (k.endsWith('.modo')) switchMode(k.slice(0, -5), v);
      changed();
      return;
    }
    const add = e.target.closest('[data-radd]');
    if (add) {
      const k = add.dataset.radd;
      if (!Array.isArray(d[k])) d[k] = [];
      d[k].push('');
      renderReadings(ed, form, d, k);
      const inputs = ed.querySelectorAll(`[data-rk="${CSS.escape(k)}"]`);
      inputs[inputs.length - 1]?.focus();
      changed();
      return;
    }
    const del = e.target.closest('[data-rdel]');
    if (del) {
      const k = del.dataset.rdel;
      d[k].splice(+del.dataset.i, 1);
      renderReadings(ed, form, d, k);
      changed();
      return;
    }
    const sc = e.target.closest('[data-sigclear]');
    if (sc) {
      const p = pads.find((x) => x.k === sc.dataset.sigclear);
      if (p && d[p.k]) {
        const ok = await confirmBox({ title: '¿Borrar la firma?', ok: 'Borrar', danger: true });
        if (ok) p.pad.clear();
      }
      return;
    }
    const gt = e.target.closest('[data-goto]');
    if (gt) {
      const i = secs.findIndex((s) => s.id === gt.dataset.goto);
      if (i >= 0) go(i);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      await makePdf(act.dataset.act === 'share', act);
    }
  });

  // Al cambiar a "%", se precargan los % calculados para no perderlos
  function switchMode(k, modo) {
    const block = ed.querySelector(`[data-dist="${CSS.escape(k)}"]`);
    if (!block) return;
    if (modo === 'pct') {
      const { calc } = computeGeneric(form, { ...d, [`${k}.modo`]: 'cant' });
      block.querySelectorAll('.c-pctin input[data-k]').forEach((inp) => {
        const kk = inp.dataset.k;
        const p = calc[kk];
        if (!inp.value && p !== null && p !== undefined) {
          const s = String(Math.round(p * 10) / 10).replace('.', ',');
          inp.value = s;
          d[kk] = s;
        }
      });
    }
    block.classList.toggle('mode-pct', modo === 'pct');
    block.classList.toggle('mode-cant', modo !== 'pct');
  }

  async function makePdf(share, btn) {
    persist.flush();
    if (!window.jspdf) { toast('El generador de PDF no se cargó. Revisa la conexión y recarga.'); return; }
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Generando…';
    try {
      const { calc, meta } = computeGeneric(form, d);
      form.compute(d, calc, meta);
      const { blob, filename } = await form.generatePdf(d, calc, form);
      rec.status = 'finalizado';
      saveRecord(rec);
      if (share) {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: filename });
          } catch (err) {
            if (err.name !== 'AbortError') { toast('No se pudo compartir; se descargará el PDF'); download(blob, filename); }
          }
          return;
        }
        toast('Este navegador no permite compartir archivos; se descargó el PDF', 3500);
      }
      download(blob, filename);
      toast('PDF descargado');
    } catch (err) {
      console.error(err);
      toast('Error al generar el PDF');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  stepsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) go(+b.dataset.step);
  });
  document.getElementById('prev').onclick = () => go(cur - 1);
  document.getElementById('next').onclick = () => go(cur + 1);

  const onHide = () => { if (document.visibilityState === 'hidden') persist.flush(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', persist.flush);

  cleanup = () => {
    persist.flush();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', persist.flush);
    pads.forEach((p) => p.pad.destroy());
    galerias.forEach((g) => g.destroy());
  };

  go(cur);
  void lastWarnings;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------------------------- Ajustes ---------------------------- */

function screenAjustes() {
  const s = getSettings();
  const listNames = { productor: 'Productores', variedad: 'Variedades', lote: 'Lotes' };
  const keys = [...new Set([...Object.keys(listNames), ...Object.keys(s.listas)])];

  app.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="#/" aria-label="Volver">${icon.back}</a>
      <div class="bar-t"><h1>Ajustes y respaldo</h1></div>
    </header>
    <main class="wrap">
      <section class="card">
        <h2>Inspector</h2>
        <div class="fld"><label class="lbl" for="aj-insp">Nombre que se propone en cada informe nuevo</label>
        <input id="aj-insp" type="text" value="${esc(s.inspector)}"></div>
      </section>
      <section class="card">
        <h2>Listas recordadas</h2>
        <p class="help">Un valor por línea. Se agregan solos cuando escribes uno nuevo en un informe.</p>
        ${keys.map((k) => `
          <div class="fld"><label class="lbl" for="aj-l-${esc(k)}">${esc(listNames[k] || k)}</label>
          <textarea id="aj-l-${esc(k)}" data-list="${esc(k)}" rows="4">${esc((s.listas[k] || []).join('\n'))}</textarea></div>`).join('')}
      </section>
      <button class="btn primary big full" id="ajSave">${icon.save} Guardar ajustes</button>

      <section class="card">
        <h2>Respaldo</h2>
        <p class="help">Los informes viven solo en este teléfono. Descarga un respaldo de vez en cuando o para pasarlos a otro equipo. El respaldo incluye las fotos.</p>
        <div class="actions">
          <button class="btn secondary" id="bkDown">${icon.download} Descargar respaldo</button>
          <label class="btn ghost" for="bkFile">${icon.upload} Restaurar respaldo</label>
          <input type="file" id="bkFile" accept="application/json,.json" hidden>
        </div>
      </section>
      <p class="foot">Versión ${APP_VERSION} · <span id="persist"></span></p>
    </main>`;

  document.getElementById('ajSave').onclick = () => {
    const ns = getSettings();
    ns.inspector = document.getElementById('aj-insp').value.trim();
    app.querySelectorAll('[data-list]').forEach((ta) => {
      ns.listas[ta.dataset.list] = [...new Set(ta.value.split('\n').map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    });
    saveSettings(ns);
    toast('Ajustes guardados');
  };

  document.getElementById('bkDown').onclick = async () => {
    const fotos = {};
    try {
      for (const f of await allFotos()) fotos[f.id] = { rec: f.rec, w: f.w, h: f.h, data: await blobToDataURL(f.blob) };
    } catch (e) { console.warn('fotos', e); }
    const data = { app: 'formularios-merex', version: APP_VERSION, exported: new Date().toISOString(), settings: getSettings(), records: listRecords(), fotos };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    download(blob, `respaldo_formularios_merex_${todayISO()}.json`);
  };

  document.getElementById('bkFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'formularios-merex' || !Array.isArray(data.records)) throw new Error('formato');
      let n = 0;
      let nf = 0;
      for (const [id, f] of Object.entries(data.fotos || {})) {
        try { await putFoto({ id, rec: f.rec, w: f.w, h: f.h, blob: await dataURLToBlob(f.data), created: Date.now() }); nf++; } catch (e) { console.warn('foto', e); }
      }
      for (const r of data.records) {
        const ex = getRecord(r.id);
        if (!ex || (r.updated || 0) > (ex.updated || 0)) {
          const upd = r.updated;
          saveRecord(r);
          r.updated = upd;
          localStorage.setItem('fm:rec:' + r.id, JSON.stringify(r));
          n++;
        }
      }
      if (data.settings) {
        const cur = getSettings();
        for (const [k, arr] of Object.entries(data.settings.listas || {})) {
          cur.listas[k] = [...new Set([...(cur.listas[k] || []), ...arr])].sort((a, b) => a.localeCompare(b, 'es'));
        }
        if (!cur.inspector && data.settings.inspector) cur.inspector = data.settings.inspector;
        saveSettings(cur);
      }
      toast(`Respaldo restaurado: ${n} informe(s)${nf ? `, ${nf} foto(s)` : ''}`);
      screenAjustes();
    } catch {
      toast('El archivo no es un respaldo válido');
    }
  };

  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((p) => {
      const el = document.getElementById('persist');
      if (el) el.textContent = p ? 'Almacenamiento protegido' : 'Almacenamiento no protegido (instala la app)';
    });
  }
}

/* ---------------------------- Arranque ---------------------------- */

window.addEventListener('hashchange', route);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  renderInstall();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  });
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    toast('App actualizada. Recargando…', 1500);
    setTimeout(() => location.reload(), 1200);
  });
}

requestPersist();
route();

// Fotos adjuntas a los informes.
// Las imágenes se reducen (lado mayor 1600 px, JPEG) y se guardan en IndexedDB,
// que soporta mucho más espacio que localStorage. En el informe solo queda la
// lista de fotos: d[k] = [{ id, nota, w, h }].

import { uid, esc } from './util.js';
import { icon, toast, confirmBox } from './ui.js';

const DB = 'formularios-merex';
const STORE = 'fotos';
export const MAX_FOTOS = 12;
const LADO = 1600;
const CALIDAD = 0.75;

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(STORE, { keyPath: 'id' });
      s.createIndex('rec', 'rec');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbp = null; rej(r.error); };
  });
  return dbp;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export const putFoto = (f) => tx('readwrite', (s) => s.put(f));
export const getFoto = (id) => tx('readonly', (s) => s.get(id));
export const delFoto = (id) => tx('readwrite', (s) => s.delete(id));
export const allFotos = () => tx('readonly', (s) => s.getAll());

export async function delFotosDeInforme(recId) {
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readwrite');
      const req = t.objectStore(STORE).index('rec').openCursor(IDBKeyRange.only(recId));
      req.onsuccess = () => { const c = req.result; if (c) { c.delete(); c.continue(); } };
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    });
  } catch (e) { console.warn('fotos', e); }
}

export function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(u) {
  return (await fetch(u)).blob();
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('imagen'));
    i.src = src;
  });
}

/** Reduce la foto a LADO px y la pasa a JPEG. */
export async function comprimir(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const k = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k);
    const h = Math.round(img.naturalHeight * k);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', CALIDAD));
    if (!blob) throw new Error('jpeg');
    return { blob, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fotos del informe en formato para el PDF: [{ n, nota, data, w, h }] */
export async function fotosParaPdf(lista) {
  const out = [];
  for (const [i, f] of (Array.isArray(lista) ? lista : []).entries()) {
    try {
      const x = await getFoto(f.id);
      if (x && x.blob) out.push({ n: i + 1, nota: f.nota || '', data: await blobToDataURL(x.blob), w: x.w, h: x.h });
    } catch (e) { console.warn('foto', e); }
  }
  return out;
}

/**
 * Monta la galería de fotos en `el` ([data-photos]).
 * onChange() se llama cada vez que cambia la lista o una nota.
 */
export function mountPhotos(el, { recId, d, k, onChange }) {
  const grid = el.querySelector('.ph-grid');
  const urls = new Map();
  let busy = false;
  const lista = () => (Array.isArray(d[k]) ? d[k] : (d[k] = []));

  async function thumb(id) {
    if (urls.has(id)) return urls.get(id);
    const x = await getFoto(id).catch(() => null);
    const u = x && x.blob ? URL.createObjectURL(x.blob) : '';
    urls.set(id, u);
    return u;
  }

  async function render() {
    const arr = lista();
    grid.innerHTML = arr.length
      ? arr.map((f, i) => `
        <div class="ph" data-phid="${esc(f.id)}">
          <button type="button" class="ph-img" data-phview="${esc(f.id)}" aria-label="Ver foto ${i + 1}"><span class="ph-n">${i + 1}</span></button>
          <input type="text" data-phnota="${esc(f.id)}" value="${esc(f.nota || '')}" placeholder="Comentario (opcional)" aria-label="Comentario foto ${i + 1}">
          <button type="button" class="icon-btn danger ph-del" data-phdel="${esc(f.id)}" aria-label="Quitar foto ${i + 1}">${icon.trash}</button>
        </div>`).join('')
      : '<p class="empty sm">Sin fotos. Se agregan al final del PDF como anexo.</p>';
    el.querySelectorAll('.ph-acts .btn').forEach((b) => b.classList.toggle('disabled', arr.length >= MAX_FOTOS));
    for (const f of arr) {
      const u = await thumb(f.id);
      const b = grid.querySelector(`[data-phview="${CSS.escape(f.id)}"]`);
      if (b && u) b.style.backgroundImage = `url("${u}")`;
      else if (b) b.classList.add('missing');
    }
  }

  async function onFiles(input) {
    const files = [...(input.files || [])];
    input.value = '';
    if (!files.length || busy) return;
    const libres = MAX_FOTOS - lista().length;
    if (libres <= 0) { toast(`Máximo ${MAX_FOTOS} fotos por informe`); return; }
    if (files.length > libres) toast(`Solo se agregan ${libres} foto(s): máximo ${MAX_FOTOS}`, 3000);
    busy = true;
    el.classList.add('busy');
    let ok = 0;
    try {
      for (const file of files.slice(0, libres)) {
        try {
          const { blob, w, h } = await comprimir(file);
          const id = uid();
          await putFoto({ id, rec: recId, blob, w, h, created: Date.now() });
          lista().push({ id, nota: '', w, h });
          ok++;
        } catch (e) {
          console.error(e);
          toast(e && e.name === 'QuotaExceededError' ? 'No queda espacio en el teléfono para más fotos' : 'No se pudo agregar una foto', 3000);
        }
      }
    } finally {
      busy = false;
      el.classList.remove('busy');
    }
    if (ok) { onChange(); await render(); toast(ok === 1 ? 'Foto agregada' : `${ok} fotos agregadas`); }
  }

  async function view(id) {
    const u = await thumb(id);
    if (!u) return;
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="ph-view"><img src="${u}" alt="Foto"><button type="button" class="icon-btn" aria-label="Cerrar">${icon.x}</button></div>`;
    root.querySelector('.ph-view').onclick = () => { root.innerHTML = ''; };
  }

  const onClick = async (e) => {
    const v = e.target.closest('[data-phview]');
    if (v) { view(v.dataset.phview); return; }
    const del = e.target.closest('[data-phdel]');
    if (del) {
      const id = del.dataset.phdel;
      const ok = await confirmBox({ title: '¿Quitar esta foto?', text: 'Se borrará del informe.', ok: 'Quitar', danger: true });
      if (!ok) return;
      d[k] = lista().filter((f) => f.id !== id);
      await delFoto(id).catch(() => null);
      const u = urls.get(id);
      if (u) URL.revokeObjectURL(u);
      urls.delete(id);
      onChange();
      render();
    }
  };
  const onInput = (e) => {
    const t = e.target;
    if (t.dataset.phnota) {
      const f = lista().find((x) => x.id === t.dataset.phnota);
      if (f) { f.nota = t.value; onChange(); }
    }
  };
  const onChangeEv = (e) => { if (e.target.dataset.phadd) onFiles(e.target); };

  el.addEventListener('click', onClick);
  el.addEventListener('input', onInput);
  el.addEventListener('change', onChangeEv);
  render();

  return {
    destroy() {
      el.removeEventListener('click', onClick);
      el.removeEventListener('input', onInput);
      el.removeEventListener('change', onChangeEv);
      urls.forEach((u) => u && URL.revokeObjectURL(u));
      urls.clear();
    }
  };
}

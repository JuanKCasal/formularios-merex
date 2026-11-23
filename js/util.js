// Utilidades comunes

/** Convierte texto a número aceptando coma o punto decimal. Devuelve null si está vacío o no es número. */
export function num(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Formatea un número al estilo chileno (coma decimal). */
export function fmt(n, dec = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  const r = Math.round(n * 10 ** dec) / 10 ** dec;
  return r.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: dec, useGrouping: false });
}

/** Formatea un valor tal como lo escribió el usuario (normaliza el punto a coma). */
export function fmtRaw(v) {
  if (v === null || v === undefined) return '';
  const n = num(v);
  if (n === null) return String(v);
  return fmt(n, 3);
}

export function sum(arr) {
  return arr.reduce((a, b) => a + (b ?? 0), 0);
}

export function avg(arr) {
  const v = arr.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  return v.length ? sum(v) / v.length : null;
}

export function uid() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}${r}`;
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 2026-11-21 -> 21-11-2026 */
export function fechaCL(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

export function fechaHoraCL(ts) {
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

/** Nombre de archivo seguro */
export function safeName(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

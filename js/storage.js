// Almacenamiento local en el teléfono (localStorage).
// Cada informe se guarda en su propia clave: fm:rec:<id>

const REC = 'fm:rec:';
const SETTINGS = 'fm:settings';

function read(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.error('No se pudo guardar', e);
    return false;
  }
}

export function listRecords(formId) {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(REC)) {
      const r = read(k);
      if (r && (!formId || r.form === formId)) out.push(r);
    }
  }
  return out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

export function getRecord(id) {
  return read(REC + id);
}

export function saveRecord(rec) {
  rec.updated = Date.now();
  return write(REC + rec.id, rec);
}

export function deleteRecord(id) {
  try { localStorage.removeItem(REC + id); } catch { /* nada */ }
}

const DEFAULT_SETTINGS = { inspector: '', listas: {} };

export function getSettings() {
  const s = read(SETTINGS) || {};
  return { ...DEFAULT_SETTINGS, ...s, listas: { ...(s.listas || {}) } };
}

export function saveSettings(s) {
  return write(SETTINGS, s);
}

/** Agrega un valor a una lista recordada (productores, variedades, lotes…). */
export function rememberValue(list, value) {
  const v = String(value || '').trim();
  if (!v) return;
  const s = getSettings();
  const arr = s.listas[list] || [];
  if (!arr.some((x) => x.toLowerCase() === v.toLowerCase())) {
    arr.push(v);
    arr.sort((a, b) => a.localeCompare(b, 'es'));
    s.listas[list] = arr;
    saveSettings(s);
  }
}

/** Pide al navegador que no borre los datos automáticamente. */
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch { /* nada */ }
}

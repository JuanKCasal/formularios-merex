// Lista de formularios disponibles. Para agregar uno nuevo:
// 1) crear la carpeta js/forms/<id>/ con schema.js, compute.js y pdf.js (copiar cerezas como base)
// 2) importarlo aquí y agregarlo a FORMS
// 3) sumar sus archivos a la lista ASSETS de sw.js
import cerezas from './cerezas/schema.js';

export const FORMS = [cerezas];

export function getForm(id) {
  return FORMS.find((f) => f.id === id) || null;
}

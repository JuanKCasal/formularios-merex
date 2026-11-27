// PDF del Informecampo Cerezas: réplica del formato impreso Merex (A4 vertical).
// Los textos fijos del formato van en negro y los datos ingresados en azul.
import { num, fmt, fmtRaw, fechaCL, fechaHoraCL, safeName } from '../../util.js';
import { APP_VERSION } from '../../config.js';
import { unitLabel } from '../../engine.js';
import { COLORES, CALIBRES, CONDICION, CALIDAD, FIRMPRO } from './fields.js';
import { evaluar, NIVELES, rangos } from './tolerancias.js';
import { fotosParaPdf } from '../../photos.js';

const AZUL = [19, 35, 91];
const NEGRO = [0, 0, 0];
const GRIS = [228, 231, 233];
// Semáforo (mismos colores de la tabla de tolerancias Merex)
const FUERTE = [[146, 208, 80], [255, 255, 0], [255, 0, 0]];
const TXT_FUERTE = [NEGRO, NEGRO, [255, 255, 255]];
const SUAVE = [[220, 240, 205], [255, 247, 170], [255, 205, 200]];

let logoCache = null;

async function toDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

async function getLogo() {
  if (logoCache) return logoCache;
  try {
    const res = await fetch('img/logo_merex.png');
    logoCache = await toDataURL(await res.blob());
  } catch {
    logoCache = null;
  }
  return logoCache;
}

function imgSize(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => res(null);
    i.src = src;
  });
}

const P = (v) => (v === null || v === undefined ? '' : fmt(v, 1));

export async function generatePdf(d, calc, form) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const unit = unitLabel(d.unidad);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...NEGRO);

  /* ---------- helpers ---------- */
  function fit(text, maxW, size, min = 4.5) {
    let s = size;
    doc.setFontSize(s);
    while (s > min && doc.getTextWidth(text) > maxW) { s -= 0.25; doc.setFontSize(s); }
    let t = text;
    if (doc.getTextWidth(t) > maxW) {
      while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
      t += '…';
    }
    return t;
  }

  function cell(x, y, w, h, text = '', o = {}) {
    const { align = 'left', bold = false, size = 6.8, fill = null, value = false, border = true, txt = null } = o;
    if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, border ? 'FD' : 'F'); } else if (border) doc.rect(x, y, w, h);
    if (text === null || text === undefined || text === '') return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(txt || (value ? AZUL : NEGRO)));
    const t = fit(String(text), w - 2, value ? size + 1 : size);
    const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - 1.2 : x + 1.2;
    doc.text(t, tx, y + h / 2, { align, baseline: 'middle' });
  }

  /** Dibuja una fila de celdas con anchos dados. cells: [{t, ...opciones}] */
  function row(x, y, widths, h, cells) {
    let cx = x;
    widths.forEach((w, i) => {
      const c = cells[i] || {};
      cell(cx, y, w, h, c.t, c);
      cx += w;
    });
  }

  function label(x, y, text, size = 7.5) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(...NEGRO);
    doc.text(text, x, y, { baseline: 'middle' });
  }

  function lineValue(x1, x2, y, text) {
    doc.setLineWidth(0.15);
    doc.line(x1, y + 1.8, x2, y + 1.8);
    doc.setLineWidth(0.2);
    if (!text) return;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...AZUL);
    const t = fit(String(text), x2 - x1 - 1, 9);
    doc.text(t, x1 + 1, y, { baseline: 'middle' });
  }

  const v = (k) => fmtRaw(d[k]);

  const tol = calc.tol || evaluar(d, calc, { dist: {} });
  // nivel de tolerancia de cada fila (para pintar su %)
  const nivFila = {};
  for (const g of Object.keys(tol)) {
    for (const it of tol[g].items) {
      if (it.p.total || it.n === null) continue;
      it.p.from.forEach((key) => { nivFila[key] = it.n; });
    }
  }
  const tinte = (key) => {
    const n = nivFila[key];
    return n !== undefined && (calc[`${key}.pct`] ?? 0) > 0 ? SUAVE[n] : null;
  };

  /* ---------- Encabezado ---------- */
  const logo = await getLogo();
  if (logo) doc.addImage(logo, 'PNG', 12, 9, 38, 38 / 2.285);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  doc.text('INFORMECAMPO CEREZAS', 105, 16, { align: 'center', baseline: 'middle' });

  row(150, 9, [17, 31], 5.5, [{ t: 'Código:', bold: true }, { t: form.codigo, value: true }]);
  row(150, 14.5, [17, 31], 5.5, [{ t: 'Revisión:', bold: true }, { t: form.revision, value: true }]);

  /* ---------- Datos de recepción ---------- */
  const y0 = 33;
  const izq = [
    ['Productor', d.productor],
    ['Variedad', d.variedad],
    ['Fecha Recepción', fechaCL(d.fecha)],
    ['Hora Recepción', d.hora]
  ];
  const der = [
    ['N° Lote', d.lote],
    ['N° Bandejas', v('bandejas')],
    ['Peso neto', d.pesoNeto ? `${v('pesoNeto')} kg` : ''],
    [`Muestra (${unit})`, d.muestra ? `${v('muestra')} ${unit}` : '']
  ];
  izq.forEach(([l, t], i) => { const y = y0 + i * 5.8; label(12, y, l); lineValue(42, 102, y, t); });
  der.forEach(([l, t], i) => { const y = y0 + i * 5.8; label(110, y, l); lineValue(144, 198, y, t); });

  /* ---------- Temperaturas y envase ---------- */
  let y = 57;
  const rh = 5;
  row(12, y, [34, 20], rh, [{ border: false }, { t: '°C', bold: true, align: 'center' }]);
  doc.rect(46, y, 20, rh);
  [['T° pulpa', 'tPulpa'], ['T° Camión', 'tCamion'], ['T° post HD', 'tPostHD']].forEach(([l, k], i) => {
    row(12, y + rh * (i + 1), [34, 20], rh, [{ t: l }, { t: v(k), value: true, align: 'center' }]);
  });

  row(110, y, [40, 24, 24], rh, [{ border: false }, { t: 'Cumple', bold: true, align: 'center' }, { t: 'No Cumple', bold: true, align: 'center' }]);
  [['Estiba', 'estiba'], ['Llenado', 'llenado'], ['Limpieza envase', 'limpieza']].forEach(([l, k], i) => {
    row(110, y + rh * (i + 1), [40, 24, 24], rh, [
      { t: l },
      { t: d[k] === 'cumple' ? 'X' : '', value: true, align: 'center', bold: true },
      { t: d[k] === 'nocumple' ? 'X' : '', value: true, align: 'center', bold: true }
    ]);
  });

  /* ---------- Distribución de color ---------- */
  y = 80;
  const r2 = 4.8;
  const lc = 40;
  const cw = (186 - lc) / 6;
  const cws = [lc, ...Array(6).fill(cw)];
  const colorPct = d['color.modo'] === 'pct';
  cell(12 + lc, y, 186 - lc, r2, 'DISTRIBUCIÓN COLOR', { bold: true, align: 'center', fill: GRIS });
  y += r2;
  row(12, y, cws, r2, [{ border: false }, ...COLORES.map((c) => ({ t: c.l, bold: true, align: 'center', size: 6.3 }))]);
  doc.rect(12 + lc, y, 186 - lc, r2);
  y += r2;
  const colorRows = [
    [unit, (c) => (colorPct ? '' : v(`color.${c.id}.cant`))],
    ['(%)', (c) => P(calc[`color.${c.id}.pct`])],
    ['SS Color predominante', (c) => v(`color.${c.id}.ss`)],
    ['Firmeza promedio (UD)', (c) => v(`color.${c.id}.firmeza`)]
  ];
  colorRows.forEach(([l, fn]) => {
    row(12, y, cws, r2, [{ t: l, bold: true, align: l === unit || l === '(%)' ? 'center' : 'left' }, ...COLORES.map((c) => ({ t: fn(c), value: true, align: 'center', fill: l === '(%)' ? tinte(`color.${c.id}`) : null }))]);
    y += r2;
  });

  /* ---------- Distribución de calibres ---------- */
  y += 3.5;
  const calPct = d['calibre.modo'] === 'pct';
  cell(12 + lc, y, 186 - lc, r2, 'DISTRIBUCIÓN DE CALIBRES', { bold: true, align: 'center', fill: GRIS });
  y += r2;
  row(12, y, cws, r2, [{ border: false }, ...CALIBRES.map((c) => ({ t: `${c.l} (${c.hint})`, bold: true, align: 'center', size: 6.3 }))]);
  doc.rect(12 + lc, y, 186 - lc, r2);
  y += r2;
  row(12, y, cws, r2, [{ t: unit, bold: true, align: 'center' }, ...CALIBRES.map((c) => ({ t: calPct ? '' : v(`calibre.${c.id}.cant`), value: true, align: 'center' }))]);
  y += r2;
  row(12, y, cws, r2, [{ t: '(%)', bold: true, align: 'center' }, ...CALIBRES.map((c) => ({ t: P(calc[`calibre.${c.id}.pct`]), value: true, align: 'center' }))]);
  y += r2;

  /* ---------- Defectos ---------- */
  y += 3.5;
  cell(12, y, 186, 5, 'DEFECTOS DE CONDICIÓN Y CALIDAD', { bold: true, align: 'center', size: 7.5, fill: GRIS });
  y += 7;
  const r3 = 4.1;
  const dw = [46, 22, 22];

  function defectTable(x, k, title, rows, totalLabel, g) {
    let yy = y;
    const pctMode = d[`${k}.modo`] === 'pct';
    cell(x, yy, 90, r3, title, { bold: true, align: 'center', fill: GRIS });
    yy += r3;
    row(x, yy, dw, r3, [{ t: 'Defecto', bold: true, size: 6.3 }, { t: unit, bold: true, align: 'center' }, { t: '%', bold: true, align: 'center' }]);
    yy += r3;
    rows.forEach((r) => {
      let l = r.l.toUpperCase();
      if (r.otros && d[`${k}.${r.id}.nombre`]) l = `OTROS: ${d[`${k}.${r.id}.nombre`]}`;
      row(x, yy, dw, r3, [
        { t: l, size: 6.1 },
        { t: pctMode ? '' : v(`${k}.${r.id}.cant`), value: true, align: 'center' },
        { t: P(calc[`${k}.${r.id}.pct`]), value: true, align: 'center', fill: tinte(`${k}.${r.id}`) }
      ]);
      yy += r3;
    });
    const tn = tol[g].total.n;
    row(x, yy, dw, r3 + 0.6, [
      { t: totalLabel, bold: true },
      { t: tn === null ? '' : `Cat. ${NIVELES[g][tn]}`, bold: true, align: 'center', fill: tn === null ? null : FUERTE[tn], txt: tn === null ? null : TXT_FUERTE[tn] },
      { t: P(calc[`${k}.total`]), value: tn === null, bold: true, align: 'center', fill: tn === null ? null : FUERTE[tn], txt: tn === null ? null : TXT_FUERTE[tn] }
    ]);
    return yy + r3 + 0.6;
  }

  const yEnd = Math.max(
    defectTable(12, 'cond', 'DEFECTOS DE CONDICIÓN', CONDICION, 'TOTAL CONDICIÓN', 'cond'),
    defectTable(108, 'calid', 'DEFECTOS DE CALIDAD', CALIDAD, 'TOTAL CALIDAD', 'calid')
  );

  y = yEnd + 3;
  const ox = tol.cond.items.find((it) => it.p.id === 'oxidada');
  const bx = tol.calid.items.find((it) => it.p.id === 'brix');
  row(12, y, [46, 44], 5.5, [{ t: 'SUMA TOTAL DE DEFECTOS', bold: true }, { t: calc.suma !== null ? P(calc.suma) + ' %' : '', value: true, align: 'center', bold: true }]);
  row(12, y + 5.5, [46, 44], 5.5, [{ t: 'ESTIMACIÓN EXPORTABLE', bold: true }, { t: calc.exportable !== null ? P(calc.exportable) + ' %' : '', value: true, align: 'center', bold: true }]);
  row(12, y + 11, [46, 44], 5.5, [{ t: 'Frutos pulpa oxidada (%)', bold: true }, { t: ox.v !== null ? P(ox.v) + ' %' : '', value: true, align: 'center', fill: ox.n === null ? null : SUAVE[ox.n] }]);
  row(108, y, [46, 44], 5.5, [{ t: 'Presencia racimo (%)', bold: true }, { t: v('racimo'), value: true, align: 'center' }]);
  row(108, y + 5.5, [46, 44], 5.5, [{ t: 'Presencia de hoja', bold: true }, { t: d.hoja, value: true, align: 'center' }]);
  row(108, y + 11, [46, 44], 5.5, [{ t: 'Brix promedio (°Bx)', bold: true }, { t: bx.v !== null ? P(bx.v) : '', value: true, align: 'center', fill: bx.n === null ? null : SUAVE[bx.n] }]);

  y += 16.5 + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Colores según tolerancias "Bulk directo de huerto": verde = dentro · amarillo = en el límite · rojo = fuera. Detalle en la página 2.', 105, y, { align: 'center', baseline: 'middle' });

  function pie() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 130);
    doc.text(`Generado el ${fechaHoraCL(Date.now())} · Formularios Merex v${APP_VERSION}`, 105, 292, { align: 'center' });
    doc.text(`Pág. ${doc.getNumberOfPages()}`, 198, 292, { align: 'right' });
  }

  function cabecera(titulo) {
    if (logo) doc.addImage(logo, 'PNG', 12, 8, 30, 30 / 2.285);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(titulo, 105, 12, { align: 'center', baseline: 'middle' });
    const id = [d.productor, d.variedad, fechaCL(d.fecha), d.lote ? `Lote ${d.lote}` : ''].filter(Boolean).join('  ·  ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...AZUL);
    doc.text(fit(id, 120, 8), 105, 17.5, { align: 'center', baseline: 'middle' });
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(12, 23, 198, 23);
    doc.setLineWidth(0.2);
  }
  pie();

  /* ================= Página 2: tolerancias, firmeza, brix, observaciones y firma ================= */
  doc.addPage();
  cabecera('INFORMECAMPO CEREZAS — EVALUACIÓN DE TOLERANCIAS Y CIERRE');
  y = 27;
  const tw = [72, 20, 26, 26, 26, 16];
  const r4 = 4.3;
  cell(12, y, 186, 5, 'TOLERANCIAS BULK DIRECTO DE HUERTO', { bold: true, align: 'center', size: 7.5, fill: GRIS });
  y += 5;
  for (const [g, nombre] of [['cond', 'CONDICIÓN'], ['calid', 'CALIDAD']]) {
    const niv = NIVELES[g];
    row(12, y, tw, r4, [
      { t: `PARÁMETROS ${nombre}`, bold: true, fill: GRIS },
      { t: 'Valor', bold: true, align: 'center', fill: GRIS },
      { t: `${niv[0]} (%)`, bold: true, align: 'center', fill: FUERTE[0] },
      { t: `${niv[1]} (%)`, bold: true, align: 'center', fill: FUERTE[1] },
      { t: `${niv[2]} (%)`, bold: true, align: 'center', fill: FUERTE[2], txt: TXT_FUERTE[2] },
      { t: 'Result.', bold: true, align: 'center', fill: GRIS }
    ]);
    y += r4;
    for (const it of tol[g].items) {
      const rg = rangos(it.p);
      const val = it.v === null ? '' : it.p.unit ? `${P(it.v)} ${it.p.unit}` : `${P(it.v)} %`;
      row(12, y, tw, r4, [
        { t: it.p.total ? it.p.l : it.p.l, bold: !!it.p.total, size: 6.5 },
        { t: val, value: true, align: 'center', bold: !!it.p.total },
        ...[0, 1, 2].map((i) => ({ t: rg[i] || '', align: 'center', size: 6.3, fill: it.n === i ? SUAVE[i] : null, bold: it.n === i })),
        { t: it.n === null ? '–' : niv[it.n], bold: true, align: 'center', fill: it.n === null ? null : FUERTE[it.n], txt: it.n === null ? null : TXT_FUERTE[it.n] }
      ]);
      y += r4;
    }
    y += 2;
  }
  const resTxt = (g, nombre) => {
    const pe = tol[g].peor;
    if (!pe) return `${nombre}: sin datos`;
    const fuera = tol[g].items.filter((it) => it.n === pe.n && pe.n > 0).map((it) => it.p.l.toLowerCase());
    return `${nombre}: ${NIVELES[g][pe.n]}${fuera.length ? ` (${fuera.join(', ')})` : ' (todo en tolerancia)'}`;
  };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...NEGRO);
  const resLines = doc.splitTextToSize(`Peor parámetro evaluado — ${resTxt('cond', 'Condición')} · ${resTxt('calid', 'Calidad')}`, 186);
  resLines.forEach((ln, i) => doc.text(ln, 12, y + 1 + i * 3.4, { baseline: 'middle' }));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(90, 90, 90);
  y += resLines.length * 3.4 + 2;
  doc.text('Equivalencias: partidura = lateral + apical + medialuna + por agua; machucón incluye hombros; pudrición incluye pudrición seca; russet y cicatrices = russet + herida cicatrizada;', 12, y, { baseline: 'middle' });
  doc.text('frutos rojos = color rojo claro; frutos verdes = falta de color; Brix = promedio de lecturas Dark y Light. Filas sin dato cuentan como 0 si la tabla tiene datos.', 12, y + 3, { baseline: 'middle' });

  // Firmeza FirmPro y Brix
  let ty = y + 8;
  const fw = [30, 18, 18];
  row(12, ty, fw, r3, [{ t: 'FIRMEZA FIRMPRO', bold: true, fill: GRIS }, { t: 'n° frutos', bold: true, align: 'center', fill: GRIS }, { t: '%', bold: true, align: 'center', fill: GRIS }]);
  FIRMPRO.forEach((r, i) => {
    row(12, ty + r3 * (i + 1), fw, r3, [{ t: r.l }, { t: v(`firmpro.${r.id}`), value: true, align: 'center' }, { t: P(calc[`firmpro.${r.id}.pct`]), value: true, align: 'center' }]);
  });
  const bw = [20, 76, 24];
  row(78, ty, bw, r3, [{ t: 'BRIX (°Bx)', bold: true, fill: GRIS }, { t: 'Lecturas', bold: true, align: 'center', fill: GRIS }, { t: 'Promedio', bold: true, align: 'center', fill: GRIS }]);
  [['Dark', 'brix.dark'], ['Light', 'brix.light']].forEach(([l, k], i) => {
    const lect = (calc[`${k}.vals`] || []).map((x) => fmt(x, 2)).join('  ·  ');
    row(78, ty + r3 * (i + 1), bw, r3, [{ t: l }, { t: lect, value: true, align: 'center' }, { t: P(calc[`${k}.avg`]), value: true, align: 'center', bold: true }]);
  });

  /* ---------- Observaciones ---------- */
  const obsTop = ty + r3 * 4 + 4;
  const fy = 280;
  const obsH = fy - 9 - obsTop;
  doc.rect(12, obsTop, 186, obsH);
  label(14, obsTop + 3.5, 'OBSERVACIONES:', 7.5);
  const nf = Array.isArray(d.fotos) ? d.fotos.length : 0;
  if (nf) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(`Se adjuntan ${nf} foto(s) en el anexo fotográfico.`, 196, obsTop + 3.5, { align: 'right', baseline: 'middle' });
  }
  ty = obsTop + 7;
  const obs = String(d.observaciones || '').trim();
  let resto = [];
  if (obs) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...AZUL);
    const lines = doc.splitTextToSize(obs, 180);
    const maxLines = Math.floor((obsTop + obsH - 1.5 - ty) / 3.6);
    const show = lines.slice(0, maxLines);
    resto = lines.slice(maxLines);
    if (resto.length && show.length) show[show.length - 1] += '  (continúa en la página siguiente)';
    show.forEach((ln, i) => doc.text(ln, 15, ty + 1.5 + i * 3.6, { baseline: 'middle' }));
  }

  /* ---------- Inspector y firma ---------- */
  label(12, fy, 'Inspector:');
  lineValue(28, 102, fy, d.inspector);
  label(110, fy, 'Firma:');
  doc.setLineWidth(0.15);
  doc.line(122, fy + 1.8, 198, fy + 1.8);
  doc.setLineWidth(0.2);
  if (d.firma) {
    const s = await imgSize(d.firma);
    if (s) {
      const boxW = 70;
      const boxH = 13;
      const k = Math.min(boxW / s.w, boxH / s.h);
      const w = s.w * k;
      const h = s.h * k;
      doc.addImage(d.firma, 'PNG', 122 + (76 - w) / 2, fy + 1.2 - h, w, h);
    }
  }
  pie();

  if (resto.length) {
    doc.addPage();
    cabecera('INFORMECAMPO CEREZAS — OBSERVACIONES (continuación)');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...AZUL);
    let yy = 30;
    resto.forEach((ln) => {
      if (yy > 285) { pie(); doc.addPage(); cabecera('INFORMECAMPO CEREZAS — OBSERVACIONES (continuación)'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...AZUL); yy = 30; }
      doc.text(ln, 14, yy);
      yy += 3.8;
    });
    pie();
  }

  /* ---------- Anexo fotográfico: 2 fotos por página ---------- */
  const fotos = await fotosParaPdf(d.fotos);
  for (let i = 0; i < fotos.length; i++) {
    const pos = i % 2;
    if (pos === 0) {
      doc.addPage();
      cabecera('INFORMECAMPO CEREZAS — ANEXO FOTOGRÁFICO');
    }
    const f = fotos[i];
    const top = pos === 0 ? 27 : 157;
    const boxW = 186;
    const boxH = 118;
    const k = Math.min(boxW / f.w, boxH / f.h);
    const w = f.w * k;
    const h = f.h * k;
    doc.addImage(f.data, 'JPEG', 12 + (boxW - w) / 2, top + (boxH - h) / 2, w, h);
    doc.setDrawColor(200, 200, 200);
    doc.rect(12, top, boxW, boxH);
    doc.setDrawColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NEGRO);
    const cap = `Foto ${f.n}`;
    doc.text(cap, 12, top + boxH + 4, { baseline: 'middle' });
    if (f.nota) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...AZUL);
      doc.text(fit(`— ${f.nota}`, 170, 8), 12 + doc.getTextWidth(cap) + 2, top + boxH + 4, { baseline: 'middle' });
    }
    if (pos === 1 || i === fotos.length - 1) pie();
  }

  const fname = [
    'Informecampo_Cerezas',
    safeName(d.productor) || 'sin_productor',
    d.fecha || '',
    d.lote ? `L${safeName(d.lote)}` : ''
  ].filter(Boolean).join('_') + '.pdf';

  void num;
  return { blob: doc.output('blob'), filename: fname };
}

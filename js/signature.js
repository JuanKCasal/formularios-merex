// Firma con el dedo sobre un canvas. Guarda la firma como imagen PNG (data URL).

export function mountSignature(canvas, { value, onChange }) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let last = null;
  let dirty = false;

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#13235b';
    redraw();
  }

  function redraw() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(r.width / img.width, r.height / img.height);
        const w = img.width * s;
        const h = img.height * s;
        ctx.drawImage(img, (r.width - w) / 2, (r.height - h) / 2, w, h);
      };
      img.src = value;
    }
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    last = pos(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#13235b';
    ctx.fill();
    dirty = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    if (dirty) {
      value = exportTrimmed();
      onChange(value);
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Recorta los bordes en blanco para que la firma se vea bien en el PDF
  function exportTrimmed() {
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return '';
    const pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
    const out = document.createElement('canvas');
    const scale = Math.min(1, 600 / (maxX - minX));
    out.width = Math.round((maxX - minX) * scale);
    out.height = Math.round((maxY - minY) * scale);
    out.getContext('2d').drawImage(canvas, minX, minY, maxX - minX, maxY - minY, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();

  return {
    clear() {
      value = '';
      dirty = false;
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      onChange('');
    },
    destroy() { ro.disconnect(); }
  };
}

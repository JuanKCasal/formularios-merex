# CLAUDE.md — formularios-merex

Instrucciones para Claude al trabajar en este repositorio. **Al empezar una sesión, lee también `HANDOFF.md`** (estado actual y punto de partida).

## Qué es
Formularios web de control de calidad para **Merex** (agrícola), pensados para el teléfono del inspector. El primero es **Informecampo Cerezas**: se llena por secciones, calcula porcentajes, totales y tolerancias, adjunta fotos y genera un PDF que replica el formato impreso de Merex. Vendrán más formularios.

- Dueño: Juan (juankcasal). Cliente/usuaria principal: Francisca Bastías (QC Merex).
- En línea: https://juankcasal.github.io/formularios-merex/ (GitHub Pages desde `main` /).
- Repo: https://github.com/JuanKCasal/formularios-merex (público).
- Idioma: todo en **español** (código comentado, textos de la app, respuestas a Juan).

## Arquitectura
- Sitio **estático**, sin build ni dependencias: HTML + CSS + JavaScript con módulos ES. jsPDF 2.5.2 en `vendor/`.
- PWA: `sw.js` cachea todo (`ASSETS`) para uso sin señal.
- Sin login ni servidor. Datos solo en el teléfono:
  - informes en localStorage (`fm:rec:<id>`), ajustes en `fm:settings`;
  - fotos en IndexedDB (base `formularios-merex`, almacén `fotos`, índice `rec`).
- Rutas con `#`: `#/`, `#/f/<form>`, `#/f/<form>/<id>`, `#/ajustes`.

## Estructura
```
index.html, manifest.webmanifest, sw.js
css/app.css                     estilos (móvil primero)
js/app.js                       pantallas: inicio, lista, editor, ajustes (respaldo JSON)
js/engine.js                    motor genérico: dibuja campos desde el esquema y hace cálculos
js/storage.js                   localStorage
js/photos.js                    fotos: IndexedDB, compresión (1600 px JPEG), galería, datos para el PDF
js/signature.js, ui.js, util.js
js/forms/registry.js            lista de formularios
js/forms/cerezas/schema.js      secciones, newData, migrate (DATA_V)
js/forms/cerezas/fields.js      filas de cada tabla (color, calibres, condición, calidad, oxidada, FirmPro)
js/forms/cerezas/compute.js     totales, avisos, resumen, barra inferior, decorate (semáforo en pantalla)
js/forms/cerezas/tolerancias.js rangos "Bulk directo de huerto" y cruce filas→parámetros
js/forms/cerezas/pdf.js         PDF A4 (pág. 1 formato Merex, pág. 2 tolerancias y cierre, anexo fotos)
```

Tipos de campo del motor: text, date, time, number, seg, check3, heading, note, dist (cant/% sobre la muestra; `noTotal`, `totalLabel`; filas con `data-row="<k>.<id>"`), readings, counts, textarea, signature, summary, slot (lo llena el formulario), photos.

## Reglas al cambiar código
- **Versión**: en cada cambio publicable, subir `VERSION` en `sw.js` **y** `APP_VERSION` en `js/config.js`; si no, los teléfonos siguen con la versión en caché.
- **Archivos nuevos** → agregarlos a `ASSETS` de `sw.js`.
- **Compatibilidad de datos**: los informes viven en los teléfonos. Si se mueven/renombran claves, subir `DATA_V` en `schema.js` y adaptar en `migrate(d)` (se ejecuta al abrir el informe). Nunca romper borradores existentes.
- **Tolerancias**: rangos y equivalencias solo en `tolerancias.js`. Valor redondeado a 1 decimal; ≤a verde, ≤b amarillo, >b rojo; `pres` = rojo si >0; `min` (Brix) = rojo bajo el mínimo.
- **PDF**: textos fijos en negro, datos en azul; colores del semáforo iguales a la tabla Merex (verde 146,208,80 · amarillo 255,255,0 · rojo 255,0,0). Revisar que la pág. 1 no se desborde al agregar filas.
- Nuevo formulario: copiar `js/forms/cerezas/`, registrarlo en `js/forms/registry.js`, sumar sus archivos a `ASSETS`.
- Pendiente conocido: `codigo` y `revision` del documento Merex en `schema.js` (vacíos).

## Probar
- Local: `python -m http.server 8000` en la carpeta y abrir http://localhost:8000 (los módulos no funcionan con file://).
- Pruebas automáticas: Playwright (Python) con `devices['Pixel 7']` / `['iPhone 13']`, `service_workers='block'`; revisar errores de consola, descargar el PDF y mirarlo (pdftoppm). Datos de ejemplo de la hoja Merex: condición 20,8 · calidad 9,4 · suma 30,2 · exportable 69,8 (con el criterio v1.0, antes de mover Pitting a condición).

## Publicar (PowerShell, en C:\dev\formularios-merex)
1. Subir versiones (ver arriba).
2. `git add .` → `git commit -m "..."` → `git push`. GitHub Pages publica en 1–2 min.

## Forma de trabajo con Juan
- Responder en español.
- Cuando la sesión se alargue (muchos pasos, archivos grandes, o la conversación ya se resumió), al terminar el paso en curso: actualizar `HANDOFF.md` con el punto de partida exacto, recomendar abrir sesión nueva y preguntar si prefiere seguir. No empezar un bloque grande nuevo sin preguntar.
- Al cerrar un bloque de trabajo, actualizar `HANDOFF.md` (y el doc `claude/estado-y-handoff.md` del proyecto).

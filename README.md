# Formularios Merex

Formularios web de control de calidad para Merex, pensados para usarse en el teléfono.
El primero es **Informecampo Cerezas**: se llena por secciones, calcula los porcentajes y totales, y al terminar descarga o comparte un PDF que replica el formato impreso de Merex.

Publicado en: https://juankcasal.github.io/formularios-merex/

## Cómo funciona

- Es una página estática (HTML, CSS y JavaScript, sin servidor) publicada en GitHub Pages.
- **Funciona sin señal** una vez abierta: se puede instalar en el teléfono (Android: «Instalar app»; iPhone: Compartir → «Agregar a inicio»).
- **Los datos se guardan solo en el teléfono** (localStorage) a medida que se escribe. Los informes quedan como borradores y se retoman cuando se quiera.
- Sin usuarios ni claves. El nombre del inspector y las listas de productores, variedades y lotes se recuerdan en el teléfono.
- El PDF se genera en el propio teléfono con [jsPDF](https://github.com/parallax/jsPDF) (incluido en `vendor/`).
- En **Ajustes y respaldo** se puede descargar un respaldo JSON de todos los informes y restaurarlo en otro equipo.

> En iPhone, Safari puede borrar los datos de sitios que no se usan en 7 días. Instalar la app en la pantalla de inicio lo evita.

## Informecampo Cerezas

Secciones: Recepción · Temperatura y envase · Color · Calibres · Defectos de condición · Defectos de calidad · Firmeza y Brix · Observaciones y firma · Resumen y PDF.

Cálculos:

- Unidad de la muestra a elegir por informe: gramos o n° de frutos.
- % de cada fila = cantidad ÷ muestra × 100 (en color, calibres y defectos también se puede ingresar el % directo).
- Total condición, total calidad, suma total de defectos y **estimación exportable = 100 − suma**.
- Sutura y Pitting cuentan como defectos de calidad.
- Firmeza FirmPro: n° de frutos por categoría → %.
- Brix Dark y Light: varias lecturas con promedio.
- Avisos: distribución de color o calibres que no suma 100 %, defecto mayor que la muestra, datos faltantes.

**Pendiente:** los valores de *Código* y *Revisión* del documento Merex se completan en `js/forms/cerezas/schema.js` (`codigo` y `revision`).

## Estructura

```
index.html                  página única (rutas con #)
manifest.webmanifest        datos para instalar la app
sw.js                       service worker (uso sin conexión)
css/app.css                 estilos
js/app.js                   pantallas: inicio, lista, editor, ajustes
js/engine.js                motor genérico: dibuja campos desde el esquema y calcula
js/storage.js               guardado local
js/forms/registry.js        lista de formularios
js/forms/cerezas/           schema.js (campos), fields.js (filas), compute.js (totales y avisos), pdf.js
vendor/jspdf.umd.min.js     generador de PDF
img/, icons/                logo e íconos
```

## Agregar un formulario nuevo

1. Copiar `js/forms/cerezas/` a `js/forms/<nuevo>/` y ajustar campos, cálculos y PDF.
2. Registrarlo en `js/forms/registry.js`.
3. Sumar sus archivos a la lista `ASSETS` de `sw.js`.

## Publicar cambios

1. Subir la versión en `sw.js` (`VERSION`) y en `js/config.js` (`APP_VERSION`). Si no se sube, los teléfonos siguen usando la versión guardada.
2. `git add . && git commit -m "..." && git push`
3. GitHub Pages publica en uno o dos minutos. Los teléfonos se actualizan solos la próxima vez que abren la app con señal.

## Probar en el PC

Hace falta un servidor local (los módulos de JavaScript no funcionan abriendo el archivo directamente):

```
cd C:\dev\formularios-merex
python -m http.server 8000
```

y abrir http://localhost:8000

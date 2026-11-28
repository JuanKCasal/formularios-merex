# HANDOFF — formularios-merex

Última actualización: 2026-11-27

## Punto de partida exacto
- **v1.1.0 publicada** (commit `82f54aa`, 2026-11-27). Este CLAUDE.md y este HANDOFF.md se agregaron después y van en un commit aparte.
- Siguiente paso: probar en teléfonos reales (cámara, Compartir, firma) y mandar la versión a Francisca (QC Merex) para su revisión; confirmar con ella el cruce de parámetros y el criterio de "peor parámetro".

## Historial

### v1.0.0 — 2026-11-23 (publicada, commit `df2ddf1`)
- Informecampo Cerezas completo: inicio con menú de formularios, lista de informes (borradores / PDF generado, duplicar con mismo productor, eliminar), editor por pasos con barra de totales fija, ajustes (inspector, listas recordadas, respaldo/restaurar JSON).
- Guardado automático en localStorage; PWA sin conexión; PDF réplica del formato Merex con datos en azul; compartir con Web Share (o descarga).
- Probado con Playwright (Pixel 7 / iPhone 13) usando la hoja de ejemplo: condición 20,8 · calidad 9,4 · suma 30,2 · exportable 69,8.

### v1.1.0 — 2026-11-27 (publicada, commit `82f54aa`)
Pedido de Francisca Bastías por correo + tabla "Tolerancias Bulk Directo de Huerto" por WhatsApp.
- **Defectos**: Daño insecto, Pitting y Herida abierta → condición. Filas nuevas de la tabla: condición (desgarro pedicelar, exudación/colapsado, fruta sobre madura); calidad (contaminación/residuos/elem. extraños, insectos, pre-calibre, resto floral, falta de pruina). "Tierra / residuo" ahora se llama "Polvo / tierra" (misma clave `tierra`). Frutos pulpa oxidada en tabla aparte (`oxid`), no suma al total de condición.
- **Migración**: informes v1.0 mueven `calid.danoInsecto/pitting` → `cond.*` al abrirse (`migrate`, `DATA_V = 2`).
- **Tolerancias** (`tolerancias.js`): semáforo A/B/C (condición) y 1/2/3 (calidad) en filas, totales, barra inferior, tarjeta por sección, resumen y PDF (pág. 2 con la tabla completa).
  - Cruce acordado con Juan: partidura = lateral + apical + medialuna + por agua; machucón + machucón de hombros; pudrición + pudrición seca = "pudrición blanca/micelio"; deshidratación = fruta deshidratada; russet y cicatrices = russet + herida cicatrizada; pedicelo = frutos s/ pedicelo; polvo/tierra = tierra; frutos rojos = color "rojo claro"; frutos verdes = color "falta de color"; Brix = promedio de lecturas Dark + Light (<8 rojo).
  - Filas vacías cuentan como 0 si la tabla tiene datos.
  - Supuesto de Claude (confirmar con Merex): el resumen muestra el "peor parámetro" de cada grupo además del color del total.
- **Fotos** (`js/photos.js`): sección "Fotos", cámara o galería, máx. 12, comentario por foto; JPEG 1600 px en IndexedDB; anexo PDF 2 por página; incluidas en el respaldo JSON; se borran al eliminar el informe; no se copian al duplicar.
- **PDF**: pág. 1 formato Merex con semáforo; pág. 2 tolerancias + firmeza/Brix + observaciones + firma; después continuación de observaciones y anexo fotográfico (~1 MB con 3 fotos).
- Probado con Playwright (Pixel 7 / iPhone 13): migración, fotos, PDF lleno y vacío, observaciones largas, respaldo con fotos y borrado de fotos; sin errores de consola.

## Pendiente
- Código y Revisión del documento Merex → `js/forms/cerezas/schema.js` (`codigo`, `revision`).
- Probar en teléfonos reales (Android e iPhone): cámara, Compartir, firma, espacio para fotos.
- Confirmar con Merex el cruce de parámetros y el criterio de "peor parámetro".
- Próximos formularios de Merex (aún sin definir).

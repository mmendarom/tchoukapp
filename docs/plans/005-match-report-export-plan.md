# Plan 005 - Exportar reporte de partido

Spec relacionada: `docs/specs/005-match-report-export.md`

## Stage 1 - Documentacion y decision

- Crear spec 005.
- Crear plan 005.
- Crear decision record para formato PDF y dependencias.
- Actualizar implementation log al finalizar.

## Stage 2 - Dependencias

- Instalar con Expo:
  - `expo-print`
  - `expo-sharing`
- No instalar dependencia de imagen/captura en esta version.

## Stage 3 - Datos puros del reporte

- Crear `src/domain/reportData.ts`.
- Construir `buildMatchReportData(match, players)`.
- Incluir:
  - encabezado.
  - score final y por tiempo.
  - secciones por periodo.
  - totales.
  - zonas agrupadas.
  - formacion inicial/final.
  - cambios.
  - notas.
- Usar funciones existentes de `periodStats`, `court` e `insights`.
- Mantener fallbacks seguros.

## Stage 4 - HTML y texto compartible

- Crear `src/export/reportHtml.ts`.
- Crear `buildMatchReportHtml(reportData)`.
- Crear `buildMatchReportText(reportData)` como fallback.
- Mantener labels en espanol y evitar enums raw.

## Stage 5 - Integracion PDF/share

- Crear `src/export/exportMatchReport.ts`.
- Usar `Print.printToFileAsync({ html })`.
- Usar `Sharing.isAvailableAsync()` y `Sharing.shareAsync(uri)` si esta disponible.
- Devolver resultado estructurado para que la UI pueda mostrar feedback.
- Si falla PDF/share, dejar que UI use `buildMatchReportText` con `Share.share`.

## Stage 6 - UI

- Actualizar `FinalSummaryScreen`.
- Agregar boton `Exportar reporte PDF`.
- Agregar boton `Compartir resumen`.
- Agregar estado:
  - `Generando reporte...`
  - `Reporte generado`
  - `No se pudo generar el reporte`
- No cambiar otras secciones del resumen.

## Stage 7 - Tests

- Agregar tests para `reportData`.
- Agregar tests para HTML/texto.
- Cubrir score, puntos en contra, puntos en contra rival, stats, cambios, lineups, fallbacks y labels sin enums raw.

## Stage 8 - Validacion

- Ejecutar `npm test`.
- Ejecutar `npx tsc --noEmit`.
- Actualizar log con resultados.

## Report Export v2 - Plan

Estado: Implemented.

### Objetivo v2

Convertir el export post-partido en un reporte de coaching mas util, con resumen ejecutivo, separacion clara por tiempo, totales completos, mapas visuales exportables y fallback textual mas corto para compartir.

### Stage 1 - Data builder v2

- [x] Evolucionar `src/domain/reportData.ts`.
- Mantener `buildMatchReportData(match, players)` como API principal o versionarla de forma compatible.
- Separar internamente:
  - `buildPeriodReportData`.
  - `buildTotalReportData`.
  - `getReportExecutiveSummary`.
  - `getReportLocationMapsByPeriod`.
  - `getReportTotalLocationMaps`.
- [x] Incluir en data:
  - score final.
  - score por tiempo.
  - stats por cada tiempo.
  - totales del partido.
  - puntos por jugador por tiempo.
  - puntos por jugador total.
  - defensas Uruguay.
  - defensas rival.
  - faltas.
  - puntos en contra.
  - puntos en contra rival.
  - errores totales.
  - sustituciones.
  - intercambios en cancha.
  - formacion inicial y final.
  - insights por tiempo y generales.
  - datasets de mapas por tiempo y totales.
- Tests primero para `reportData`.

### Stage 2 - HTML layout v2

- [x] Evolucionar `src/export/reportHtml.ts`.
- Crear helpers:
  - `renderReportStatTable`.
  - `renderReportSection`.
  - `renderExecutiveSummary`.
  - `renderPeriodSection`.
  - `renderTotalsSection`.
- [x] Mejorar jerarquia:
  - portada.
  - resumen ejecutivo.
  - tiempos.
  - totales.
  - formaciones/notas.
- Mantener labels en espanol.
- Evitar enums crudos.
- Tests de HTML para estructura y labels.

### Stage 3 - Mapas PDF con inline SVG

- [x] Implementar `renderReportCourtMap` en `src/export/reportHtml.ts` o archivo helper dentro de `src/export`.
- [x] Usar SVG inline con coordenadas normalizadas.
- [x] Renderizar:
  - puntos Uruguay.
  - puntos rival.
  - defensas rival.
- Crear mapas por tiempo y total.
- [x] Excluir:
  - eventos sin ubicacion.
  - `Punto en contra`.
  - `Punto en contra rival`.
- Usar puntos con tamano/opacidad por densidad cercana como heatmap liviano.
- [x] No usar componentes React Native para PDF.
- [x] No agregar dependencias.
- [x] Tests de HTML del mapa:
  - incluye `<svg`.
  - incluye cantidad esperada de puntos.
  - no incluye eventos sin ubicacion.

#### Refinamiento - mapas PDF grandes

Estado: Implemented.

- [x] Reemplazar el layout de mapas de 3 columnas por una pila vertical `map-stack`.
- [x] Renderizar cada mapa como tarjeta full-width.
- [x] Usar viewBox SVG grande `640x360`.
- [x] Fijar altura visual de cancha en PDF cerca de `260px`.
- [x] Envolver `Mapas del tiempo` y `Mapas totales` con `report-map-section`.
- [x] Usar `break-inside` y `page-break-inside` para reducir titulos huerfanos y cortes de tarjetas.
- [x] Agrandar levemente marcadores y diferenciarlos por color:
  - puntos nuestros azul;
  - puntos rivales rojo;
  - defensas rivales violeta.
- [x] Mantener intactos `landingLocation`, `defenseLocation` y el modelo de coordenadas normalizadas.
- [x] Tests de HTML:
  - contiene `map-stack` y `report-map-section`;
  - usa viewBox `640x360`;
  - no usa la clase vieja `map-grid`;
  - no genera `NaN` ni `undefined` en coordenadas.

### Stage 4 - Fallback textual v2

- [x] Evolucionar `buildMatchReportText`.
- [x] Mantenerlo corto para WhatsApp.
- [x] Incluir:
  - resultado final.
  - resultado por tiempos.
  - top 3 goleadores.
  - top defensas.
  - errores principales.
  - puntos en contra.
  - puntos en contra rival.
  - zonas principales.
  - 2 o 3 insights.
- Tests para contenido clave y ausencia de enums crudos.

### Stage 5 - Integracion y QA

- [x] Mantener `src/export/exportMatchReport.ts` sin logica de datos.
- [x] `FinalSummaryScreen` solo llama acciones de export/share.
- [ ] Validar PDF real en Expo Go.
- [x] Actualizar docs y implementation log.

### Tests v2 a agregar

- Reporte incluye 3 tiempos separados.
- Reporte incluye total match summary.
- Score final correcto.
- Score por tiempo correcto.
- `Punto en contra` afecta score rival.
- `Punto en contra rival` afecta score Uruguay.
- Puntos por jugador por tiempo correctos.
- Puntos por jugador total correctos.
- `Punto en contra rival` no cuenta como punto de jugador.
- Mapa Uruguay incluye solo puntos Uruguay con `landingLocation`.
- Mapa rival incluye solo puntos rival con `landingLocation`.
- Mapa defensas rival incluye solo `opponent_defense` con `defenseLocation`.
- Eventos sin ubicacion no crashean.
- Formaciones, sustituciones e intercambios aparecen.
- Defensas, faltas y puntos en contra aparecen.
- HTML incluye secciones de mapas.
- Texto fallback incluye stats clave.
- HTML/texto no contienen enums raw.

### QA manual v2

- Finalizar un partido con datos en los 3 tiempos.
- Incluir puntos por distintos jugadores.
- Incluir puntos rival.
- Incluir `Punto en contra`.
- Incluir `Punto en contra rival`.
- Incluir defensas Uruguay.
- Incluir defensas rival con ubicacion.
- Incluir faltas.
- Incluir sustituciones.
- Incluir intercambios en cancha.
- Exportar PDF.
- Verificar cada tiempo.
- Verificar totales.
- Verificar mapas.
- Verificar que los puntos del mapa coinciden razonablemente.
- Verificar que no hay enums crudos.
- Verificar legibilidad en telefono.
- Compartir por WhatsApp/Drive/email si esta disponible.
- Probar partido con pocos datos.

## Riesgos / detenerse si

- `expo install` no encuentra versiones compatibles para SDK 54.
- El import nativo rompe tests de Node.
- El PDF requiere una API no disponible en Expo Go.
- La UI de resumen final queda demasiado cargada.
- El HTML SVG no se renderiza bien en `expo-print` en algun dispositivo.
- El reporte se vuelve demasiado largo para compartir.

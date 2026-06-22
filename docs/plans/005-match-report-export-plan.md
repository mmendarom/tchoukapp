# Plan 005 - Exportar reporte de partido

## Report Export v3

1. Extender `MatchReportData` con rendimiento por jugador, top ataque/defensa y sectores tacticos por tiempo.
2. Derivar todos los datos desde helpers de dominio existentes, preservando reglas de efectividad y compatibilidad legacy.
3. Renderizar resumen ejecutivo, secciones por tiempo y totales con barras CSS print-friendly.
4. Hacer explicitos `Lectura del tiempo`, `Lectura final`, sectores vulnerables y sectores donde nos defendieron.
5. Compactar el texto compartible con score, tops, efectividad y sectores principales.
6. Agregar regresiones de datos, HTML, labels tacticos y eventos antiguos.
7. Ejecutar `npm test`, `npx tsc --noEmit` y `git diff --check`.

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

### Stage 3 - Mapas PDF print-safe

- [x] Implementar `renderReportCourtMap` en `src/export/reportHtml.ts` o archivo helper dentro de `src/export`.
- [x] Usar HTML/CSS print-safe con coordenadas normalizadas.
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
- [x] No reintroducir SVG para Expo Print.
- [x] No agregar dependencias.
- [x] Tests de HTML del mapa:
  - incluye `report-court-map`.
  - incluye cantidad esperada de puntos.
  - no incluye eventos sin ubicacion.

#### Refinamiento - mapas PDF grandes

Estado: Implemented.

- [x] Reemplazar el layout de mapas de 3 columnas por una pila vertical `map-stack`.
- [x] Renderizar cada mapa como tarjeta full-width.
- [x] Usar cancha HTML/CSS full-width con proporcion compartida.
- [x] Fijar altura visual desde `COURT_VISUAL_GEOMETRY.reportMapHeightPx`.
- [x] Envolver `Mapas del tiempo` y `Mapas totales` con `report-map-section`.
- [x] Usar `break-inside` y `page-break-inside` para reducir titulos huerfanos y cortes de tarjetas.
- [x] Agrandar levemente marcadores y diferenciarlos por color:
  - puntos nuestros azul;
  - puntos rivales rojo;
  - defensas rivales violeta.
- [x] Mantener intactos `landingLocation`, `defenseLocation` y el modelo de coordenadas normalizadas.
- [x] Tests de HTML:
  - contiene `map-stack` y `report-map-section`;
  - usa `report-court-map`;
  - no usa la clase vieja `map-grid`;
  - no usa SVG;
  - no genera `NaN` ni `undefined` en coordenadas.

#### Refinamiento - mapas PDF print-safe

Estado: Implemented.

- [x] Reemplazar el renderer SVG inline por una cancha HTML/CSS especifica para reporte.
- [x] Usar `report-court-map` con ancho 100%, alto fijo y `min-height`.
- [x] Dibujar cancha con CSS:
  - fondo visible;
  - borde;
  - linea central;
  - areas laterales aproximadas;
  - frames izquierdo/derecho.
- [x] Renderizar marcadores como `report-map-point` con posicion absoluta.
- [x] Guardar coordenadas normalizadas en `data-normalized-x/y` para test/debug.
- [x] Mantener colores print-safe y `print-color-adjust: exact`.
- [x] Mantener intactos `landingLocation`, `defenseLocation`, mapas de app y sectores tacticos.
- [x] Tests de HTML:
  - contiene `report-court-map`;
  - contiene `report-map-point`;
  - contiene coordenadas normalizadas;
  - no depende de `<svg`;
  - muestra `Sin ubicaciones registradas.` cuando no hay datos.

#### Refinamiento - geometria PDF compartida con CourtMapInput

Estado: Implemented.

- [x] Centralizar valores visuales de cancha en `src/domain/courtVisual.ts`.
- [x] Actualizar `CourtField` para consumir esos valores sin modificar la apariencia de `CourtMapInput`.
- [x] Actualizar `reportHtml` para dibujar la cancha PDF con los mismos porcentajes de carriles, areas de marco, guias horizontales y areas prohibidas.
- [x] Eliminar offsets artificiales de marcadores PDF; las ubicaciones usan `x * 100` y `y * 100`.
- [x] Mantener `data-normalized-x/y` para validar la correspondencia entre punto registrado y punto exportado.
- [x] Mantener HTML/CSS print-safe para Expo Print y `print-color-adjust: exact`.
- [x] No cambiar coordenadas persistidas, sectores tacticos, eventos ni mapas interactivos de la app.
- [x] Tests de HTML:
  - el CSS del reporte contiene valores derivados de `COURT_VISUAL_GEOMETRY`;
  - los marcadores usan coordenadas normalizadas directas;
  - no aparecen etiquetas de grados ni SVG.

#### Refinamiento - estabilizacion post-merge de proporcion PDF

Estado: Implemented.

- [x] Auditar hardcodes post-merge en `CourtField`, `CourtMapInput`, `CourtLocationMap`, `CourtMapSummary` y `reportHtml`.
- [x] Confirmar que la regresion no estaba en datos ni sectores, sino en la geometria visual del contenedor PDF.
- [x] Mover el ratio visual de `CourtMapInput` a `COURT_VISUAL_GEOMETRY.inputHeightToWindowWidthRatio`.
- [x] Mover ancho/alto objetivo de mapa PDF a `COURT_VISUAL_GEOMETRY.reportMapWidthPx` y `reportMapHeightPx`.
- [x] Reemplazar el alto fijo `260px` del PDF por constantes compartidas.
- [x] Mantener PDF HTML/CSS print-safe, sin SVG, sin guias de grado y con marcadores por `data-normalized-x/y`.
- [x] Agregar test de guardia para evitar que `CourtField` o `reportHtml` vuelvan a hardcodear geometria divergente.

#### Refinamiento - unificacion completa de geometria de cancha

Estado: Implemented.

- [x] Centralizar en `src/domain/courtVisual.ts`:
  - geometria visual de areas, carriles y semicirculos;
  - relacion/altura de `CourtMapInput`;
  - alturas por defecto de mapas in-app de resumen;
  - alturas de mapas live;
  - ancho/alto objetivo de mapas PDF.
- [x] Actualizar `CourtField`, `CourtMapInput`, `CourtLocationMap`, `CourtMapSummary`, `LiveMapPanel` y `reportHtml` para consumir la misma fuente visual.
- [x] Eliminar calculos duplicados de altura en `CourtMapSummary`.
- [x] Mantener guias de grado solo en el input tactil.
- [x] Mantener coordenadas normalizadas directas (`x * 100`, `y * 100`) en app y PDF.
- [x] Agregar tests de helper y guardias contra hardcodes divergentes en renderers activos.
- [x] No cambiar coordenadas persistidas, sectores tacticos, eventos, scoring ni dependencias.

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

## Stage 6 - Report Export v3.1 visual digest

Estado: implementado el 2026-06-20; QA de PDF nativo pendiente.

1. Reemplazar las barras absolutas por pistas simples print-safe con altura, fondo y anchos inline explicitos.
2. Ordenar y limitar visualmente ataque/defensa a 7 filas, manteniendo fallback textual y contador de filas restantes.
3. Crear helpers puros de presentacion en `reportHtml.ts` para priorizar y compactar lecturas sin modificar recomendaciones live.
4. Limitar highlights a 3 ejecutivos, 5 por tiempo y 6 finales; relegar baja participacion cuando haya alertas mas utiles.
5. Renderizar sectores top 5 con barras de conteo y counts alineados.
6. Reequilibrar resumen ejecutivo y aplicar reglas de paginacion print-safe.
7. Compactar texto compartible a score, tops, efectividad y sectores principales.
8. Actualizar tests de HTML/texto, documentar QA manual y validar `npm test`, `npx tsc --noEmit`, `git diff --check`.

## Stage 6.1 - Categoria y ranking consistente

Estado: implementado el 2026-06-20; QA manual de PDF pendiente.

1. Derivar nombre visible Uruguay + plantel en `reportData` y usarlo en `matchLabel`/resultado ejecutivo.
2. Corregir ranking de efectividad a goles, intentos, efectividad, menos errados y nombre.
3. Entregar `performance.rows` en orden ofensivo principal y ordenar la tarjeta defensiva por defensas/share.
4. Normalizar listas de stats negativas y sectores a conteo descendente.
5. Cubrir categoria/fallback y casos `8/11` vs `1/1` en tests.

## Stage 6.2 - Nombre visible del equipo propio

Estado: implementado el 2026-06-20; QA manual de PDF nativo pendiente.

1. Crear helper puro `getOwnTeamDisplayName`/`getMatchupDisplayName` con fallback `Equipo`.
2. Agregar `ownTeamName` a `MatchReportData` sin cambiar datos persistidos.
3. Parametrizar scores, stats y vacios del HTML/texto con el nombre propio.
4. Cubrir `Mayores`, `+40` y match legacy sin `teamPoolName`.
5. Reutilizar el helper en pantallas de partido y usar labels genericos en acciones compactas.

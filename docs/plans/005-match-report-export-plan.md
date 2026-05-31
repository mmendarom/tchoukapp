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

## Riesgos / detenerse si

- `expo install` no encuentra versiones compatibles para SDK 54.
- El import nativo rompe tests de Node.
- El PDF requiere una API no disponible en Expo Go.
- La UI de resumen final queda demasiado cargada.

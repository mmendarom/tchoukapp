# Plan 017 - Práctica 3v3: falta marco, PDF sin huecos y barras por % de goles

Derivado de `docs/specs/017-training-3v3-marco-pdf-goal-bars.md`.

## Stage 1 - Falta "marco"

- `src/domain/training.ts`: `TrainingErrorSubtype` suma `'frame'`.
- `src/domain/trainingLive.ts`: `formatTrainingEventLabel` devuelve "tiró al marco" para `frame`.
- `src/screens/LiveTrainingMiniMatchScreen.tsx`: botón "Marco" en el modal de error (`recordErrorSubtype('frame')`, `errorType` queda `other`).

## Stage 2 - PDF sin huecos

- `src/export/trainingReportHtml.ts`: sacar `page-break-inside: avoid` de `.section` para que las secciones fluyan entre páginas; agregar `break-inside: avoid` a los bloques atómicos que faltan (summary-card, team-card, mini-card, bar-row, filas de alertas) y `break-after: avoid` a los `h2` para no dejar títulos huérfanos. Se mantienen los avoid ya existentes en performance-card, map-card, sector-card y player-detail-page.

## Stage 3 - Barras por % de goles

- `src/domain/trainingPerformance.ts`: `TrainingPerformanceAttackRow.pointShare = totalPoints > 0 ? points / totalPoints : 0`.
- `src/domain/trainingReportData.ts`: `TrainingReportPlayerDetail.pointShare` desde la fila de ataque.
- `src/components/TrainingPerformanceBars.tsx`: la barra de ataque usa `pointShare`; el texto suma el % de goles.
- `src/export/trainingReportHtml.ts`: `renderAttackRow` y la barra de ataque del detalle por jugador usan `pointShare`.

## Stage 4 - Tests y docs

- `src/domain/trainingPerformance.test.ts`: `pointShare`.
- `src/domain/trainingLive.test.ts` (nuevo): etiqueta de `frame`.
- `src/export/trainingReportHtml.test.ts`: paginación de `.section` y barra por share de goles.
- `docs/implementation-log.md` + `docs/decisions` si corresponde.
- `npx tsc --noEmit` + `npm test`.

## Riesgos

- Cambiar la semántica de la barra de ataque puede confundir a quien ya se acostumbró a la anterior; se mitiga con el texto explícito de goles.

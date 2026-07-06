# Plan 019 - PDF partido vs rival: paridad 3v3 y detalle por jugador

Derivado de `docs/specs/019-match-pdf-paridad-3v3-detalle-jugador.md`.

## Stage 1 - Datos

- `src/domain/reportData.ts`: `ReportPlayerDetail` + `MatchReportData.playerDetails` (participantes = lineup + eventos; orden por aporte ofensivo; errores/faltas por jugador; ubicaciones individuales desde `getPointEventsWithLocation` y `getOpponentDefenseEventsWithLocation`).

## Stage 2 - PDF

- `src/export/reportHtml.ts`:
  - Barra de ataque: ancho por `attackShare` + texto "% de los goles"; leyenda actualizada; se elimina el `attempt-bar` anidado.
  - Paginación: sacar `break-inside/page-break-inside: avoid` de `.report-map-section`, `.performance-grid`, `.executive-section` y `.tactical-sectors` (los hijos chicos ya son atómicos).
  - Nueva sección "Detalle por jugador": página por jugador (métricas, barras, mapas `renderReportCourtMap` de convertidos y atajados).

## Stage 3 - Barras in-app

- `src/components/PlayerPerformanceBars.tsx`: barra de ataque por `pointShare` (share directo), sin barra de tiros; texto "NN% de los goles".

## Stage 4 - Tests y docs

- `reportData.test.ts` + `reportHtml.test.ts`; `docs/implementation-log.md`; `npx tsc --noEmit` + `npm test`.

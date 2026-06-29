# Plan 013 - Estadística 7v7 (partido entre dos cuadros)

Spec relacionada: `docs/specs/013-cross-team-7v7-stats.md`

Estado: Draft - Stage 0 (planning docs-only). Sin código productivo todavía.

## Objetivo del plan

Implementar en etapas un modo nuevo `Estadística 7v7` para registrar un partido entre dos cuadros cualesquiera y derivar estadísticas simétricas de ambos equipos, reusando componentes puros existentes (geometría de cancha, sectores tácticos, patrón de efectividad) sin tocar el modo formal, `Practica 3v3` ni `Modo Entrenamiento`.

## Decisión principal propuesta

Crear un **modelo y store separados y simétricos**:

- `StatsMatch`, `StatsTeam`, `StatsMatchSettings`, `StatsMatchEvent`.
- Store `useStatsMatchStore` con key persistida propia `STORAGE_KEYS.statsMatchState`.

No reutilizar `Match`/`MatchEvent`.

Motivo (igual que el precedente de `Practica 3v3` en `docs/implementation-log.md`):

- `Match` asume Uruguay vs rival anónimo, 7 titulares fijos, 3 tiempos fijos, `Score = { uruguay, opponent }` y reportes formales.
- Este modo necesita dos equipos completos y simétricos, formato configurable y reportes propios.
- Aislar evita contaminar scoring, eventos, mapas y PDF formales.

## Reuso explícito (no duplicar)

- `src/domain/courtVisual.ts`: geometría compartida de la cancha de dos marcos.
- `src/components/CourtField.tsx`, `CourtMapInput.tsx`, `CourtLocationMap.tsx`: render e input de ubicación full-court.
- `src/domain/court.ts` (`deriveTacticalCourtSector`): sectores por ángulo en ambos marcos.
- Patrón de `src/domain/playerPerformance.ts`: efectividad/rendimiento, generalizado a dos equipos (no importar la versión atada a `uruguay`).
- Patrón event-sourcing + undo de `useMatchStore` / `useTrainingStore`.
- Patrón de export de `src/export/exportTrainingReport.ts` + `trainingReportHtml.ts` (PDF separado, Expo Print/Sharing).
- Patrón de backup aditivo de `src/domain/backup.ts`.

## Etapas sugeridas

### Stage 0 - Planning / docs only

Estado: Tarea actual.

- Crear spec `013`.
- Crear plan `013`.
- Actualizar `docs/implementation-log.md`.
- No tocar código productivo.

### Stage 1 - Domain model y store

Objetivo: tipos y acciones base sin UI compleja.

Archivos probables:

- `src/domain/statsMatch.ts` (tipos, validaciones, helpers de score y stats).
- `src/store/useStatsMatchStore.ts`.
- `src/storage/asyncStorage.ts` (agregar `STORAGE_KEYS.statsMatchState`).
- `src/domain/statsMatch.test.ts`.
- `src/store/useStatsMatchStore.test.ts`.

Acciones:

- `createStatsMatch(input)`;
- `updateStatsMatchSetup(id, patch)` (solo antes de iniciar);
- `startStatsMatch(id)` / `startPeriod` / `finishPeriod`;
- `recordStatsEvent(id, eventInput)`;
- `undoLastStatsEvent(id)`;
- `finishStatsMatch(id)` / `cancelStatsMatch(id)`;
- `archiveStatsMatch` / `unarchiveStatsMatch` / `deleteStatsMatch`;
- `resetStatsMatchData()`.

Reglas:

- dos equipos distintos con `playersPerTeam` jugadores válidos;
- score derivado de eventos por `teamId`;
- `point` suma al equipo del evento; `own_point_against` suma al rival;
- `shot_defended`, `defense`, `error` no cambian score;
- `undo` recalcula score/estado;
- formato configurable con defaults 7 / 3×15.

Tests: crear válido/inválido, registrar punto en ambos equipos, intentos/efectividad, undo, persistencia, rehidratación.

Notas:

- Store separado; no tocar `useMatchStore` ni `useTrainingStore`.
- Backup se difiere a Stage 6.

### Stage 2 - Setup UI

Objetivo: crear partido desde Home.

Archivos probables:

- `src/screens/HomeScreen.tsx` (tarjeta `Estadística 7v7` bajo `Partido`).
- `src/screens/StatsMatchesScreen.tsx` (lista + setup).
- `src/domain/statsMatchSetup.ts` + test.
- `src/utils/navigation.ts`, `App.tsx`.

Flujo:

1. Home → `Partido` → `Estadística 7v7`.
2. Elegir cuadro local y visitante (planteles precargados), con categoría opcional.
3. Ajustar convocados de cada cuadro (editable antes de arrancar).
4. Confirmar formato (jugadores por equipo, tiempos) con defaults.
5. Elegir titulares iniciales de cada equipo.
6. Crear partido `draft`.

Validaciones visibles (español):

- `Elegí dos cuadros distintos.`
- `Cada cuadro necesita al menos N jugadores.`
- `Seleccioná los titulares de cada equipo.`
- `No se pudo crear el partido.`

Decisión cerrada: los cuadros ajenos se cargan como `TeamPool` reutilizables; se reusa `Gestionar planteles` para crearlos/editarlos y este modo solo los selecciona y ajusta convocados antes de arrancar.

### Stage 3 - Live tracking

Objetivo: pantalla de registro rápida, jugador-céntrica, con cancha de dos marcos.

Archivos probables:

- `src/screens/LiveStatsMatchScreen.tsx`.
- `src/domain/statsMatchLive.ts` + test.
- reuso de `CourtField`/`CourtMapInput`.

Flujo:

- tocar jugador del equipo → menú `Punto`, `Lo atajaron`, `Defensa`, `Error`;
- `Punto` abre cancha de dos marcos y registra ubicación;
- `Lo atajaron` marca ubicación y exige defensor rival (obligatorio);
- `Error` ofrece Pérdida de pelota, Tiro errado, Se les cae/mal rebote, Invasión/zona, Pisa la línea y Punto en contra (+1 rival);
- `Deshacer` revierte último evento;
- cerrar tiempo cuando se cumple.

Notas:

- No priorizar stats en vivo: el valor está en el resumen.
- Mantener acciones grandes y tappables (teléfono y tablet).

### Stage 4 - Resumen por tiempo y final

Objetivo: lectura de valor de ambos equipos.

Archivos probables:

- `src/domain/statsMatchReportData.ts` (builder puro) + test.
- `src/screens/StatsPeriodSummaryScreen.tsx`, `StatsFinalSummaryScreen.tsx` (o secciones en lista/detalle).
- reuso de `CourtLocationMap`/`CourtMapSummary` para mapas.

Contenido por equipo:

- dónde tiró (mapa de tiros) y quién tiró;
- dónde defendió (mapa de defensas);
- destacados de ataque y defensa;
- zonas flojas: dónde pierde la pelota y dónde le anotan/defienden.
- Solo información estadística; sin recomendaciones tácticas (no se reusa `liveRecommendations`).

### Stage 5 - Export PDF y persistencia de re-export

Objetivo: PDF compartible y reabrible.

Archivos probables:

- `src/export/statsMatchReportHtml.ts` (HTML print-safe propio).
- `src/export/exportStatsMatchReport.ts` (Expo Print/Sharing).
- acción `Exportar PDF` en resumen/detalle.

Reglas:

- mapas PDF usan `COURT_VISUAL_GEOMETRY` para coincidir con la captura;
- el partido persistido permite re-exportar en sesiones futuras;
- no tocar `reportHtml.ts` formal ni `trainingReportHtml.ts`.

### Stage 6 - Backup/import

Objetivo: durabilidad y portabilidad.

Archivos probables:

- `src/domain/backup.ts` (agregar `statsMatches`, aditivo).
- `src/screens/HomeScreen.tsx` (conteo y restore).

Reglas:

- introduce `backupVersion: 3` con `statsMatches`; import acepta v1/v2/v3;
- import tolera backups sin `statsMatches` (lista vacía);
- restore reemplaza y normaliza;
- no romper backups v1/v2 existentes.

## Estrategia de test

- Dominio puro primero: score, intentos, efectividad, sectores, undo.
- Store/persistencia después: crear/editar, eventos, rehidratación, migración de backup.
- UI con QA manual; extraer helpers testeables.

## Riesgos

- Acoplar accidentalmente con `Match`/`MatchEvent` y contaminar reportes formales: evitar con modelo separado.
- Duplicar geometría de cancha si no se consume `courtVisual`.
- Validaciones de formato configurable mal cubiertas: testear bordes (jugadores por equipo variable, tiempos).
- Rosters ajenos vs jugadores globales: decidir snapshot vs referencia en Stage 2.

## Decisiones resueltas (cerradas antes de Stage 1)

- Cuadros ajenos: `TeamPool` reutilizables (se reusa `Gestionar planteles`).
- `category`: metadata libre (texto).
- Marco de tiro: inferido por zona desde `landingLocation`, sin campo de marco por evento.
- Tipos de error/pérdida: `turnover`, `missed_frame`, `bad_rebound`, `forbidden_zone`, `line_step` y `own_point_against` (solo este último suma al rival).
- `shot_defended`: defensor obligatorio (`defenderPlayerId` + `defendingTeamId` siempre presentes).
- Resumen por tiempo/final: solo estadística, sin recomendaciones tácticas.
- Backup: versión nueva `v3` con `statsMatches`.

## Criterios de salida del MVP

- Crear un partido entre dos cuadros desde Home bajo `Partido`.
- Ajustar convocados antes de arrancar.
- Registrar eventos de ambos equipos con deshacer.
- Ver resumen por tiempo y final con mapas y rendimiento por equipo.
- Exportar PDF y reabrir el partido para re-exportar.
- Stats derivadas de eventos.
- Persistencia local y backup funcionando.
- Modo formal y modos de entrenamiento intactos.
- Tests de dominio/store pasan; `npx tsc --noEmit` pasa.

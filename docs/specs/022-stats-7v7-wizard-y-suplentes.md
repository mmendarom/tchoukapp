# Spec 022 - Estadística 7v7: armado por pasos y titulares/suplentes con cambios

## Estado

Implemented

## Contexto

`Estadística 7v7` (spec 013) permite registrar un partido entre dos cuadros y
analizar a ambos. Con los planteles rivales del torneo (spec 020) un cuadro puede
tener ~20 convocados, y la pantalla en vivo mostraba a **todos** los jugadores de
cada equipo en una grilla, volviendo lento y confuso encontrar a cada uno. Además
el armado del partido era un scroll largo, menos claro que el flujo por pasos que
ya tiene la Práctica 3v3.

## Problema

- El setup del 7v7 no es guiado: cuadros, formato y convocados en una sola
  pantalla larga.
- En vivo, con 20 jugadores por equipo, la grilla es enorme e incómoda para
  anotar acciones rápido.

## Objetivos

- Rediseñar el armado del partido como **asistente por pasos** (etapas), más
  intuitivo, al estilo del 3v3.
- Permitir elegir **titulares** (en cancha) y **suplentes** (banca) entre los
  convocados.
- En vivo, mostrar en la grilla **solo los titulares/en cancha** y permitir
  **cambios** (entra un suplente por uno que sale) sin frenar el registro.

## No objetivos

- No se cambian scoring, tipos de evento ni el cálculo de estadísticas (siguen
  derivándose de las acciones; los cambios no generan eventos ni afectan stats).
- No se agrega rotación automática ni historial de lineups por jugada.
- No se toca el flujo formal de Uruguay ni el 3v3.

## Usuarios / Casos de uso

Cuerpo técnico durante el torneo: arma un 7v7 rival vs rival (o Uruguay vs rival)
por pasos, define titulares, y durante el partido mete suplentes con un botón sin
perderse entre 20 jugadores.

## Flujo esperado

Asistente "Nuevo partido" con barra de progreso (5 pasos):

1. **Cuadros**: elegir local y visitante (planteles del store).
2. **Formato**: jugadores por equipo, cantidad de tiempos, minutos.
3. **Titulares (Local)**: sobre el plantel del cuadro, tocar para marcar titular
   (★, en cancha) o suplente; contador `Titulares X/N`. Atajos: Convocar todos /
   Titulares: primeros N / Limpiar. Categoría opcional.
4. **Titulares (Visitante)**: ídem.
5. **Confirmar**: resumen (titulares y suplentes de cada cuadro, formato) →
   Crear partido.

En vivo: cada equipo muestra solo los que están en cancha + `N en cancha`. Botón
**⇄ Cambios (banca N)** abre un modal para elegir quién sale (cancha) y quién
entra (banca) y confirmar. El defensor en "lo atajaron" se elige entre los que
están en cancha del equipo que defiende.

## Requisitos funcionales

- Setup por pasos con validación por etapa (cuadros distintos; convocados ≥ N;
  exactamente N titulares).
- Al elegir un cuadro, se precargan todos como convocados y los primeros N como
  titulares (editable).
- Cambios válidos: el que entra está en la banca (convocado, no en cancha) y el
  que sale está en cancha.

## Impacto en modelo de datos

- `StatsTeam.starterIds?: string[]`: titulares elegidos en el setup.
- `StatsMatch.lineups?: Record<teamId, string[]>`: en cancha actual por equipo;
  se inicializa desde los titulares y se muta con los cambios.
- Helpers en `statsMatch.ts`: `resolveStatsStarters`, `resolveStatsMatchLineups`,
  `getStatsTeamOnCourt`, `applyStatsSubstitution`; validación de titulares en
  `validateStatsMatchSetup`.
- `statsMatchLive.ts`: `getStatsOnCourtPlayers`, `getStatsBenchPlayers`.

## Impacto en UI

- `StatsMatchesScreen`: "Nuevo partido" pasa a asistente por pasos con titulares.
- `LiveStatsMatchScreen`: grilla = en cancha; botón Cambios + modal de
  sustitución; defensor desde los que están en cancha.

## Impacto en estado/persistencia

- `useStatsMatchStore`: `createStatsMatch`/`updateStatsMatchSetup` inicializan
  `lineups`; nueva acción `substituteStatsPlayer`; `normalizeStatsMatch` deriva
  `lineups`. `STATS_MATCH_STORE_DATA_VERSION` 1 → 2 (migración normaliza los
  partidos existentes: lineup = primeros N).

## Testing plan

- `statsMatch.test.ts`: `resolveStatsStarters` (con/ sin titulares, plantel
  chico, ids inválidos), `resolveStatsMatchLineups` (init y lineup guardado
  válido), `getStatsTeamOnCourt`, `applyStatsSubstitution` (válido e inválidos),
  validación de titulares.
- `statsMatchLive.test.ts`: separación en cancha / banca.
- `useStatsMatchStore.test.ts`: init de lineups y `substituteStatsPlayer`
  (válido, jugador fuera del plantel, el que sale no está en cancha, partido
  finalizado).

## Riesgos

- Un cambio de formato (N) después de elegir titulares puede dejar el conteo
  desajustado; el paso 3/4 lo valida y ofrece "Titulares: primeros N".
- Solo se puede atribuir una acción a quien está en cancha; si hay que anotarle a
  un suplente, primero se hace el cambio.

## Preguntas abiertas

- ¿Mostrar en el resumen/PDF quiénes fueron titulares? Se puede agregar luego.

## Plan de implementación

Ver `docs/plans/022-stats-7v7-wizard-y-suplentes-plan.md`.

## Checklist de aceptación

- [x] Armado por pasos con progreso y validación por etapa.
- [x] Titulares/suplentes elegibles; en vivo grilla = en cancha.
- [x] Cambios en vivo (entra banca por cancha) sin afectar stats.
- [x] `npx tsc --noEmit` y `npm test` en verde.

# Plan 022 - Estadística 7v7: armado por pasos y titulares/suplentes

Spec: `docs/specs/022-stats-7v7-wizard-y-suplentes.md`

## Pasos

1. **Dominio** (`src/domain/statsMatch.ts`)
   - `StatsTeam.starterIds`, `StatsMatch.lineups`, `StatsMatchLineups`.
   - `resolveStatsStarters`, `resolveStatsMatchLineups`, `getStatsTeamOnCourt`,
     `applyStatsSubstitution`; validación de titulares en `validateStatsMatchSetup`.
   - `normalizeStatsTeam` conserva `starterIds` (acotado al plantel).
   - `STATS_MATCH_STORE_DATA_VERSION` 1 → 2.

2. **Setup domain** (`statsMatchSetup.ts`)
   - `buildStatsSetupTeam` acepta `starterIds`.

3. **Live domain** (`statsMatchLive.ts`)
   - `getStatsOnCourtPlayers`, `getStatsBenchPlayers`.

4. **Store** (`useStatsMatchStore.ts`)
   - `CreateStatsTeamInput.starterIds`; init `lineups` en create/update;
     `normalizeStatsMatch` deriva `lineups`; acción `substituteStatsPlayer`.

5. **Setup UI** (`StatsMatchesScreen.tsx`)
   - Asistente por pasos (progreso + Atrás/Siguiente + validación por paso).
   - Paso titulares con ciclo afuera→titular→suplente→afuera y atajos.

6. **Live UI** (`LiveStatsMatchScreen.tsx`)
   - Grilla = en cancha; botón Cambios + modal de sustitución; defensor en cancha.

7. **Tests**: dominio, live y store (ver spec).

8. **Validación**: `npx tsc --noEmit`, `npm test`.

9. **Docs**: spec 022, este plan, `implementation-log.md`.

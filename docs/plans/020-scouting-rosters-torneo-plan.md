# Plan 020 - Planteles rivales del torneo para scouting

Spec: `docs/specs/020-scouting-rosters-torneo.md`

## Pasos

1. **Datos de scouting** (`src/domain/scoutingTeams.ts`)
   - Definir los 12 rosters rivales como `[firstName, lastName][]` por equipo,
     transcriptos del listado oficial (apellido separado para que se muestre en la app).
   - `buildScoutingData`: genera `Player[]` (dorsal = orden de lista, posición/zona/mano
     con defaults) y `TeamPool[]`; IDs `${poolId}-${slug(nombre)}` desduplicados global.
   - Exportar `scoutingPlayers`, `scoutingTeamPools`, `scoutingTeamPoolIds`.

2. **Semilla combinada** (`src/domain/mockData.ts`)
   - Importar scouting y exportar `defaultPlayers = [...uruguayPlayers, ...scoutingPlayers]`
     y `defaultTeamPools = [...teamPools, ...scoutingTeamPools]`.
   - Mantener `uruguayPlayers` y `teamPools` intactos (los usan otros módulos/tests).

3. **Store** (`src/store/useMatchStore.ts`)
   - Usar `defaultPlayers`/`defaultTeamPools` en estado inicial, `mergeDefaultPlayers`,
     `migrate`, `restoreBackupData` y todas las llamadas a `ensureDefaultTeamPool`.
   - Subir `STORE_DATA_VERSION` 9 → 10 para que instalaciones existentes migren.

4. **Tests**
   - Nuevo `scoutingTeams.test.ts` (integridad de datos).
   - Ajustar `useMatchStore.test.ts` (reset demo → `defaultPlayers.length`).

5. **Validación**: `npx tsc --noEmit` y `npm test`.

6. **Docs**: spec 020, este plan, decisión 009, `implementation-log.md`.

## Fuera de alcance

- Tipo/categoría `scouting` en `TeamPool` y filtros por pantalla.
- Descarga de rosters online.

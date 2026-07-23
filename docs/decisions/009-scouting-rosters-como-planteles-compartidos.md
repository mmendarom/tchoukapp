# Decision: Rosters rivales del torneo como planteles compartidos del store

## Date

2026-07-22

## Status

Accepted

## Context

Para el torneo se necesita scoutear delegaciones rivales con `Estadística 7v7`
(spec 013), que arma un partido eligiendo dos planteles (`teamPools`) y sus jugadores
(`players`) del `useMatchStore`. Había que decidir cómo hacer "elegibles para
estadísticas" a los equipos rivales sin backend y sin romper el flujo estable.

## Decision

Precargar los rosters rivales como **planteles (`TeamPool`) y jugadores (`Player`)
normales del store**, semilla local en `src/domain/scoutingTeams.ts`, concatenados a los
propios de Uruguay en `defaultPlayers`/`defaultTeamPools` (`mockData.ts`). Se sube
`STORE_DATA_VERSION` a 10 para que `migrate`/`mergeDefaultPlayers`/`ensureDefaultTeamPool`
sumen los rivales en instalaciones existentes sin pisar ediciones del usuario.

No se agrega un tipo/categoría `scouting` ni filtros por pantalla en esta versión.

## Consequences

- `Estadística 7v7` puede armar partidos con rivales sin carga manual.
- Los rivales son editables como cualquier plantel (dorsales, nombres, convocados) y
  entran en el backup/restore local.
- Los planteles rivales también aparecen en los selectores de Partidos, Entrenamientos y
  Práctica 3v3 (que leen el mismo `teamPools`). Es ruido visual aceptable; el default
  sigue siendo `Mayores`.
- Los dorsales cargados son de orden de lista, no oficiales.

## Alternatives considered

- **Tipo `scouting` en `TeamPool` + filtros por pantalla**: más limpio para no mostrar
  rivales en pantallas propias, pero toca el tipo, la validación de backup y 3-4
  pantallas. Se pospone a una spec futura si el ruido molesta en uso real.
- **Carga manual en el torneo**: inviable por tiempo y volumen (~136 jugadores).
- **Descarga de rosters online**: viola offline-first y suma backend/dependencias.

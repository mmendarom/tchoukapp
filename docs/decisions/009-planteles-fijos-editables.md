# Decision: Los planteles fijos son editables por el usuario

## Date

2026-07-07

## Status

Accepted

## Context

`ensureDefaultTeamPool` pisaba nombre y jugadores de los planteles con id fijo (`mayores`, `plus40`, `femenino`) con la composición de fábrica de `mockData` en cada operación del store (crear/editar jugador, crear/editar plantel, restore de backup, reset demo e hidratación). Fue una normalización deliberada para limpiar estados viejos "contaminados" (jugadoras de +40 dentro de Mayores), y estaba documentada en tests.

El efecto colateral: el usuario no podía editar los planteles ya armados. `updateTeamPool` devolvía `true` y el modal cerraba como si hubiera guardado, pero la edición se revertía en silencio — incluso al crear un jugador nuevo y agregarlo. Reportado por Mauro el 2026-07-06.

## Decision

- Los planteles fijos se **siembran solo cuando faltan**; una vez que existen, se respetan las ediciones del usuario (nombre y jugadores).
- `ensureDefaultTeamPool` deja de sobrescribir pools existentes con los defaults: solo normaliza el nombre (trim), filtra jugadores inexistentes, elimina pools inválidos/vacíos y agrega los fijos que falten.
- Un plantel fijo eliminado o que queda vacío se vuelve a sembrar desde los defaults (comportamiento previo conservado).
- Cruces entre categorías (por ejemplo, una jugadora de +40 en Mayores) pasan a ser ediciones legítimas, no "contaminación".

## Consequences

- El escenario "creo un jugador nuevo y lo agrego a Mayores" persiste a través de cualquier operación posterior del store, backup/restore e hidratación.
- Estados viejos realmente contaminados ya no se limpian automáticamente; el usuario puede corregirlos editando el plantel.
- `resetDemoData` conserva las ediciones de planteles del usuario (solo repone jugadores default y pools fijos faltantes).
- Tests actualizados: `teamPools.test.ts` y `useMatchStore.test.ts` documentan el nuevo contrato (edición persiste, re-siembra solo ante ausencia).

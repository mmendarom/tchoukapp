# Spec 020 - Planteles rivales del torneo para scouting (Estadística 7v7)

## Estado

Implemented

## Contexto

Arranca un torneo internacional y el cuerpo técnico de Uruguay quiere usar el modo
`Estadística 7v7` (spec 013) para observar y analizar a las delegaciones rivales, no
solo para partidos propios. Ese modo ya permite crear un partido entre **dos cuadros
cualesquiera** eligiendo dos planteles (`teamPools`) del store y sus jugadores
(`players`), y trackea a ambos equipos de forma simétrica.

Hasta ahora los únicos planteles precargados eran los de Uruguay (`Mayores`, `+40`,
`Femenino`). Para hacerle estadísticas a un rival había que cargarlo a mano jugador por
jugador, algo inviable en pleno torneo.

## Problema

No existían planteles rivales precargados. Para scoutear a Argentina, Brasil, Canadá o
Colombia había que crear cada plantel y cada jugador manualmente antes de cada partido.

## Objetivos

- Precargar como **planteles elegibles para estadísticas** las delegaciones rivales del
  torneo, con sus jugadores, para poder armar un `Estadística 7v7` sin cargar nada a mano.
- Mantener los planteles rivales editables (nombre, jugadores, dorsales) como cualquier
  otro plantel, por si cambian convocatorias.
- No romper el flujo estable ni los planteles propios de Uruguay.

## No objetivos

- No se agrega backend, sync ni descarga de rosters online: los datos van hardcodeados
  como semilla local, offline-first.
- No se cambian las reglas del partido, el scoring ni el modelo de eventos.
- No se agrega un tipo/categoría nuevo de plantel ni filtros por país en esta versión.

## Usuarios / Casos de uso

Cuerpo técnico de Uruguay durante el torneo: entra a `Estadística 7v7`, elige dos
cuadros (por ejemplo `Argentina Masculino` vs `Brasil Masculino Mayor`, o `Mayores` de
Uruguay vs un rival), ajusta convocados y registra el partido para analizar a ambos.

## Flujo esperado

1. Home → `Estadística 7v7`.
2. En "Nuevo partido" aparecen, además de los planteles de Uruguay, los planteles
   rivales del torneo como opciones de cuadro local y visitante.
3. Se elige un cuadro rival, se ajustan convocados (vienen todos preseleccionados) y se
   crea el partido. El resto del flujo es el de la spec 013 sin cambios.

## Requisitos funcionales

- Agregar 12 planteles rivales: Argentina (Masculino, Femenino, Master Masculino),
  Canadá Masculino, Colombia (Femenino 1, Femenino 2, Masculino 1, Masculino 2/B) y
  Brasil (Masculino Mayor, Femenino, Master Masculino, Femenino Master).
- Cada plantel con sus jugadores tomados del listado oficial del torneo.
- Los jugadores rivales son `Player` normales del store, editables desde Gestionar
  planteles.

## Requisitos no funcionales

- Offline-first: datos como semilla local, sin red.
- Texto visible en español.
- IDs de jugador estables (slug con prefijo de equipo) para persistencia local.

## Impacto en modelo de datos

- Ninguno en los tipos. Se reutiliza `Player` y `TeamPool`.
- Nuevo módulo `src/domain/scoutingTeams.ts` que construye `scoutingPlayers` y
  `scoutingTeamPools` a partir de los rosters. IDs de jugador: `${poolId}-${slug(nombre)}`,
  desduplicados globalmente.
- `mockData.ts` expone `defaultPlayers = [...uruguayPlayers, ...scoutingPlayers]` y
  `defaultTeamPools = [...teamPools, ...scoutingTeamPools]` como semilla del store.

## Impacto en UI

- Los selectores de plantel que leen `teamPools` del store (Estadística 7v7, y también
  Partidos, Entrenamientos, Práctica 3v3 y Gestionar planteles) ahora listan también los
  planteles rivales. El objetivo es Estadística 7v7; en las demás pantallas es ruido
  aceptable y no cambia el default (`Mayores`).

## Impacto en estado/persistencia

- `useMatchStore` inicializa `players`/`teamPools` con los defaults combinados.
- `STORE_DATA_VERSION` sube de 9 a 10: en instalaciones existentes, `migrate` corre
  `mergeDefaultPlayers` (suma los jugadores rivales que falten) y `ensureDefaultTeamPool`
  (suma los planteles rivales que falten), sin pisar planteles editados por el usuario.
- Los rivales entran también en el backup/restore local, sin cambios de formato.

## Testing plan

- `scoutingTeams.test.ts`: 12 pools con IDs esperados; cada pool ≥ jugadores por equipo
  por defecto; IDs de jugador únicos y con forma de slug; sin colisión con IDs de
  Uruguay; cada `playerId` de pool resuelve a un jugador; `defaultPlayers`/`defaultTeamPools`
  son la concatenación de propios + rivales.
- `useMatchStore.test.ts`: reset demo restaura `defaultPlayers.length` (propios + rivales).

## Riesgos

- Los dorsales son de orden de lista (no oficiales) y algunos apellidos compuestos se
  separaron a criterio; editable después. Bajo impacto: el análisis es por jugador/nombre.
- Aparición de planteles rivales en pantallas propias de Uruguay: ruido visual, reversible.

## Preguntas abiertas

- ¿Conviene un tipo `scouting` en `TeamPool` para filtrarlos fuera de las pantallas
  propias de Uruguay? Se deja para una spec futura si molesta en uso real.

## Plan de implementación

Ver `docs/plans/020-scouting-rosters-torneo-plan.md`.

## Checklist de aceptación

- [x] 12 planteles rivales elegibles en Estadística 7v7 con sus jugadores.
- [x] Planteles propios de Uruguay intactos y default sin cambios.
- [x] Migración suma rivales en instalaciones existentes sin pisar ediciones.
- [x] `npx tsc --noEmit` y `npm test` en verde.

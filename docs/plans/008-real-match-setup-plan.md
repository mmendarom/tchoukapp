# Plan: Real match setup

Spec relacionada: `docs/specs/008-real-match-setup.md`

Estado: Stage 2C implemented

## Objetivo

Implementar un setup real de partido en etapas, reemplazando la creacion demo-like por un flujo donde el staff define rival, plantel/categoria, convocados, 7 titulares y banco derivado, sin romper el MVP estable.

## Areas a inspeccionar antes de implementar

- `src/domain/types.ts`
- `src/domain/mockData.ts`
- `src/domain/teamPools.ts`
- `src/domain/matchSetup.ts`
- `src/domain/lineupSlots.ts`
- `src/domain/stats.ts`
- `src/store/useMatchStore.ts`
- `src/screens/MatchesScreen.tsx`
- `src/screens/LiveMatchScreen.tsx`
- `src/screens/PeriodSummaryScreen.tsx`
- `src/screens/FinalSummaryScreen.tsx`
- `src/screens/MatchDashboardScreen.tsx`
- `src/domain/reportData.ts`
- tests de `src/store/useMatchStore.test.ts`
- tests de report/lineup existentes

## Hallazgos actuales

- `Match` ya tiene `opponent`, `lineupSnapshots`, `events`, `periods`, `status` y `clock`.
- `createMatch(input)` acepta `opponent`, `venue` y `startsAt`, pero internamente usa `players.slice(0, 7)` para crear la alineacion inicial.
- `createDemoMatch()` sigue usando `Argentina` y tambien usa los primeros 7 jugadores.
- `LineupSnapshot.playerIds` es la fuente actual de los 7 slots neutrales.
- `createLineupSlots` deriva slots visuales desde `LineupSnapshot.playerIds`.
- `getBenchPlayers` deriva banco desde jugadores que no estan en `lineup.playerIds`.
- Hoy no existe campo persistido para convocados del partido.
- Hoy no existe `TeamPool` / `Plantel` explicito.
- La pantalla `MatchesScreen` tiene un modal simple que solo pide rival.
- La posicion habitual del jugador (`usualPlayingZone`) ya existe como metadata y no debe restringir slots.

## TeamPool / Plantel

### Modelo propuesto

```ts
type TeamPool = {
  id: string;
  name: string;
  playerIds: string[];
};
```

### Decision Stage 1

- Crear solo `Mayores` con el roster real actual.
- No crear jugadores ficticios para `Sub 18`.
- Sembrar `+40` solo con lista real cargada.
- Documentar `Sub 18` como categoria prevista para cuando exista lista real.
- Evitar pools vacios seleccionables en Stage 1 para no crear una UX confusa.
- Los planteles referencian jugadores globales por `id`.
- El match guarda snapshot historico con:
  - `teamPoolId`;
  - `teamPoolName`;
  - `availablePlayerIds`.

## Stage 1 - Wizard/modal de setup real

Estado: Implemented.

### Cambios propuestos

1. Reemplazar el modal simple de `Crear partido` por un setup con secciones o pasos.
2. Mantener entrada de rival con texto libre y fallback `Rival`.
3. Mostrar selector de `Plantel`.
4. Stage 1: seleccionar `Mayores` como unico plantel real disponible.
5. Usar todos los jugadores de `Mayores` como convocados (`availablePlayerIds`).
6. Permitir elegir 7 titulares desde el plantel seleccionado.
7. Mostrar banco derivado como convocados menos titulares.
7. Crear partido con:
   - `opponent`;
   - `teamPoolId`;
   - `teamPoolName`;
   - `availablePlayerIds`;
   - `LineupSnapshot.playerIds` con los 7 titulares.
8. Mantener `createDemoMatch()` con comportamiento demo seguro.
9. Dejar seleccion manual de convocados como Stage 1.1/Stage 2 si el flujo de campo lo pide.

### Resultado implementado

- `TeamPool` agregado al dominio.
- `Mayores` sembrado inicialmente con los jugadores mayores de Uruguay.
- No se agregaron `Sub 18` ni otros pools vacios para evitar UX confusa.
- `Match` ahora soporta `teamPoolId`, `teamPoolName` y `availablePlayerIds`.
- `MatchesScreen` reemplaza el modal simple por setup con rival, plantel, 7 titulares y banco derivado.
- `createMatch` valida 7 titulares y snapshot de disponibles.
- `LiveMatchScreen` deriva banco desde `availablePlayerIds`.
- `substitutePlayer` rechaza jugadores fuera del roster snapshot del partido.
- Reporte PDF/texto incluye `Plantel: Mayores` cuando el match lo tiene.

### Enfoque tecnico sugerido

- Agregar helper puro en `src/domain`, por ejemplo `matchSetup.ts`, para:
  - resolver jugadores disponibles del partido con fallback;
  - normalizar convocados;
  - validar minimo 7;
  - validar exactamente 7 titulares;
  - quitar duplicados;
  - derivar banco;
  - asegurar titulares contenidos en convocados.
- Agregar campo opcional en `Match`, preferido:
  - `teamPoolId?: string`;
  - `teamPoolName?: string`;
  - `availablePlayerIds?: string[]`.
- En helpers de banco/live, usar:
  - `availablePlayerIds` si existe;
  - fallback a todos los jugadores para partidos viejos.
- Extender `createMatch(input)` para aceptar:
  - `opponent?: string`;
  - `venue?: string`;
  - `startsAt?: string`;
  - `teamPoolId?: string`;
  - `teamPoolName?: string`;
  - `availablePlayerIds?: string[]`;
  - `initialPlayerIds?: string[]`.
- En Stage 1, si no se pasan titulares, usar fallback actual solo para compatibilidad interna/demo, no como flujo principal de UI.
- Mantener validaciones en store para que la UI no sea la unica defensa.

### UI sugerida

- Usar un modal/wizard mobile-friendly dentro de `MatchesScreen`.
- Pasos o bloques:
  1. `Rival`.
  2. `Plantel`.
  3. `Titulares`.
  4. `Banco`.
  5. `Revisar`.
- Botones:
  - `Cancelar`;
  - `Atras` si hay pasos;
  - `Siguiente`;
  - `Crear`.
- Feedback:
  - `Elegí 7 titulares para iniciar el partido.`;
  - `Este plantel no tiene jugadores cargados.`;
  - `El banco se arma automaticamente con los convocados restantes.`

### Tests sugeridos

- Default `Mayores` contiene todos los jugadores actuales.
- `createMatch` guarda `teamPoolId` y `teamPoolName`.
- Helper valida convocados con menos de 7.
- Helper valida exactamente 7 titulares.
- Helper elimina duplicados de convocados/titulares.
- Helper deriva banco correctamente.
- `createMatch` guarda `availablePlayerIds`.
- `createMatch` crea `LineupSnapshot.playerIds` con titulares elegidos.
- Partidos viejos sin `availablePlayerIds` siguen usando roster completo como fallback.
- Demo/reset sigue creando partido demo.
- `buildMatchReportData` incluye `teamPoolName` si existe.

### Manual QA

- Crear partido vs `Brasil`.
- Seleccionar plantel `Mayores`.
- Elegir 7 titulares.
- Revisar que banco tenga el resto de Mayores.
- Crear partido.
- Verificar live con esos 7 en cancha.
- Tocar `Cambiar jugadores` y verificar banco correcto.
- Hacer un cambio y deshacer.
- Finalizar tiempo/partido y revisar formacion en resumen/PDF.

## Stage 1.1 - Convocados manuales

### Cambios propuestos

1. Permitir desmarcar jugadores del plantel para armar una convocatoria del partido.
2. Mantener minimo de 7 convocados.
3. Mantener titulares contenidos dentro de convocados.
4. Seguir derivando banco desde `availablePlayerIds`.

### Motivo para diferir

Stage 1 prioriza seguridad y reduce riesgo de UX: seleccionar pool + 7 titulares ya resuelve el problema demo principal. La convocatoria manual puede agregarse luego sin cambiar el modelo porque `availablePlayerIds` ya queda persistido.

## Stage 2A - Store local de planteles

Estado: Implemented.

### Cambios implementados

1. `teamPools` queda como parte del estado persistido.
2. `Mayores` se asegura por default/migracion sin duplicarse.
3. `createTeamPool(name, playerIds)` crea un plantel local.
4. `updateTeamPool(poolId, updates)` permite cambiar nombre y jugadores.
5. Los nombres se trimmean.
6. Player IDs se filtran contra jugadores globales existentes.
7. Pools con nombre vacio o sin jugadores validos se rechazan.
8. Editar un pool no modifica partidos ya creados.
9. `resetDemoData` conserva pools creados por el usuario y mantiene `Mayores`.

### Diferido

- UI de gestion de planteles.
- Delete de planteles.
- Creacion/edicion de jugadores.
- Roster real de `Sub 18`.

## Stage 2B - UI de gestion de planteles

Estado: Implemented.

### Cambios implementados

1. Se agrego una entrada secundaria `Gestionar planteles` como accion de nivel app.
2. Se agrego modal de `Planteles` con lista de pools existentes.
3. Cada plantel muestra nombre y cantidad de jugadores.
4. Se puede crear un nuevo plantel con `Nombre del plantel` y multi-select de jugadores globales.
5. Se puede editar nombre y jugadores de un plantel existente.
6. La UI valida:
   - `El nombre del plantel es obligatorio.`;
   - `Seleccioná al menos un jugador.`;
   - `No se pudo guardar el plantel.` cuando el store rechaza.
7. Se usan las acciones Stage 2A:
   - `createTeamPool`;
   - `updateTeamPool`.
8. `Mayores` queda como pool default con ids explicitos del roster mayor original.
9. `+40` queda como pool default separado con ids explicitos y visible en `Gestionar planteles`.
10. `errazquin` y `fede` se comparten entre `Mayores` y `+40` por el mismo `id`, sin duplicar jugadores.
11. La migracion agrega el pool default `+40` si falta y no sobrescribe planteles existentes.
12. Refinamiento: la entrada `Gestionar planteles` se movio a la pantalla principal y se elimino de `Partidos`.
13. Refinamiento visual: Home integra logo de asociacion, identidad celeste/blanco/azul profundo y acciones principales reorganizadas.
14. Refinamiento: el modal `Planteles` tiene cierre `✕` en el encabezado, `Cerrar` al pie y `Cancelar` queda como accion de formulario.
15. Refinamiento: defaults `Mayores` y `+40` se normalizan contra sus rosters fijos para limpiar estados persistidos viejos.

### Diferido

- Delete de planteles.
- Creacion/edicion de jugadores.
- Fotos de jugadores.

## Stage 2C - Usar planteles custom en creacion de partido

Estado: Implemented.

### Cambios propuestos

1. Permitir elegir cualquier plantel local, incluido `+40`, al crear partido.
2. Mantener `Mayores` como default.
3. Mostrar empty states si un plantel queda con pocos jugadores.
4. Crear partido usando el pool elegido como `availablePlayerIds`.
5. Mantener snapshot historico del partido.

### Cambios implementados

1. `Crear partido` lista los planteles persistidos del store.
2. `Mayores`, `+40` y planteles creados por el usuario pueden seleccionarse.
3. Al cambiar de plantel se limpian titulares para evitar mezclar jugadores de otro pool.
4. La seleccion de titulares muestra solo jugadores del plantel elegido.
5. El partido se crea con `teamPoolId`, `teamPoolName` y `availablePlayerIds` del pool seleccionado.
6. Planteles con menos de 7 jugadores muestran `El plantel necesita al menos 7 jugadores.` y no permiten crear.
7. Si faltan titulares, se muestra `Elegí 7 titulares para iniciar el partido.`.
8. Editar un plantel despues de crear un partido no cambia el snapshot historico del partido.
9. `Crear partido` desde Home navega a `Partidos` y abre el modal de setup existente.

### Diferido

- Delete de planteles.
- Creacion/edicion de jugadores.
- Fotos de jugadores.

## Stage 2 - Setup visual de alineacion inicial

### Cambios propuestos

1. Reusar `LineupCourt` o componentes relacionados para mostrar 7 slots neutrales.
2. Mantener distribucion 3 izquierda - 1 centro - 3 derecha.
3. Permitir tocar un convocado y luego un slot para ubicarlo.
4. Permitir reemplazar/reordenar titulares antes de crear.
5. Mantener `playerIds` como array ordenado por slot.

### Enfoque tecnico sugerido

- Reusar helpers de `lineupSlots.ts`.
- Evitar drag/drop en el setup inicial hasta que haya una razon clara.
- Mantener todas las posiciones neutrales.
- No agregar nombres tacticos.

### Tests sugeridos

- Colocar jugador en slot reemplaza el anterior en datos temporales.
- No permite duplicar el mismo jugador en dos slots.
- Slots mantienen longitud 7.
- Jugadores con distintas zonas habituales pueden ir a cualquier slot.

## Stage 3A - Estado local de jugadores

Estado: Implemented.

### Cambios implementados

1. `players` queda como fuente local persistida en Zustand.
2. Los jugadores iniciales se siembran desde `uruguayPlayers`.
3. La migracion mergea jugadores default faltantes sin duplicar ids existentes.
4. Se agrega `createPlayer(input)` al store.
5. `createPlayer` valida campos requeridos, genera id unico estable, autoasigna numero si falta y usa stats default `0`.
6. Se agrega `updatePlayer(playerId, updates)` al store.
7. `updatePlayer` preserva `id`, valida campos y devuelve `true`/`false`.
8. Crear/editar jugadores no agrega automaticamente jugadores a planteles.
9. `resetDemoData` preserva jugadores locales y restaura partidos/fixtures demo.
10. Partidos, eventos y `availablePlayerIds` existentes no se mutan.

### Diferido

- Delete de jugadores.
- Snapshots historicos de nombres de jugador.
- Alta automatica de jugadores en planteles.

## Stage 3B - UI de gestion de jugadores

Estado: Implemented.

### Cambios implementados

1. Home agrega la accion `Gestionar jugadores`.
2. Se agrega `PlayerManagerModal` como UI local/offline de jugadores.
3. El modal lista jugadores con numero, nombre, posicion, zona y mano.
4. Se puede crear un `Nuevo jugador`.
5. Se puede editar un jugador existente preservando `id`.
6. El formulario valida:
   - `El nombre es obligatorio.`;
   - `Seleccioná una posición.`;
   - `Seleccioná una zona habitual.`;
   - `Seleccioná mano dominante.`;
   - `No se pudo guardar el jugador.` cuando el store rechaza.
7. Crear/editar usa `createPlayer` y `updatePlayer`.
8. Nuevos jugadores quedan disponibles en `Gestionar planteles` porque ese modal lee `players` del store.
9. No se agrega automaticamente ningun jugador nuevo a planteles existentes.

### Diferido

- Delete de jugadores.
- Snapshots historicos de nombres de jugador.
- Alta automatica de jugadores en planteles.

## Stage 3 - Presets locales de convocados

### Cambios propuestos

1. Evaluar si los convocados se repiten lo suficiente para justificar presets.
2. Implementar presets locales solo si field testing lo pide.
3. Mantener creacion manual siempre disponible.

### Enfoque tecnico sugerido

- Preferir derivar sugerencias desde partidos recientes antes de crear una entidad nueva.
- Si se crea entidad:
  - `id`;
  - `name`;
  - `playerIds`;
  - `lastUsedAt`.
- Sin backend ni cloud.

## Riesgos y puntos donde detenerse

- Si el wizard queda largo para telefono, separar setup completo y creacion rapida.
- Si `availablePlayerIds` afecta muchos calculos, agregar helper central para resolver jugadores disponibles.
- Si resumenes/PDF asumen roster completo, ajustar solo lectura de alineaciones sin tocar eventos.
- Si aparece necesidad de editar roster, abrir spec separada.
- Si el usuario necesita sede/fecha/competencia, agregar una subetapa posterior.

## Validacion final por etapa

- `npm test`
- `npx tsc --noEmit`
- QA manual en Expo Go:
  - telefono portrait;
  - tablet landscape;
  - crear partido;
  - iniciar periodo;
  - sustituciones;
  - resumenes;
  - export PDF/texto.

## Documentacion a actualizar al implementar

- `docs/specs/008-real-match-setup.md`
- `docs/implementation-log.md`
- `docs/decisions/*` si se decide nombre/campo persistido final para convocados o presets.

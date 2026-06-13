# Spec: Real match setup

## Estado

Stage 1 implemented

## Contexto

La app ya permite crear partidos con rival editable, registrar eventos en vivo, manejar cambios con una cancha visual de 7 slots neutrales, ver mapas en vivo, revisar resumenes por tiempo/finales y exportar reportes PDF/texto.

El flujo de creacion actual sigue siendo demasiado simple para un partido real: `Crear partido` pide rival, crea un partido `draft` y arma la alineacion inicial con los primeros 7 jugadores del roster local. El banco se deriva de los jugadores que no estan en `LineupSnapshot.playerIds`.

Ademas falta un concepto explicito de `Plantel` / `TeamPool`: Uruguay puede jugar con distintas categorias o pools, por ejemplo `Mayores`, `Sub 18` y `+40`. Cada pool referencia jugadores globales por `id`, y un jugador puede pertenecer a mas de un pool en el futuro.

## Problema

Para competir o probar en practica real, el staff necesita preparar el partido antes de iniciarlo:

- elegir el rival;
- elegir que plantel/categoria juega;
- elegir que jugadores estan convocados/disponibles;
- definir los 7 jugadores iniciales en cancha;
- confirmar quienes quedan en banco;
- revisar todo antes de empezar.

Hoy la app decide titulares de forma automatica desde el orden del roster, lo que se siente demo y puede dejar el partido con jugadores incorrectos en cancha desde el inicio.

## Objetivos

- Crear un flujo real de setup antes de iniciar partido.
- Reusar el rival editable existente.
- Introducir `TeamPool` / `Plantel` como categoria de roster local.
- Sembrar `Mayores` con el roster actual de Uruguay.
- Permitir seleccionar convocados desde el roster Uruguay existente.
- Exigir 7 jugadores iniciales.
- Derivar el banco desde los convocados que no estan en la alineacion inicial.
- Guardar la alineacion inicial en `LineupSnapshot.playerIds`.
- Mantener los 7 slots neutrales y sin nombres tacticos.
- Mantener `usualPlayingZone` / posicion habitual como metadata solamente.
- Preservar demo/reset, tracking live, cambios, mapas, resumenes, PDF, undo y persistencia offline.

## No objetivos

- No implementar CRUD de jugadores o edicion de roster en esta etapa.
- No implementar CRUD de planteles/categorias en esta etapa.
- No implementar lista de rivales recientes.
- No inventar jugadores para `Sub 18` ni `+40`.
- No agregar backend, autenticacion, cloud sync ni servicios pagos.
- No agregar restricciones por posicion habitual.
- No crear nombres tacticos para slots.
- No cambiar reglas de score, eventos, timer, mapas ni export.
- No cambiar `landingLocation` ni inferir ubicaciones desde posiciones.
- No implementar presets de roster en Stage 1.

## Usuarios / Casos de uso

- El entrenador crea un partido de `Mayores` contra `Brasil`, define 7 titulares y empieza con banco correcto.
- El asistente prepara el partido antes del calentamiento y revisa que nadie quede mal cargado.
- En vivo, el staff usa Defensa/Error solo sobre jugadores realmente en cancha.
- Al finalizar, resumenes y PDF muestran formacion inicial/final coherente con el setup.

## Flujo esperado

1. Usuario toca `Crear partido`.
2. Ingresa o confirma `Rival`.
3. Selecciona `Plantel` / categoria.
4. Selecciona jugadores convocados desde ese plantel.
5. Elige exactamente 7 jugadores iniciales.
6. La app muestra los restantes convocados como banco.
7. Usuario revisa:
   - rival;
   - plantel;
   - titulares;
   - banco.
8. Usuario confirma y se crea el partido en estado `draft`.
9. Usuario toca `Iniciar partido` o entra al live para comenzar el primer tiempo.

### Stage 1

- Wizard/modal simple con pasos o secciones:
  - `Rival`;
  - `Plantel`;
  - `Convocados`;
  - `Titulares`;
  - `Banco`;
  - `Revisar`.
- Decision segura para primera implementacion:
  - crear solo el plantel `Mayores` con el roster actual;
  - documentar `Sub 18` y `+40` como proximo paso de carga de datos;
  - usar todos los jugadores de `Mayores` como convocados (`availablePlayerIds`);
  - elegir 7 titulares desde ese plantel.
- Seleccion de titulares por check/tap desde el plantel.
- Orden inicial de slots puede seguir el orden de seleccion.
- Banco se deriva de convocados menos titulares.
- Implementado: `Crear partido` usa un modal de setup con rival, plantel `Mayores`, seleccion de 7 titulares, banco derivado y creacion del partido.
- Implementado: `Match` guarda `teamPoolId`, `teamPoolName` y `availablePlayerIds`.
- Refinamiento implementado: partidos `Finalizado` se abren en `Resumen final` y no pueden reiniciarse desde la lista ni desde `startMatch`.
- Refinamiento implementado: el label de `Plantel` se muestra mas centrado, balanceado y legible en setup, lista y marcador live.

### Stage 2

- Stage 2A implementado:
  - `teamPools` vive en el store persistido.
  - `createTeamPool(name, playerIds)` crea planteles locales validos.
  - `updateTeamPool(poolId, updates)` actualiza nombre y jugadores sin cambiar el `id`.
  - No hay UI de gestion todavia.
  - No hay delete todavia.
  - Editar un plantel no muta partidos existentes porque los partidos guardan `availablePlayerIds` como snapshot historico.
- `Mayores` se asegura por migracion/default sin duplicarse.
- `Sub 18` y `+40` siguen diferidos hasta tener rosters reales y UI de gestion.
- Stage 2B implementado:
  - se agrega UI secundaria `Gestionar planteles`;
  - se listan planteles existentes;
  - se pueden crear planteles usando jugadores globales existentes;
  - se pueden editar nombre y jugadores de planteles existentes;
  - no se implementa delete;
  - no se implementa creacion/edicion de jugadores;
  - la creacion de partido sigue usando `Mayores` hasta Stage 2C.
- Reusar la cancha visual 3 izquierda - 1 centro - 3 derecha.
- Permitir tocar un jugador convocado y colocarlo en uno de los 7 slots neutrales.
- Permitir reordenar titulares antes de crear el partido.

### Stage 3

- Guardar/reusar presets locales de convocados si el flujo real lo justifica.

## Requisitos funcionales

- `Crear partido` debe abrir un setup real, no crear automaticamente la alineacion por orden del roster.
- El rival debe seguir siendo texto libre con fallback `Rival`.
- El usuario debe elegir un `Plantel` / categoria antes de crear el partido.
- Stage 1 debe crear `Mayores` con el roster actual de Uruguay.
- `Sub 18` y `+40` quedan documentados pero no seleccionables hasta tener jugadores cargados, salvo que se implemente un empty state claro.
- El usuario debe elegir titulares desde los jugadores del plantel seleccionado.
- Stage 1 puede usar todos los jugadores del plantel como convocados para mantener el flujo seguro.
- Debe haber al menos 7 convocados para crear el partido.
- Debe haber exactamente 7 titulares iniciales.
- Los titulares deben pertenecer a los convocados.
- Los suplentes/banco deben derivarse de convocados seleccionados que no estan en los 7 titulares.
- Ningun jugador debe aparecer duplicado en titulares.
- Ningun jugador debe aparecer a la vez como titular y banco.
- Todos los jugadores convocados pueden jugar en cualquier slot.
- La posicion habitual/preferida puede mostrarse como metadata, pero no restringe seleccion ni ubicacion.
- El partido creado debe persistir su alineacion inicial como `LineupSnapshot` de Uruguay.
- El partido creado debe guardar:
  - `teamPoolId`, si existe;
  - `teamPoolName` como fallback historico legible;
  - `availablePlayerIds` como snapshot de convocados/disponibles del partido.
- El live screen debe mostrar los 7 titulares configurados.
- La zona Banco debe mostrar solo los convocados que no estan en cancha.
- Los cambios existentes deben seguir funcionando sobre esa base.
- Demo/reset debe seguir creando datos seguros, probablemente con Argentina y una alineacion demo.
- Partidos viejos sin metadata nueva deben seguir abriendo y funcionando.

## Requisitos no funcionales

- Offline-first.
- TypeScript estricto.
- Texto visible en espanol.
- Mobile-first y usable en tablet.
- Touch targets comodos para seleccionar jugadores.
- Setup rapido, claro y recuperable si el usuario cancela.
- Sin dependencias nuevas salvo justificacion explicita.
- Mantener logica de lineup en dominio/store, no dentro de componentes complejos.
- No degradar la velocidad de registro en vivo.

## Impacto en modelo de datos

Modelo actual relevante:

- `Match.opponent` guarda el rival.
- `Match.lineupSnapshots` contiene snapshots de alineacion.
- `LineupSnapshot.playerIds` representa los 7 slots neutrales por indice.
- El banco actual se deriva con jugadores que no aparecen en la alineacion actual.

### TeamPool / Plantel

Modelo propuesto:

```ts
type TeamPool = {
  id: string;
  name: string;
  playerIds: string[];
};
```

Reglas:

- Los jugadores globales siguen siendo la fuente de datos de jugador.
- Los planteles referencian jugadores globales por `id`.
- Un jugador puede pertenecer a multiples planteles en el futuro.
- Stage 1 siembra `Mayores` con el roster real actual.
- `Sub 18` y `+40` quedan diferidos hasta tener listas reales de jugadores.

### Snapshot historico del partido

Stage 1 representa convocados disponibles para el partido con snapshot en `Match`.

Opcion preferida:

- Agregar a `Match`:
  - `teamPoolId?: string`;
  - `teamPoolName?: string`;
  - `availablePlayerIds?: string[]`.
- Si el campo falta en partidos viejos, fallback seguro:
  - considerar disponibles todos los jugadores del roster local;
  - mantener el banco derivado como hoy.
- `LineupSnapshot.playerIds` sigue siendo la fuente de verdad para titulares/en cancha.
- Banco = jugadores disponibles menos `currentLineup.playerIds`.

No cambiar:

- eventos;
- score;
- `landingLocation`;
- `defenseLocation`;
- formato de sustitucion existente.

## Impacto en UI

- `MatchesScreen` debe reemplazar el modal simple de rival por un wizard/modal de setup.
- Labels sugeridos:
  - `Crear partido`;
  - `Rival`;
  - `Plantel`;
  - `Categoria`;
  - `Mayores`;
  - `Sub 18`;
  - `+40`;
  - `Convocados`;
  - `Titulares`;
  - `Banco`;
  - `Revisar partido`;
  - `Crear`;
  - `Cancelar`;
  - `Selecciona 7 titulares`;
  - `Jugadores seleccionados`;
  - `Suplentes`.
- Stage 1 puede usar listas con checkboxes/tarjetas compactas.
- Stage 1 preferido:
  - seleccionar `Mayores`;
  - elegir 7 titulares;
  - usar todo `Mayores` como convocados.
- Stage 2 puede reutilizar la cancha 3-1-3 para colocar titulares visualmente.
- Stage 2B agrega una UI simple de gestion:
  - entrada secundaria `Gestionar planteles`;
  - lista `Planteles`;
  - accion `Nuevo plantel`;
  - accion `Editar`;
  - formulario con `Nombre del plantel` y multi-select de `Jugadores`.
- Stage 2B no cambia la UI de creacion de partido: los planteles custom se integran en Stage 2C.
- La pantalla live no debe mostrar jugadores no convocados en banco.
- El setup debe ser legible en telefono y tablet.

## Impacto en estado/persistencia

- `createMatch` debe aceptar rival, convocados y titulares iniciales.
- `createMatch` debe aceptar `teamPoolId`, `teamPoolName`, `availablePlayerIds` e `initialPlayerIds`.
- Store debe validar:
  - rival normalizado;
  - plantel valido cuando se provee;
  - convocados minimos;
  - 7 titulares;
  - titulares contenidos en convocados;
  - sin duplicados.
- Stage 2A agrega acciones persistidas:
  - `createTeamPool(name, playerIds)`;
  - `updateTeamPool(poolId, updates)`.
- `createTeamPool` debe rechazar nombres vacios y pools sin jugadores validos.
- `updateTeamPool` debe preservar `id` y rechazar updates invalidos.
- Editar un pool no debe modificar `availablePlayerIds` de partidos ya creados.
- La persistencia local debe mantener compatibilidad con partidos viejos.
- `resetDemoData` y `createDemoMatch` deben seguir funcionando con datos demo seguros.
- Undo no aplica al setup inicial, pero debe seguir funcionando para cambios/eventos posteriores.
- Si se agrega `availablePlayerIds`, resumenes/reportes deben tolerar que no exista.

## Testing plan

- Crear partido con rival custom y 7 titulares.
- Crear partido con mas de 7 convocados y banco derivado.
- Verificar que live screen muestra los 7 titulares elegidos.
- Verificar que banco muestra los convocados restantes.
- Verificar que no aparecen no convocados en banco.
- Verificar que sustituciones funcionan con banco derivado.
- Verificar que undo de sustitucion restaura lineup previo.
- Verificar que resumen por tiempo, resumen final y PDF muestran formacion inicial/final correcta.
- Verificar fallback de partido viejo sin `availablePlayerIds`.
- Verificar demo/reset sigue usando datos demo seguros.
- Verificar `Mayores` contiene el roster actual.
- Verificar que el reporte incluye `Plantel: Mayores` cuando exista.
- Verificar que no se puede crear con menos de 7 convocados.
- Verificar que no se puede crear sin exactamente 7 titulares.
- Verificar que posicion habitual no restringe seleccion.
- Verificar acciones `createTeamPool` y `updateTeamPool`.
- Verificar que reset demo conserva pools creados por el usuario y mantiene `Mayores`.
- Verificar que editar un pool no cambia snapshots de partidos existentes.
- Verificar UI de gestion de planteles:
  - crear plantel;
  - editar plantel;
  - validar nombre vacio;
  - validar sin jugadores;
  - cancelar sin guardar;
  - confirmar que match creation sigue igual.

## Riesgos

- Hacer el setup demasiado largo y frenar la creacion rapida.
- Guardar banco como fuente independiente y generar inconsistencias con lineup.
- Romper partidos viejos si se asume que todos tienen convocados.
- Confundir `convocados` con roster editable.
- Introducir restricciones tacticas no validadas.
- Hacer que el flujo sea comodo en tablet pero pesado en telefono.

## Preguntas abiertas

- Nombre final del campo: `availablePlayerIds`, `rosterPlayerIds` o `calledUpPlayerIds`?
- Los planteles `Sub 18` y `+40` deben aparecer deshabilitados como empty state o ocultarse hasta tener jugadores?
- En Stage 1, el orden de titulares debe ser orden de seleccion o orden del roster?
- Debe existir una accion `Seleccionar todos` para convocados?
- Cual es el minimo de convocados real esperado en practica: exactamente 7 o 7+?
- Al crear el partido, conviene navegar directo al live o quedarse en lista/detalle?
- El setup debe permitir sede/fecha en esta misma spec o diferirlo?

## Plan de implementacion

Ver `docs/plans/008-real-match-setup-plan.md`.

Resumen por etapas:

1. Wizard/modal de creacion con rival, plantel, convocados snapshot y 7 titulares.
2. Setup visual de alineacion inicial usando cancha 3-1-3.
3. Presets locales de convocados si hacen falta.

## Checklist de aceptacion

- [x] Existe flujo de setup antes de crear un partido real.
- [x] Se puede ingresar rival.
- [x] Se puede seleccionar plantel/categoria.
- [x] `Mayores` existe y usa el roster actual.
- [ ] Seleccion manual de convocados queda diferida; Stage 1 usa todo el plantel seleccionado.
- [x] Se deben elegir exactamente 7 titulares.
- [x] Banco se deriva de convocados no titulares.
- [x] `Match` guarda `teamPoolId`, `teamPoolName` y `availablePlayerIds`.
- [x] Live muestra los 7 titulares elegidos.
- [x] Banco live muestra solo suplentes convocados.
- [x] Cambios siguen funcionando.
- [x] Undo de cambios sigue funcionando.
- [x] Reporte incluye `Plantel` cuando esta disponible.
- [x] Demo/reset sigue funcionando.
- [x] Partidos viejos siguen abriendo con fallback seguro.
- [x] No se agregan restricciones por posicion habitual.
- [x] No se inventan jugadores para `Sub 18` ni `+40`.
- [x] No se agregan backend/auth/cloud.
- [x] `landingLocation` no cambia.
- [x] `npm test` pasa.
- [x] `npx tsc --noEmit` pasa.
- [x] Partidos finalizados abren `Resumen final` en vez de reiniciarse.
- [x] `startMatch` no reinicia partidos finalizados.
- [x] `Plantel` queda visible y balanceado en UI.
- [x] `teamPools` queda en estado persistido.
- [x] `createTeamPool` crea pools locales validos.
- [x] `createTeamPool` rechaza nombre vacio o sin jugadores validos.
- [x] `updateTeamPool` actualiza nombre/jugadores preservando `id`.
- [x] `updateTeamPool` no muta partidos existentes.
- [x] Delete de pools queda diferido.
- [x] UI de gestion de planteles permite crear/editar planteles con jugadores existentes.
- [x] Match creation todavia no usa planteles custom; queda para Stage 2C.
- [x] Delete de pools sigue diferido.
- [x] Player CRUD sigue diferido.

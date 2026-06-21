# Spec: Real match setup

## Estado

Stage 2C implemented

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
- No inventar jugadores para `Sub 18`; `+40` puede existir solo con lista real cargada.
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
- `Sub 18` sigue diferido hasta tener roster real y UI de gestion.
- Stage 2B implementado:
  - se agrega UI secundaria `Gestionar planteles` como accion de nivel app;
  - se listan planteles existentes;
  - se pueden crear planteles usando jugadores globales existentes;
  - se pueden editar nombre y jugadores de planteles existentes;
  - no se implementa delete;
  - no se implementa creacion/edicion de jugadores;
  - la creacion de partido sigue usando `Mayores` hasta Stage 2C.
- Stage 2C implementado:
  - `Crear partido` permite elegir cualquier plantel persistido;
  - `Mayores`, `+40`, `Femenino` y planteles creados por el usuario son seleccionables;
  - la lista de titulares se arma solo con jugadores del plantel seleccionado;
  - el partido guarda `teamPoolId`, `teamPoolName` y `availablePlayerIds` como snapshot historico;
  - editar un plantel despues de crear un partido no muta el roster historico de ese partido.
- Refinamiento implementado:
  - `Mayores` ya no usa automaticamente todos los jugadores globales;
  - `Mayores` queda definido por una lista fija de ids del roster mayor original;
  - `+40` queda sembrado como plantel default separado con ids explicitos;
  - jugadores compartidos como `errazquin` y `fede` aparecen en ambos planteles por el mismo `id`, sin duplicar registros;
  - la migracion/default agrega `+40` si falta, sin sobrescribir `Mayores` ni planteles editados por el usuario.
- Refinamiento de persistencia implementado:
  - estados persistidos donde `Mayores` quedo contaminado con jugadores `plus40-*` se normalizan contra el roster mayor fijo;
  - `+40` tambien se normaliza contra su roster fijo;
  - planteles creados por el usuario se preservan;
  - snapshots historicos de partidos no se mutan.
- Reusar la cancha visual 3 izquierda - 1 centro - 3 derecha.
- Permitir tocar un jugador convocado y colocarlo en uno de los 7 slots neutrales.
- Permitir reordenar titulares antes de crear el partido.

### Stage 3

- Stage 3A implementado:
  - `players` vive como estado local persistido en Zustand;
  - los jugadores iniciales se siembran desde `uruguayPlayers`;
  - estados viejos sin `players` se migran sembrando los jugadores default;
  - `createPlayer` crea jugadores locales con ids unicos y estadisticas default;
  - `updatePlayer` actualiza campos editables preservando `id`;
  - crear/editar jugadores no agrega automaticamente jugadores a planteles;
  - delete de jugadores y UI de gestion de jugadores quedan diferidos;
  - los eventos y snapshots historicos siguen referenciando `playerId`;
  - editar un nombre puede cambiar como se ve un jugador viejo en reportes, porque snapshots de nombre quedan diferidos.
- Stage 3B implementado:
  - Home agrega la accion `Gestionar jugadores`;
  - se agrega UI `Jugadores` para listar, crear y editar jugadores;
  - el formulario valida nombre, posicion, zona habitual y mano dominante;
  - crear/editar jugadores usa `createPlayer` y `updatePlayer`;
  - nuevos jugadores quedan disponibles para seleccion manual en `Gestionar planteles`;
  - delete de jugadores sigue diferido.
- Stage 3C implementado:
  - `Gestionar planteles` permite crear un `Nuevo jugador` desde el formulario de plantel;
  - el formulario de jugador se reutiliza entre `Gestionar jugadores` y `Gestionar planteles`;
  - cancelar la creacion de jugador vuelve al plantel sin perder nombre ni jugadores seleccionados;
  - guardar crea el jugador con `createPlayer`, vuelve al plantel y lo selecciona automaticamente;
  - delete de jugadores y delete de planteles siguen diferidos.
- Guardar/reusar presets locales de convocados si el flujo real lo justifica.

## Requisitos funcionales

- `Crear partido` debe abrir un setup real, no crear automaticamente la alineacion por orden del roster.
- El rival debe seguir siendo texto libre con fallback `Rival`.
- El usuario debe elegir un `Plantel` / categoria antes de crear el partido.
- Stage 1 debe crear `Mayores` con el roster actual de Uruguay.
- `Sub 18` queda documentado pero no seleccionable hasta tener jugadores cargados, salvo que se implemente un empty state claro.
- `+40` existe como plantel default separado en `Gestionar planteles` y puede seleccionarse al crear partido.
- Planteles creados por el usuario pueden seleccionarse al crear partido si tienen al menos 7 jugadores.
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
- `Sub 18` queda diferido hasta tener lista real de jugadores.
- `+40` queda disponible como plantel default separado cuando exista lista real cargada.
- `Mayores` y `+40` pueden compartir jugadores por `id`; no se duplican registros de jugador.

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
- Refinamiento de `Planteles`:
  - el modal usa titulo `Planteles`;
  - cierre compacto `✕` en el encabezado;
  - accion `Cerrar` al pie;
  - `Cancelar` queda como accion de formulario para descartar creacion/edicion.
- Stage 2C cambia la UI de creacion de partido para elegir cualquier plantel persistido.
- Refinamiento de ubicacion:
  - `Gestionar planteles` se accede desde la pantalla principal;
  - `Partidos` ya no muestra la entrada de gestion de planteles;
  - la gestion de planteles queda como accion general offline de la app.
- Rediseño de pantalla principal:
  - Home integra el logo de la asociacion desde `assets/association-logo.png`;
  - Home usa identidad visual celeste, blanco y azul profundo;
  - `Crear partido` queda como accion primaria y abre el flujo existente de setup;
  - `Partidos` y `Gestionar planteles` quedan como acciones principales/secundarias claras;
  - se muestran cards sutiles de contexto para partidos, planteles y proximos fixtures.
- Stage 3B agrega una UI simple de jugadores:
  - entrada `Gestionar jugadores` en Home;
  - lista `Jugadores`;
  - accion `Nuevo jugador`;
  - accion `Editar`;
  - formulario con `Nombre`, `Apellido`, `Número`, `Posición`, `Zona habitual` y `Mano dominante`.
- Stage 3C agrega creacion contextual desde `Planteles`:
  - accion `Nuevo jugador` junto a la seleccion de jugadores del plantel;
  - formulario reutilizado de jugador;
  - retorno al formulario de plantel al cancelar o guardar;
  - auto-seleccion del jugador recien creado en el plantel actual.
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
- Stage 3A agrega acciones persistidas:
  - `createPlayer(input)`;
  - `updatePlayer(playerId, updates)`.
- Stage 3B no agrega nuevas acciones de estado; reutiliza `createPlayer` y `updatePlayer`.
- Stage 3C no agrega nuevas acciones de estado; reutiliza `createPlayer`.
- `players` debe persistir localmente y mergear jugadores default faltantes en migraciones.
- Crear/editar jugadores no debe mutar `Match.availablePlayerIds`, eventos ni snapshots historicos.
- Crear un jugador desde un formulario de plantel solo modifica el plantel en edicion si el usuario luego guarda ese plantel.
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
- Verificar que `Crear partido` permite elegir `+40`.
- Verificar que `Crear partido` permite elegir un plantel creado por el usuario.
- Verificar que la lista de titulares cambia al cambiar de plantel.
- Verificar que no se puede crear un partido con un plantel de menos de 7 jugadores.
- Verificar UI de gestion de planteles:
  - crear plantel;
  - editar plantel;
  - validar nombre vacio;
  - validar sin jugadores;
  - cancelar sin guardar;
  - confirmar que match creation sigue igual.
- Verificar Stage 3A de jugadores:
  - seed inicial desde `uruguayPlayers`;
  - migracion de estado viejo sin `players`;
  - `createPlayer` genera id unico y defaults;
  - `createPlayer` rechaza `firstName` vacio;
  - `updatePlayer` preserva `id`;
  - `updatePlayer` rechaza jugador inexistente;
  - planteles siguen referenciando ids validos;
  - partidos viejos siguen resolviendo nombres por `playerId`.
- Verificar Stage 3B de jugadores:
  - abrir `Gestionar jugadores`;
  - validar formulario vacio;
  - crear jugador;
  - editar jugador;
  - confirmar que el jugador nuevo aparece en `Gestionar planteles`;
  - agregar jugador nuevo a un plantel;
  - crear partido con ese plantel.
- Verificar Stage 3C de planteles:
  - abrir `Gestionar planteles`;
  - crear o editar un plantel;
  - seleccionar jugadores existentes;
  - tocar `Nuevo jugador`;
  - cancelar y confirmar que la seleccion se conserva;
  - crear jugador nuevo;
  - confirmar que vuelve al plantel y queda seleccionado;
  - guardar plantel;
  - confirmar que el jugador queda disponible en `Gestionar jugadores` y match creation.

## Riesgos

- Hacer el setup demasiado largo y frenar la creacion rapida.
- Guardar banco como fuente independiente y generar inconsistencias con lineup.
- Romper partidos viejos si se asume que todos tienen convocados.
- Confundir `convocados` con roster editable.
- Introducir restricciones tacticas no validadas.
- Hacer que el flujo sea comodo en tablet pero pesado en telefono.

## Preguntas abiertas

- Nombre final del campo: `availablePlayerIds`, `rosterPlayerIds` o `calledUpPlayerIds`?
- Los planteles futuros sin roster real, como `Sub 18`, deben aparecer deshabilitados como empty state o ocultarse hasta tener jugadores?
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
- [x] No se inventan jugadores para `Sub 18`; `+40` usa lista real cargada.
- [x] `Mayores` usa ids explicitos y no incluye automaticamente jugadores `plus40-*`.
- [x] `+40` existe como plantel default separado en `Gestionar planteles`.
- [x] `Femenino` existe como plantel default separado con 16 jugadoras e ids dedicados.
- [x] Jugadores compartidos entre `Mayores` y `+40` se referencian por el mismo `id`, sin duplicados.
- [x] Estados persistidos con `Mayores` contaminado se normalizan sin mutar snapshots de partidos.
- [x] Modal `Planteles` tiene cierre claro y accion `Cancelar` separada del cierre.
- [x] `players` queda como estado local persistido.
- [x] `createPlayer` crea jugadores locales con ids unicos y defaults.
- [x] `updatePlayer` edita jugadores preservando `id`.
- [x] Home permite abrir `Gestionar jugadores`.
- [x] UI de jugadores permite crear y editar jugadores.
- [x] Jugadores nuevos aparecen en seleccion de planteles.
- [x] Planteles permite crear un jugador sin salir del flujo.
- [x] Jugador creado desde plantel queda seleccionado automaticamente en el plantel actual.
- [x] Player delete queda diferido.
- [x] Snapshots historicos de nombres de jugador quedan diferidos.
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
- [x] `Gestionar planteles` esta en la pantalla principal, no dentro de `Partidos`.
- [x] Home integra logo de asociacion e identidad visual de Uruguay.
- [x] `Crear partido` desde Home abre el flujo existente de setup.
- [x] Match creation usa planteles persistidos, incluido `+40`.
- [x] Match creation bloquea planteles con menos de 7 jugadores.
- [x] Match creation guarda snapshot historico de `availablePlayerIds`.
- [x] Delete de pools sigue diferido.
- [x] Player CRUD sigue diferido.

## Field fix - identidad visible desde Plantel

Estado: implementado el 2026-06-20; QA manual en telefono pendiente.

- `teamPoolName` pasa a ser la fuente del nombre visible del lado propio en partidos, resumenes y reportes.
- Sin `teamPoolName`, partidos historicos muestran `Equipo`.
- La identidad institucional de Home puede seguir diciendo Uruguay; los labels competitivos del partido usan el plantel/club real.
- Los enums internos `uruguay/opponent` no cambian y siguen siendo compatibles con backups existentes.

## Plantel default Femenino

Estado: implementado el 2026-06-20; QA manual pendiente.

- Se agrega el plantel fijo `Femenino` con 16 jugadoras y ids dedicados `femenino-*`.
- `Mayores`, `+40` y `Femenino` mantienen rosters explicitos e independientes; no se agregan jugadoras de Femenino a los otros defaults.
- Nuevas instalaciones reciben jugadores y plantel desde los defaults.
- Instalaciones existentes reciben los jugadores faltantes y el plantel mediante migracion persistida v9, sin reemplazar jugadores locales con el mismo id ni borrar planteles custom.
- `resetDemoData` preserva jugadores y planteles creados por el usuario y vuelve a asegurar los tres defaults.
- Los partidos creados con `Femenino` guardan `teamPoolId`, `teamPoolName` y `availablePlayerIds` como snapshot historico.
- No cambian score, tracking, eventos, mapas ni backup/import.

QA manual:

- Confirmar `Femenino` y sus 16 jugadoras en `Gestionar planteles`.
- Confirmar que `Mayores` y `+40` no contienen ids `femenino-*`.
- Crear un partido con `Femenino`, elegir siete titulares y revisar banco, live y reporte.

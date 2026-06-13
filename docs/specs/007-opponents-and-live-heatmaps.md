# Spec: Editable opponents and live maps/statistics

## Estado

Draft

Nota: Stage 1 de rivales editables esta implementado usando texto libre en `Match.opponent`. El panel de mapas en vivo del Stage 3 esta implementado para datos del tiempo actual. Lista de rivales recientes y CRUD completo siguen pendientes.

## Contexto

La app ya permite registrar un partido de tchoukball en vivo para el cuerpo tecnico de Uruguay con puntos propios, puntos rivales, punto en contra, punto en contra rival, defensas de Uruguay, defensas del rival con ubicacion, cambios, resumenes por tiempo, resumen final y export de reporte.

El modelo `Match` ya tiene un campo `opponent`, pero la creacion actual usa un partido demo con rival fijo, por ejemplo `Argentina`. Los mapas tacticos existen en resumenes y reportes, pero no hay una seccion de mapas/estadisticas en vivo dentro de `LiveMatchScreen`.

## Problema

- En partidos reales, el rival no siempre es el demo/fijo y debe poder definirse al crear el partido.
- Los mapas y estadisticas tacticas llegan tarde si solo se ven al terminar un tiempo o el partido.
- Mostrar mapas en vivo no debe entorpecer el registro rapido de acciones.
- Las defensas de Uruguay no tienen ubicacion, por lo que no deben aparecer como mapa inventado.

## Objetivos

- Permitir ingresar el nombre del rival al crear un partido.
- Usar el rival elegido en marcador, resumenes, dashboard, PDF y resumen compartido.
- Mantener compatibilidad con partidos viejos y demo.
- Agregar una seccion en vivo para mapas y estadisticas tacticas.
- Reutilizar componentes y funciones existentes cuando sea posible.
- Mostrar mapas en vivo solo para eventos con ubicacion real.
- Mostrar defensas de Uruguay como estadistica por jugador, no como mapa.
- Mantener el MVP estable y offline-first.

## No objetivos

- No agregar backend, autenticacion, cloud sync ni servicios pagos.
- No implementar CRUD completo de rivales en la primera etapa.
- No cambiar reglas de score.
- No cambiar el modelo de ubicacion normalizada.
- No pedir ubicacion para defensas de Uruguay.
- No inferir ubicaciones desde posiciones de jugadores.
- No modificar la logica de `landingLocation` para puntos.
- No agregar heatmaps falsos para eventos sin ubicacion.

## Usuarios / Casos de uso

- Cuerpo tecnico de Uruguay crea un partido real y escribe el nombre del rival antes de iniciar.
- Durante el partido, el staff revisa rapidamente donde Uruguay hizo puntos.
- Durante el partido, el staff revisa donde el rival hizo puntos.
- Durante el partido, el staff revisa donde el rival defendio ataques uruguayos.
- Durante el partido, el staff revisa defensas uruguayas por jugador sin abrir resumenes.
- Despues del partido, reportes y resumenes muestran el rival correcto.

## Flujo esperado

### Rival editable

1. Usuario toca `Crear partido`.
2. App muestra un flujo simple para ingresar rival.
3. Usuario escribe el nombre del rival.
4. App crea el partido local con ese rival.
5. Marcador, resumenes y reportes usan ese nombre.
6. Si no hay nombre valido, la app usa `Rival` como fallback.
7. El demo/reset puede seguir usando `Argentina`.

### Mapas y estadisticas en vivo

1. Usuario registra acciones normalmente.
2. En telefono, abre una seccion colapsable `Mapas en vivo` o `Estadisticas en vivo`.
3. En tablet landscape, el panel de mapas vive en el espacio libre bajo las acciones del lado izquierdo.
4. El panel muestra un mapa por vez con cuatro tabs, sin titulo ni subtitulo para ahorrar espacio visual:
   - `Combinado`.
   - `Puntos nuestros`.
   - `Puntos rivales`.
   - `Defensas rivales`.
5. `Combinado` es la vista default y superpone puntos nuestros, puntos rivales y defensas rivales en la misma cancha.
6. Los mapas usan solamente eventos del tiempo actual.
7. Las defensas de Uruguay aparecen como `Defensas por jugador` si hay espacio, no como mapa.
8. Faltas y puntos en contra pueden aparecer como resumen compacto si no saturan la UI.

## Requisitos funcionales

- El usuario puede crear un partido con rival de texto libre.
- El rival elegido se guarda en `Match.opponent`.
- El partido demo puede seguir usando `Argentina` como valor por defecto.
- Los partidos viejos sin rival valido deben mostrar `Rival`.
- El marcador en vivo debe mostrar el rival elegido.
- Resumen por tiempo, resumen final, dashboard, PDF y texto compartido deben usar el rival elegido.
- Stage 2 puede agregar una lista local de rivales recientes.
- La lista reciente, si se implementa, debe seguir permitiendo texto libre.
- `LiveMatchScreen` debe ofrecer mapas/estadisticas en vivo sin ocupar espacio critico de registro.
- En telefono portrait, los mapas/estadisticas en vivo deben ser colapsables.
- En tablet landscape, el panel de mapas debe ubicarse bajo los botones de accion en la columna izquierda.
- El panel live debe mostrar un solo mapa visible a la vez.
- El tab seleccionado por defecto debe ser `Combinado`.
- Los tabs visibles deben ser:
  - `Combinado`;
  - `Puntos nuestros`;
  - `Puntos rivales`;
  - `Defensas rivales`.
- `Combinado` debe superponer los tres datasets con colores distintos:
  - azul para puntos nuestros;
  - rojo para puntos rivales;
  - violeta para defensas rivales.
- `Combinado` debe mostrar una leyenda compacta con esos colores.
- Cada tab debe mostrar conteo si entra sin romper layout.
- Los mapas en vivo deben usar solo eventos con ubicacion:
  - puntos de Uruguay con `landingLocation`;
  - puntos del rival con `landingLocation`;
  - defensas del rival con `defenseLocation`.
- `Punto en contra`, `Punto en contra rival` y defensas de Uruguay deben quedar fuera de mapas.
- `Defensas nuestras` como heatmap queda diferido: defensas Uruguay registran quien defendio, no donde.
- En esta version, los mapas live muestran solo el tiempo actual.
- Si no hay ubicaciones, mostrar `Sin ubicaciones registradas.`
- Defensas de Uruguay deben mostrarse como conteo por jugador.
- Faltas y puntos en contra deben mostrarse como resumen compacto por jugador o total segun espacio.

## Requisitos no funcionales

- Mantener TypeScript estricto.
- Mantener la app offline-first.
- No agregar dependencias pesadas.
- Reutilizar componentes existentes como `CourtMapSummary` si se adaptan bien al vivo.
- Mantener acciones de registro rapidas y tactiles.
- Mantener texto visible en espanol.
- Evitar layouts que tapen barras nativas o controles importantes.
- No degradar rendimiento durante registro en vivo.

## Impacto en modelo de datos

Stage 1 no requiere un campo nuevo porque `Match.opponent` ya existe.

- Se debe normalizar el uso de `Match.opponent` como nombre visible del rival.
- Para partidos viejos o datos corruptos, usar fallback `Rival`.
- `Fixture.opponent` puede seguir existiendo para fixtures.
- Stage 2 podria introducir una lista local opcional de rivales recientes, por ejemplo derivada de partidos existentes o con una entidad local simple.

No se cambia:

- `landingLocation`.
- `defenseLocation`.
- tipos de eventos existentes.
- reglas de score.

## Impacto en UI

### Creacion de partido

- Reemplazar o complementar `Crear partido demo` con un flujo de creacion simple.
- Campo visible sugerido: `Rival`.
- Botones sugeridos: `Crear partido`, `Cancelar`.
- El demo puede mantenerse como acceso de desarrollo o fallback con `Argentina`.
- Stage 1 implementado: `Crear partido` abre un modal con campo `Rival`, placeholder `Ej: Argentina`, botones `Crear` y `Cancelar`.

### En vivo

- Agregar una seccion compacta:
  - `Mapas en vivo`.
  - `Estadisticas en vivo`.
- Telefono: colapsable para no competir con marcador, acciones y cancha.
- Tablet landscape: usar el area libre bajo acciones en la columna izquierda.
- El panel tactico live debe tener tabs/botones compactos arriba del mapa.
- El panel tactico live no debe mostrar los textos `Mapas en vivo` ni `Tiempo actual` para mantener el bloque compacto.
- El mapa visible debe mantener altura suficiente para leer zonas y areas prohibidas.
- No ubicar mapas por encima de acciones criticas si reduce velocidad de registro.

## Impacto en estado/persistencia

- Stage 1 guarda el rival dentro del `Match` local persistido.
- Migracion defensiva: si un match no tiene `opponent`, UI y reportes usan `Rival`.
- Stage 2, si se implementa, puede guardar rivales recientes localmente o derivarlos de `matches`.
- No hay backend ni sincronizacion.
- No se cambia el event stream como fuente de verdad.

## Testing plan

- Crear partido con rival custom.
- Verificar marcador con rival custom.
- Verificar resumen por tiempo con rival custom.
- Verificar resumen final con rival custom.
- Verificar dashboard con rival custom.
- Verificar PDF export con rival custom.
- Verificar resumen textual compartido con rival custom.
- Verificar partido viejo sin rival valido usando `Rival`.
- Verificar demo con `Argentina`.
- Registrar puntos Uruguay y confirmar mapa live.
- Registrar puntos rival y confirmar mapa live.
- Registrar defensa rival y confirmar mapa live.
- Registrar `Punto en contra` y confirmar que no aparece en mapas.
- Registrar `Punto en contra rival` y confirmar que no aparece en mapas.
- Registrar defensa Uruguay y confirmar que aparece en `Defensas por jugador`, no en mapa.
- Deshacer un evento con ubicacion y confirmar que desaparece del mapa live.
- Finalizar un tiempo e iniciar otro; confirmar que el panel live muestra el tiempo actual.
- Verificar que la seccion colapsable no rompe acciones de registro.
- Verificar tablet landscape sin saturar acciones.

## Riesgos

- Hacer un CRUD de rivales demasiado grande antes de validar necesidad real.
- Saturar la pantalla live con mapas y perder velocidad de registro.
- Duplicar logica de estadisticas en UI en vez de reutilizar dominio.
- Mostrar mapas para eventos sin ubicacion real y generar lectura tactica falsa.
- No contemplar partidos persistidos antiguos sin `opponent`.
- Reducir espacio de acciones principales en telefono.

## Preguntas abiertas

- Mas adelante conviene agregar toggle `Tiempo actual` / `Partido completo`?
- En tablet portrait, conviene mostrar mapas abiertos por defecto o colapsados?
- La lista de rivales recientes debe derivarse de partidos ya creados o persistirse como entidad propia?
- Hace falta guardar pais/codigo/color del rival en el MVP o alcanza con nombre?
- El flujo de creacion debe pedir sede/fecha ahora o dejarlo para otra spec?

## Plan de implementacion

Ver `docs/plans/007-opponents-and-live-heatmaps-plan.md`.

Resumen por etapas:

1. Rival editable con texto libre en creacion de partido.
2. Lista local opcional de rivales recientes.
3. Mapas y estadisticas en vivo colapsables.
4. Pulido responsive para tablet landscape.

## Checklist de aceptacion

- [x] Se puede crear un partido con rival custom.
- [x] `Match.opponent` guarda el rival elegido.
- [x] El marcador muestra el rival elegido.
- [x] Resumen por tiempo, resumen final, dashboard y reportes muestran el rival elegido.
- [x] Partidos viejos usan fallback seguro `Rival`.
- [ ] No se agrega backend/auth/cloud.
- [ ] `Mapas en vivo` muestra tabs `Combinado`, `Puntos nuestros`, `Puntos rivales` y `Defensas rivales`.
- [ ] `Combinado` es la vista default.
- [ ] El panel no muestra titulo `Mapas en vivo` ni subtitulo `Tiempo actual`.
- [ ] En tablet landscape el panel aparece bajo las acciones de la columna izquierda.
- [ ] `Mapas en vivo` usa datos del tiempo actual.
- [ ] `Puntos nuestros` muestra puntos Uruguay con ubicacion.
- [ ] `Puntos rivales` muestra puntos rival con ubicacion.
- [ ] `Defensas rivales` muestra defensas del rival con ubicacion.
- [ ] `Combinado` superpone los tres datasets con leyenda azul/rojo/violeta.
- [ ] Eventos sin ubicacion no aparecen en mapas.
- [ ] Defensas Uruguay aparecen como conteo por jugador.
- [ ] No se agrega heatmap de defensas Uruguay.
- [ ] La pantalla live sigue siendo rapida para registrar acciones.
- [ ] Telefono portrait mantiene secciones colapsables.
- [ ] Tablet landscape aprovecha espacio sin tapar controles.
- [ ] `npm test` pasa.
- [ ] `npx tsc --noEmit` pasa.

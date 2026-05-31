# Spec 004 - Punto en contra rival

## Problema

Durante un partido el rival puede cometer una accion que le regala un punto a Uruguay. La app necesita registrar ese punto sin pedir ubicacion de caida ni identidad de jugador rival, porque no se trackea roster del rival y la ubicacion no aporta valor tactico para este caso.

## Objetivos

- Registrar `Punto en contra rival` como accion rapida en partido en vivo.
- Sumar exactamente +1 a Uruguay.
- No requerir `landingLocation`.
- No requerir jugador de Uruguay ni jugador rival.
- Preservar undo, resumen por tiempo, resumen final, dashboard e insights.
- Excluir este evento de goleadores, mapas y puntos por zona.
- Mantener compatibilidad con eventos existentes.

## No Objetivos

- No cambiar el flujo de `Punto Uruguay`.
- No cambiar el flujo de `Punto rival`.
- No cambiar defensa, errores, timer, sustituciones ni mapa de cancha.
- No inferir ubicacion desde posiciones de jugadores.
- No agregar backend, auth, cloud sync ni dependencias.

## Modelo De Evento

Se extiende `PointEvent` con `pointSource: 'opponent_own_point'`.

Reglas:

- `kind: 'point'`
- `scoringTeam: 'uruguay'`
- `pointSource: 'opponent_own_point'`
- Sin `playerId`
- Sin `landingLocation`
- Sin aporte a `zone` tactica; se conserva un valor legacy/default solo por compatibilidad del tipo actual.

Este enfoque mantiene el evento como punto para score, periodos y plus/minus, y evita duplicar logica de marcador.

## Reglas De Producto

- `Punto en contra rival` suma +1 Uruguay.
- No suma al rival.
- No cuenta como gol de jugador.
- No aparece en `Dónde hicimos los puntos`.
- No aparece en `Puntos por zona`.
- No requiere confirmacion ni abre el mapa.
- Es undoable como cualquier evento.
- En ultimas acciones se muestra como `Punto en contra rival (+1 Uruguay)`.

## UI

En `LiveMatchScreen` se agrega un boton visible cerca de `Punto rival`:

- Label: `Punto en contra rival`
- Ayuda: `Suma +1 Uruguay`

Al tocarlo:

1. Se valida que el tiempo este en vivo.
2. Se guarda el evento inmediatamente.
3. Se muestra feedback `Punto en contra rival (+1 Uruguay)`.

## Resumenes Y Estadisticas

Resumen por tiempo:

- El marcador del tiempo incluye estos puntos.
- Se muestra `Puntos en contra del rival: {count}`.

Resumen final:

- El marcador final incluye estos puntos.
- Se muestra `Puntos en contra del rival totales: {count}`.

Dashboard:

- Se muestra `Puntos en contra del rival` de forma compacta.

Insights:

- Si el conteo reciente llega a un umbral sensible, mostrar:
  - Titulo: `Puntos regalados por el rival`
  - Descripcion: `El rival entregó {count} puntos en contra en este tiempo.`
  - Accion: `Aprovechar el momento y mantener presión.`

## Tests

- Score total y por periodo incluye +1 Uruguay.
- No suma al rival.
- No requiere `landingLocation`.
- Undo resta el punto a Uruguay.
- No doble cuenta con `Punto Uruguay`.
- No cuenta como goleador.
- No aparece en puntos por zona ni mapas.
- Totales de puntos en contra rival se calculan correctamente.
- Store no registra fuera de tiempo en vivo.
- Labels visibles no muestran tipos internos.
- Insight opcional aparece al superar umbral y no genera insight de zona.

## Compatibilidad

- Eventos viejos `pointSource: 'attack' | 'opponent-error' | 'technical'` siguen funcionando.
- Eventos viejos sin `landingLocation` no rompen mapas ni resumenes.

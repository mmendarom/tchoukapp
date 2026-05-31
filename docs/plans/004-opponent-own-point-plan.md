# Plan 004 - Punto en contra rival

## Stage 1 - Domain model

- Extender `PointEvent.pointSource` con `opponent_own_point`.
- Agregar helpers puros para identificar y contar puntos en contra del rival.
- Mantener score basado en eventos.

## Stage 2 - Store

- Agregar accion `recordOpponentOwnPoint`.
- Validar partido y tiempo en vivo.
- Crear un evento `point` para Uruguay sin jugador ni ubicacion.
- Preservar undo existente.

## Stage 3 - UI en vivo

- Agregar boton `Punto en contra rival` cerca de `Punto rival`.
- Guardar inmediatamente sin abrir mapa ni selector.
- Mostrar feedback claro.
- Ajustar ultimas acciones y labels.

## Stage 4 - Resumenes, dashboard e insights

- Mostrar conteos por tiempo y total.
- Excluir de goleadores, mapas y puntos por zona.
- Agregar insight liviano cuando haya suficiente volumen.

## Stage 5 - Tests y validacion

- Actualizar tests de dominio, store, labels e insights.
- Ejecutar `npm test`.
- Ejecutar `npx tsc --noEmit`.

## Riesgos

- El tipo actual de `PointEvent` requiere `zone` y `frame`; se conservaran defaults internos para compatibilidad, pero las funciones de zona deben excluir `opponent_own_point`.
- Los mapas ya filtran por `landingLocation`, pero los agrupadores por `zone` necesitan guard explícito por `pointSource`.

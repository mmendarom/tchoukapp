# Decision: Alcance one-frame de coordenadas de entrenamiento

## Date

2026-06-22

## Status

Accepted

## Context

Los eventos de `Practica 3v3` ya guardan ubicaciones como `{ x, y }` normalizado y originalmente reutilizaban el mapa full-court formal. La practica de campo usa un solo marco y necesita una captura mas rapida, sin alterar mapas, reportes ni coordenadas de partidos formales.

## Decision

- Crear `TrainingGoalMapInput` separado de `CourtMapInput` y `CourtField`.
- Mantener `CourtLocation { x, y }` con valores 0-1, relativo al area one-frame para nuevas capturas training.
- Mostrar el mapa training desde la perspectiva del planillero parado detras del marco:
  - fondo/base y marco abajo;
  - area de juego hacia arriba;
  - `0° fondo` abajo;
  - `45° intermedio`;
  - `90° centro del area` hacia arriba/centro.
- No agregar `locationScope` ni migracion en Stage 7.
- Mantener eventos training antiguos sin scope como datos validos.
- Limitar interpretacion training a un modelo tactico de un solo marco, con labels:
  - `lado izquierdo · 0°-30°`;
  - `lado izquierdo · 30°-60°`;
  - `centro · 60°-90°`;
  - `lado derecho · 30°-60°`;
  - `lado derecho · 0°-30°`.
- No usar `marco izquierdo`, `marco derecho`, `zona izquierda`, `zona derecha` ni angulos mayores a 90° en textos de training.
- Interpretar eventos training antiguos con `{x,y}` mediante el helper one-goal, sin migrarlos.

## Consequences

- El flujo formal queda aislado y conserva semantica full-court.
- Scoring, stats, persistencia y backup no cambian.
- Eventos legacy no pueden distinguir automaticamente si su ubicacion provino del mapa full-court anterior; para MVP se muestran como one-goal-relative para unificar lenguaje de campo.
- Eventos capturados antes del ajuste behind-goal pueden no coincidir visualmente perfecto con la nueva orientacion; no se migran por falta de metadata confiable.
- Heatmaps training futuros deberan considerar esa ambiguedad legacy o introducir metadata versionada.

## Alternatives considered

- Agregar un modo training a `CourtMapInput`: descartado para no mezclar geometria y semantica formal con one-frame.
- Agregar `locationScope` obligatorio: diferido porque exigiría ampliar el modelo sin necesidad para captura/stats actuales.
- Migrar coordenadas antiguas: descartado porque no existe informacion suficiente para convertirlas con seguridad.

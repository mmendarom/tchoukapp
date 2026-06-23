# Decision: UI jugador-centrica y defensa principal en shot_defended

## Date

2026-06-22

## Status

Accepted

## Context

El live de `Practica 3v3` tenia botones globales por tipo de evento. En campo, ese flujo obliga al entrenador a pensar primero en la categoria (`Punto`, `Defensa`, `Tiro defendido`, `Error`) y despues en el jugador. Para mini partidos rapidos de un solo marco, el flujo mas natural es tocar al jugador protagonista y elegir que paso.

Ademas, registrar una `defense` suelta pierde contexto ofensivo: no dice quien tiro ni donde fue defendido.

## Decision

- Rediseñar `LiveTrainingMiniMatchScreen` alrededor de botones grandes por jugador.
- Usar el flujo `toco jugador -> elijo que paso`.
- Mantener acciones principales:
  - `Punto`;
  - `Lo atajaron`;
  - `Error`.
- Para `Lo atajaron`, registrar `shot_defended` como evento defensivo principal:
  - `playerId`: tirador;
  - `teamId`: equipo atacante;
  - `defenderPlayerId`: defensor;
  - `defendingTeamId`: equipo defensor;
  - `location`: ubicacion one-frame donde fue defendido.
- Dejar de crear eventos `defense` independientes desde la UI live de training.
- Mantener `defense` como legacy/deprecated para sesiones ya guardadas.
- Agregar `errorSubtype` para errores comunes:
  - `invasion`;
  - `line_step`;
  - `turnover`.
- Mantener `own_point_against` separado de `error` porque cambia score y cuenta como intento errado.

## Consequences

- El tracking live es mas rapido y jugador-centrico.
- `shot_defended` concentra la informacion tactica util: tirador, defensor, equipos y ubicacion.
- Las stats defensivas nuevas salen del defensor en `shot_defended`; eventos legacy `defense` siguen contando.
- No se modifica scoring formal, partidos formales, reportes formales ni coordenadas persistidas.
- Las sesiones antiguas siguen cargando sin migracion.

## Alternatives considered

- Mantener `Defensa` como boton global: descartado porque duplica la accion y preserva un flujo mas lento.
- Convertir `defense` existente en evento compuesto: descartado por riesgo de migracion y porque `shot_defended` ya modela mejor el caso tactico.
- Mezclar `Punto en contra` dentro de `error`: descartado porque afecta score e intentos, a diferencia de errores comunes.

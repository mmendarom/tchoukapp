# Spec: Práctica 3v3 - falta "marco", PDF sin huecos y barras por % de goles

## Estado

Implemented

## Contexto

Mejoras surgidas del testeo en vivo de la Práctica 3v3 (spec 011). Pedido explícito de Mauro tras usar la app en partidos reales. Tres ajustes acotados, sin cambiar el modelo de eventos ni el scoring.

## Problema

1. Al registrar un error en 3v3, las opciones son invasión, pisa la línea, perdió la pelota y punto en contra. Falta **"marco"** (tiro que da en el marco/estructura), que es una falta habitual y hoy no se puede marcar.
2. El PDF de la sesión deja muchas hojas casi vacías: cuando una sección grande no entra en lo que queda de la página, se empuja entera a la siguiente y queda un hueco enorme.
3. En los resúmenes de rendimiento, las barras de ataque están normalizadas por total de tiros, no por goles. Visualmente parece que todos aportaron parecido al total de goles. Deberían representar el **porcentaje de cada jugador sobre el total de goles**.

## Objetivos

- Agregar "marco" como subtipo de error registrable en la pantalla en vivo de 3v3.
- Que el PDF fluya y no deje páginas casi vacías por secciones que no entran.
- Que las barras de ataque midan la participación de cada jugador en el total de goles (share de puntos), no el share de tiros.

## No objetivos

- Cambiar el scoring, el modelo de eventos, la rotación de mini partidos ni los mapas.
- Tocar el partido formal ni la Estadística 7v7 (solo se toma su patrón `pointShare` como referencia).
- Distinguir "marco" en estadísticas separadas: cuenta como un error más (igual que invasión o pisa la línea).

## Usuarios / Casos de uso

- Entrenador registrando un 3v3 en vivo: marca "marco" cuando un tiro da en la estructura.
- Entrenador revisando el resumen o el PDF: lee de un vistazo quién metió qué porcentaje de los goles.

## Flujo esperado

- En el modal de error de un jugador aparece un botón "Marco" junto a Invasión / Pisa la línea / Perdió la pelota. Al tocarlo se registra un error subtipo `frame`.
- El PDF exportado reparte las secciones a lo largo de las páginas sin dejar huecos grandes; los bloques atómicos (tarjetas, filas, tablas) no se parten al medio.
- Las barras de ataque (in-app y PDF) tienen el ancho proporcional a `puntos del jugador / total de goles`.

## Requisitos funcionales

- `TrainingErrorSubtype` incluye `frame`; se persiste y se muestra como "tiró al marco" en el historial de acciones.
- `TrainingPerformanceAttackRow` expone `pointShare = puntos / totalPoints` (0 si no hay goles).
- El ancho de la barra de ataque usa `pointShare`.

## Requisitos no funcionales

- Texto visible en español (AGENTS.md).
- Sin dependencias nuevas. Offline-first intacto.

## Impacto en modelo de datos

- `TrainingErrorSubtype` suma `frame`. Retrocompatible: los eventos viejos no tienen el subtipo nuevo y siguen leyéndose igual. No cambia la versión del store.
- `TrainingPerformanceAttackRow` y `TrainingReportPlayerDetail` suman `pointShare` (derivado, no persistido).

## Impacto en UI

- `LiveTrainingMiniMatchScreen`: botón "Marco".
- `TrainingPerformanceBars`: barra de ataque por share de goles.
- `trainingReportHtml`: CSS de paginación y barras por share de goles.

## Impacto en estado/persistencia

- Ninguno en el store: `recordTrainingEvent` ya pasa `errorSubtype` de forma genérica.

## Testing plan

- `trainingPerformance`: `pointShare` correcto (share de goles, suma 1 entre goleadores).
- `trainingLive`: etiqueta "tiró al marco" para el subtipo `frame`.
- `trainingReportHtml`: `.section` sin `page-break-inside: avoid`; barra de ataque usa el share de goles.

## Riesgos

- La barra de ataque deja de mostrar volumen de tiros de forma gráfica; se compensa con el texto "puntos/tiros · efectividad".

## Preguntas abiertas

- Ninguna. El denominador (`total de goles`) sigue el patrón ya existente `pointShare` del partido formal (`src/domain/playerPerformance.ts`).

## Plan de implementación

Ver `docs/plans/017-training-3v3-marco-pdf-goal-bars-plan.md`.

## Checklist de aceptación

- [x] "Marco" registrable y visible en el historial.
- [x] PDF sin páginas casi vacías por secciones que no entran.
- [x] Barras de ataque por porcentaje de goles.
- [x] `npx tsc --noEmit` y `npm test` en verde.

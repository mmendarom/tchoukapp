# Decision: Compatibilidad de sesiones 3v3 en backup local

## Date

2026-06-22

## Status

Accepted

## Context

Las sesiones de `Practica 3v3` se persisten en `useTrainingStore`, separado del store de partidos formales. El backup v1 solo incluia jugadores, planteles, partidos y fixtures. Stage 6A debe proteger el historial de entrenamiento sin invalidar archivos ya exportados ni restaurar selecciones runtime obsoletas.

## Decision

- Elevar la exportacion actual a `backupVersion: 2` y agregar `trainingSessions`.
- Aceptar backups v1 y v2 al importar.
- Normalizar `trainingSessions` ausente o no-array a `[]`; rechazar arrays que contengan sesiones estructuralmente invalidas.
- Restaurar las sesiones por reemplazo mediante `useTrainingStore` y reutilizar su normalizacion de hidratacion.
- Excluir y limpiar `activeTrainingSessionId`, como se hace con `activeMatchId`.
- Mantener separados los stores y no cambiar scoring, modelos de eventos ni reportes.

## Consequences

- Los backups nuevos preservan equipos, mini partidos, eventos, cola, settings y status.
- Los backups v1 siguen siendo importables, pero por definicion restauran cero sesiones de entrenamiento.
- Restore sigue siendo destructivo y sin merge para todos los datos incluidos.
- Un backup con sesiones presentes pero invalidas se rechaza antes de la confirmacion.

## Alternatives considered

- Mantener version 1 con un campo aditivo: descartado para que el cambio de contrato quede explicito.
- Incluir `activeTrainingSessionId`: descartado porque es estado runtime y puede quedar stale.
- Mover sesiones al store formal: descartado para no acoplar entrenamiento al modelo de partidos oficiales.

## Stage 6B extension - archived sessions

### Decision

Agregar `archivedAt?: string` dentro de cada `TrainingSession` sin elevar nuevamente `backupVersion`. Es un campo aditivo y opcional: backups/sesiones anteriores se interpretan como no archivados, mientras que backup v2 preserva el valor cuando existe. Eliminar una sesion la quita del store y, por consecuencia, de exportaciones futuras.

### Consequences

- Archivo y status deportivo permanecen independientes.
- Las sesiones archivadas siguen protegidas por backup/import.
- No se requiere migracion destructiva ni un schema v3.

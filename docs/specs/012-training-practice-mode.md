# Spec 012 - Modo Entrenamiento

## Estado

MVP inicial implementado - Stages 1, 2 y backup basico

## Estado de implementacion 2026-06-27

Implementado:

- Entrada `Entrenamiento` desde Home, separada de `Practica 3v3`.
- Modelo dominio/store nuevo para `TrainingPracticeSession` y `TrainingBlock`.
- Persistencia offline local en storage propio.
- Crear entrenamiento con plantel, asistencia, objetivo, notas y bloques.
- Lista/detalle con filtros `Activos`, `Finalizados`, `Archivados` y `Todos`.
- Lifecycle basico de sesion: `draft`, `live`, `finished`, `cancelled`.
- Lifecycle basico de bloques: `planned`, `live`, `completed`, `skipped`.
- Resumen basico: asistencia, bloques, minutos, notas y seguimientos.
- Archivar, restaurar y eliminar sesiones.
- Backup/export/import incluye `practiceSessions` y tolera backups viejos sin esa clave.

Diferido:

- Pantalla live dedicada.
- Templates.
- PDF de entrenamiento.
- Vinculo real con sesiones de `Practica 3v3`.
- Estadisticas tecnicas avanzadas y progreso acumulado por jugador.

## Contexto

La app ya cubre dos necesidades distintas:

- partidos formales, con periodos, timer, puntos, errores, cambios, undo, resumenes, ubicaciones de cancha, PDFs y backup local;
- `Practica 3v3`, con mini partidos internos, equipos, puntaje objetivo, rotacion, estadisticas, resumen compartible y PDF.

El nuevo `Modo Entrenamiento` debe cubrir una necesidad mas amplia: organizar y evaluar entrenamientos regulares de tchoukball. No debe reemplazar `Practica 3v3` ni mezclarse directamente con sus mini partidos. Debe ayudar a preparar la sesion, marcar asistencia, definir bloques de trabajo, registrar notas y revisar que se hizo.

## Problema

El cuerpo tecnico necesita registrar entrenamientos que no siempre son partidos internos. Una practica puede combinar entrada en calor, tecnica individual, defensa/recepcion, ataque por zona, transicion, fisico, tactica y cierre. Forzar todo eso dentro de `Practica 3v3` generaria datos falsos: no todos los bloques tienen score, equipos, rotacion o eventos de punto.

Sin un modo dedicado, se pierde informacion importante:

- quien asistio;
- cual era el objetivo de la practica;
- que ejercicios se hicieron;
- que jugadores destacaron o necesitan seguimiento;
- que notas tacticas dejo el cuerpo tecnico;
- que progreso acumulado existe por jugador.

## Objetivos

- Crear un modo nuevo desde Home: `Entrenamiento`.
- Planificar sesiones de entrenamiento regulares.
- Elegir plantel/categoria desde `TeamPool`.
- Marcar asistencia desde jugadores existentes.
- Definir objetivo general de la sesion.
- Agregar bloques/ejercicios ordenados.
- Registrar notas del cuerpo tecnico por sesion y por bloque.
- Permitir tracking simple durante el entrenamiento sin hacer lento el uso en campo.
- Generar resumen de sesion con asistencia, bloques completados, notas y destacados.
- Mantener `Practica 3v3` separada como modo de mini partidos.
- Mantener offline-first, persistencia local y backup.

## No objetivos

- No reemplazar `Practica 3v3`.
- No convertir todos los ejercicios en mini partidos con score.
- No agregar backend, autenticacion, cloud sync ni servicios pagos.
- No agregar dependencias nuevas.
- No agregar mapas tacticos en el MVP inicial.
- No inferir ubicaciones desde jugador, plantel, ejercicio ni posicion habitual.
- No mezclar estadisticas de entrenamiento general con estadisticas de partido formal en el primer MVP.
- No exigir tracking detallado si alcanza con planificacion, asistencia y notas.

## Relacion con `Practica 3v3`

`Practica 3v3` debe permanecer como flujo especializado para mini partidos:

- equipos internos;
- marcador;
- target score;
- rotacion;
- eventos de punto/error/tiro defendido;
- standings;
- PDF y resumen de mini partidos.

`Modo Entrenamiento` debe ser un contenedor mas amplio de planificacion y evaluacion:

- asistencia;
- objetivo;
- bloques;
- notas;
- destacados;
- resumen.

Decision propuesta:

- En MVP, `practica 3v3` puede aparecer como tipo de bloque o bloque planificado, pero sin incrustar el flujo completo de mini partidos dentro del nuevo modo.
- En una etapa posterior, se puede vincular una sesion de `Practica 3v3` existente a un bloque de entrenamiento mediante un `linkedTrainingSessionId`.
- No reutilizar directamente `TrainingSession` como modelo principal de `Modo Entrenamiento`; usar un modelo nuevo para evitar confundir score/rotacion con planificacion.

## Usuarios / Casos de uso

- El entrenador abre `Entrenamiento`, elige `Mayores`, marca asistentes, define objetivo y arma una practica de 90 minutos con 5 bloques.
- Durante el entrenamiento, marca que el bloque `defensa/recepcion` termino y anota que varios jugadores mejoraron la orientacion defensiva.
- En un bloque de `ataque por zona`, marca destacados positivos y notas por jugador sin tener que registrar cada tiro.
- Al finalizar, revisa asistencia, bloques completados, notas y puntos de seguimiento.
- Semanas despues, consulta asistencia acumulada y progreso por jugador.

## Flujo esperado

1. Desde Home, tocar `Entrenamiento`.
2. Ver lista de entrenamientos guardados y accion `Crear entrenamiento`.
3. Elegir plantel/categoria:
   - `Mayores`;
   - `Femenino`;
   - `+40`;
   - plantel custom.
4. Marcar jugadores presentes.
5. Definir objetivo general de la sesion.
6. Agregar bloques/ejercicios.
7. Guardar como borrador o iniciar entrenamiento.
8. Durante la sesion:
   - iniciar/finalizar bloques;
   - agregar notas;
   - marcar destacados de jugadores;
   - registrar metricas basicas si el bloque lo permite.
9. Finalizar entrenamiento.
10. Revisar resumen.

## Modelo de datos propuesto

Crear un modelo separado del `TrainingSession` actual de `Practica 3v3`.

### TrainingPracticeSession

```ts
type TrainingPracticeStatus = 'draft' | 'live' | 'finished' | 'cancelled';

type TrainingPracticeSession = {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  objective: string;
  blocks: TrainingBlock[];
  notes?: string;
  status: TrainingPracticeStatus;
  archivedAt?: string;
};
```

### TrainingBlock

```ts
type TrainingBlockType =
  | 'attack'
  | 'defense'
  | 'mixed'
  | 'physical'
  | 'tactical'
  | 'scrimmage'
  | 'free';

type TrainingBlockStatus = 'planned' | 'live' | 'completed' | 'skipped';

type TrainingBlock = {
  id: string;
  sessionId: string;
  title: string;
  type: TrainingBlockType;
  durationMinutes?: number;
  objective?: string;
  participantPlayerIds?: string[];
  notes?: string;
  order: number;
  status: TrainingBlockStatus;
  startedAt?: string;
  endedAt?: string;
  events?: TrainingPracticeEvent[];
  metrics?: TrainingPracticeMetric[];
  linkedTrainingSessionId?: string;
};
```

### TrainingPracticeEvent

Primer corte recomendado: eventos livianos, no un motor tactico completo.

```ts
type TrainingPracticeEventType =
  | 'note'
  | 'player_highlight'
  | 'player_follow_up'
  | 'metric';

type TrainingPracticeEvent = {
  id: string;
  blockId: string;
  createdAt: string;
  type: TrainingPracticeEventType;
  playerId?: string;
  label?: string;
  value?: number;
  note?: string;
};
```

### TrainingPracticeMetric

```ts
type TrainingPracticeMetric = {
  id: string;
  playerId?: string;
  label: string;
  value: number;
  unit?: 'reps' | 'minutes' | 'shots' | 'successes' | 'errors' | 'custom';
};
```

## Tipos de ejercicios

Tipos MVP:

- `attack`: ataque por zona, definicion a un marco, decision de tiro.
- `defense`: defensa/recepcion, lectura de rebote, cobertura.
- `mixed`: transicion ataque-defensa, tareas combinadas.
- `physical`: circuito fisico/tecnico, movilidad, resistencia.
- `tactical`: rotacion defensiva, salida, posicionamiento colectivo.
- `scrimmage`: juego aplicado, bloque que puede referenciar `Practica 3v3`.
- `free`: bloque libre para ejercicios no tipificados.

Ejemplos de titulos:

- `Ataque por zona`;
- `Defensa/recepcion`;
- `Definicion a un marco`;
- `Rotacion defensiva`;
- `Transicion ataque-defensa`;
- `Circuito fisico/tecnico`;
- `Practica 3v3`;
- `Libre`.

## MVP Scope

### Incluido en MVP

- Entrada `Entrenamiento` desde Home.
- Crear entrenamiento.
- Seleccionar plantel.
- Marcar asistencia.
- Objetivo general.
- Crear, ordenar y editar bloques simples.
- Notas por sesion.
- Notas por bloque.
- Lifecycle: `draft`, `live`, `finished`, `cancelled`.
- Resumen:
  - asistencia;
  - bloques planificados/completados;
  - notas;
  - destacados/follow-ups si se incluyen en Stage 3.
- Persistencia offline local.
- Backup antes de considerar el modo listo para uso real.

### Excluido del MVP

- Mapas de ataque/defensa.
- PDF completo.
- Estadisticas tecnicas profundas.
- Templates avanzados.
- Integracion automatica con `Practica 3v3`.
- Progreso acumulado con tendencias visuales.
- Timers complejos por bloque.

## Respuestas a preguntas de planificacion

### `Practica 3v3` como bloque

Decision propuesta: permitir `scrimmage` / `Practica 3v3` como tipo de bloque planificado, pero mantener el flujo 3v3 separado. Vincular una sesion 3v3 existente queda para una etapa posterior.

### Stats tecnicas en MVP

Decision propuesta: el primer MVP debe incluir planificacion, asistencia y notas. Las metricas basicas pueden entrar solo si son de bajo riesgo y opcionales. No conviene frenar el modo por tracking tecnico complejo.

### Tipos mas importantes

Prioridad inicial:

1. `attack`;
2. `defense`;
3. `mixed`;
4. `tactical`;
5. `physical`;
6. `scrimmage`;
7. `free`.

### Templates

Decision propuesta: diferir templates a Stage 6 o posterior. En MVP, se puede permitir duplicar una sesion existente si eso resulta mas simple que un motor de templates.

### Timers por bloque

Decision propuesta: Stage 3 puede incluir `start/end` de bloque y timestamps. Un countdown visual por bloque queda diferido salvo que el uso de campo lo pida.

### Asistencia y planteles

Decision propuesta: asistencia debe integrarse solo con jugadores/planteles existentes (`Player` y `TeamPool`). No crear jugadores ad hoc dentro del flujo de entrenamiento.

### Archivo/eliminacion

Decision propuesta: usar el mismo concepto que `Practica 3v3`:

- `archivedAt` para limpiar listas sin perder datos;
- delete destructivo con confirmacion;
- filtros `Activos`, `Finalizados`, `Archivados`, `Todos`.

### Backup

Decision propuesta: incluir entrenamientos en backup antes de liberar el modo para uso real. Si Stage 1 es solo dominio/store interno, backup puede entrar en Stage 5, pero no deberia existir una version usable sin backup.

### Asistencia/progreso acumulado

Decision propuesta: asistencia acumulada debe ser parte de una etapa temprana de resumen historico. Progreso tecnico por jugador debe derivarse de sesiones/bloques/eventos, sin persistir contadores duplicados en el primer corte.

## Impacto en UI

Pantallas propuestas:

- `PracticeSessionsScreen`
  - lista de entrenamientos;
  - filtros por estado;
  - crear nuevo;
  - abrir detalle.
- `PracticeSetupScreen` o seccion de setup
  - elegir plantel;
  - marcar asistencia;
  - objetivo;
  - bloques.
- `LivePracticeSessionScreen`
  - objetivo;
  - bloque actual;
  - iniciar/finalizar bloque;
  - notas rapidas;
  - destacados de jugadores.
- `PracticeSummaryScreen`
  - asistencia;
  - bloques;
  - notas;
  - destacados;
  - metricas basicas.

Texto visible debe estar en espanol:

- `Entrenamiento`;
- `Crear entrenamiento`;
- `Objetivo`;
- `Asistencia`;
- `Bloques`;
- `Iniciar bloque`;
- `Finalizar bloque`;
- `Destacado`;
- `Seguimiento`;
- `Resumen del entrenamiento`.

## Impacto en estado/persistencia

Opcion recomendada:

- Crear store separado, por ejemplo `usePracticeStore`, para no sobrecargar `useTrainingStore` de `Practica 3v3`.
- Crear key propia de storage local, por ejemplo `tchoukstats:practice-state`.
- Mantener normalizadores/migraciones para sesiones antiguas.
- Incluir `practiceSessions` en backup antes de release.

Motivo:

- `useTrainingStore` ya significa `Practica 3v3`.
- `Modo Entrenamiento` tiene bloques, asistencia y notas, no mini partidos ni score.
- Separar reduce riesgo de romper stats/rotacion/PDF 3v3.

## Testing plan

### Dominio

- Crear sesion valida.
- Normalizar asistentes sin duplicados.
- Bloquear participantes fuera del plantel si se decide exigir plantel.
- Ordenar bloques por `order`.
- Validar tipos de bloque.
- Lifecycle de sesion: draft -> live -> finished/cancelled.
- Lifecycle de bloque: planned -> live -> completed/skipped.
- Resumen de asistencia.
- Resumen de bloques completados/salteados.
- Eventos legacy/incompletos no rompen builders.

### Store/persistencia

- Crear sesion persiste.
- Actualizar notas persiste.
- Iniciar/finalizar bloque actualiza timestamps.
- Archivar/restaurar/delete con confirmacion desde UI.
- Restore de backup normaliza sesiones.
- Migracion tolera estado sin `practiceSessions`.

### UI/manual

- Home muestra `Entrenamiento` separado de `Practica 3v3`.
- Crear sesion con `Mayores`.
- Marcar asistentes.
- Agregar objetivo.
- Agregar 3 bloques.
- Iniciar/finalizar bloques.
- Agregar notas.
- Finalizar sesion.
- Revisar resumen.
- Cerrar/reabrir app y confirmar persistencia.

## Riesgos

- Confundir `Entrenamiento` con `Practica 3v3` si los nombres o pantallas quedan demasiado parecidos.
- Meter tracking tecnico demasiado pronto puede hacer lenta la practica.
- Duplicar stats acumuladas en vez de derivarlas de sesiones/bloques/eventos.
- No incluir backup antes de uso real puede hacer perder datos de entrenamientos.
- Timers por bloque pueden distraer si el entrenamiento real cambia sobre la marcha.
- Vincular 3v3 dentro del modo nuevo puede crear dependencia circular entre stores si no se diseña con cuidado.

## Preguntas abiertas

- Confirmar si `Entrenamiento` debe ser la entrada amplia de Home y `Practica 3v3` quedar como accion separada o subaccion.
- Confirmar si `Practica 3v3` debe poder vincularse a un bloque desde el primer release o despues.
- Confirmar si el primer MVP debe permitir metricas numericas por jugador o solo notas/destacados.
- Confirmar lista final de tipos de bloque y nombres visibles preferidos por el cuerpo tecnico.
- Confirmar si hay una duracion tipica de entrenamiento para proponer defaults.
- Confirmar si se quiere duplicar sesiones como pseudo-template en MVP.
- Confirmar si asistencia acumulada debe aparecer en el primer resumen historico.

## Plan de implementacion

Ver `docs/plans/012-training-practice-mode-plan.md`.

## Checklist de aceptacion

- [x] `Modo Entrenamiento` queda documentado como modo separado de `Practica 3v3`.
- [x] El modelo propuesto no reutiliza `Match` ni `TrainingSession` 3v3 como entidad principal.
- [x] El MVP prioriza planificacion, asistencia y notas.
- [x] Backup queda contemplado antes de uso real.
- [x] No se agregan dependencias, backend, auth ni cloud sync.
- [x] No se toca `landingLocation`.
- [x] La UI visible planificada esta en espanol.

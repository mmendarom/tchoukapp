# Plan 011 - Modo practica 3v3 / entrenamiento

Spec relacionada: `docs/specs/011-training-3v3-scrimmage-mode.md`

Estado: Draft - Stage 1, Stage 2, Stage 3, Stage 4 and Stage 5 implemented

## Objetivo del plan

Implementar en etapas un modo de entrenamiento 3v3 separado del flujo formal de partidos. El objetivo es registrar mini partidos internos, rotaciones, stats por jugador/equipo y resumen de practica sin contaminar `Match`, `MatchEvent`, periodos oficiales ni reportes formales.

## Decision principal propuesta

Crear modelo separado:

- `TrainingSession`;
- `TrainingTeam`;
- `TrainingMiniMatch`;
- `TrainingEvent`;
- `TrainingSessionSettings`.

No reutilizar `Match` como persistencia principal del modo 3v3.

Motivo:

- `Match` asume Uruguay vs rival, 7 jugadores, periodos, lineup snapshots y reportes formales.
- Entrenamiento necesita equipos internos, mini partidos a target score, cola/rotacion y stats acumuladas por sesion.

## Etapas sugeridas

### Stage 0 - Planning/docs only

Estado: Current task.

- Crear spec.
- Crear plan.
- Actualizar implementation log.
- No tocar codigo productivo.

### Stage 1 - Domain model y store

Estado: Implemented.

Objetivo:

- Agregar tipos y acciones basicas de sesion sin UI compleja.

Archivos implementados:

- `src/domain/training.ts`
- `src/store/useTrainingStore.ts`
- `src/domain/training.test.ts`
- `src/store/useTrainingStore.test.ts`
- `src/storage/asyncStorage.ts`

Acciones implementadas:

- `createTrainingSession(input)`;
- `updateTrainingSession(id, patch)`;
- `startTrainingSession(sessionId)`;
- `createTrainingMiniMatch(sessionId, teamAId, teamBId)`;
- `recordTrainingEvent(sessionId, miniMatchId, eventInput)`;
- `finishTrainingMiniMatch(sessionId, miniMatchId)`;
- `finishTrainingSession(sessionId)`;
- `cancelTrainingSession(sessionId)`.
- `cancelMiniMatch(sessionId, miniMatchId)`;
- `undoLastTrainingEvent(sessionId, miniMatchId)`;
- `getActiveTrainingSession()`;
- `resetTrainingData()`.

Reglas:

- equipos de 3 o 4 jugadores;
- un jugador no puede estar duplicado en dos equipos activos;
- mini partido entre dos equipos distintos;
- target score default 3;
- eventos derivan score;
- cada evento guarda `scoreAfter` como snapshot de auditoria cuando se registra desde el store;
- `point` suma al equipo del evento;
- `own_point_against` suma al equipo contrario;
- `shot_defended`, `defense` y `error` no cambian score;
- llegar a target score marca ganador/perdedor y bloquea nuevos eventos hasta `undo` o `finishMiniMatch`;
- `finishMiniMatch` requiere ganador ya derivado.

Tests:

- crear sesion valida;
- bloquear equipo con menos de 3;
- bloquear equipo con mas de 4;
- bloquear jugador duplicado;
- crear mini partido;
- registrar punto;
- llegar a target score;
- calcular ganador/perdedor;
- stats por jugador/equipo.

Notas:

- Se eligio `useTrainingStore` separado de `useMatchStore`.
- Se agrego key persistida `STORAGE_KEYS.trainingState`.
- Backup/export formal queda diferido a Stage 6.
- No se tocaron modelos ni scoring de `Match`.

### Stage 2 - Setup UI

Estado: Implemented.

Objetivo:

- Permitir crear sesion desde Home.

Archivos implementados:

- `src/screens/HomeScreen.tsx`;
- `src/screens/TrainingSessionsScreen.tsx`;
- `src/utils/navigation.ts`;
- `App.tsx`;
- `src/domain/trainingSetup.ts`;
- `src/domain/trainingSetup.test.ts`.

Flujo:

1. Home -> `Practica 3v3`.
2. Elegir plantel.
3. Elegir presentes.
4. Elegir cantidad de equipos.
5. Armar equipos manualmente.
6. Target score default 3.
7. Crear sesion.
8. Ver detalle placeholder con equipos y mensaje de Stage 3 pendiente.

MVP recomendado:

- Equipos manuales.
- Auto-balance diferido.
- Manual next match selection.
- Pantalla unica para listado, setup y detalle basico.

Validaciones visibles:

- `Seleccioná al menos 6 jugadores.`
- `Cada equipo necesita 3 o 4 jugadores.`
- `Los puntos para ganar deben ser al menos 1.`
- `No se pudo crear la práctica.`

Notas:

- La UI usa asignacion uno-a-uno por fila de jugador, por lo que no permite duplicar jugador entre equipos desde la pantalla.
- Se muestran jugadores sin equipo para facilitar sesiones con 10 u 11 presentes.
- Se guarda `winnerStays`, pero no se implementa cola/rotacion todavia.
- La accion `Práctica 3v3` queda en Home bajo `Entrenamiento`.

### Stage 3 - Live mini-match tracking

Estado: Implemented.

Objetivo:

- Pantalla de mini partido rapida y usable.

Archivos implementados:

- `src/screens/LiveTrainingMiniMatchScreen.tsx`;
- `src/domain/trainingLive.ts`;
- `src/domain/trainingLive.test.ts`;
- `src/components/CourtMapInput.tsx`;
- `src/screens/TrainingSessionsScreen.tsx`;
- `src/store/useTrainingStore.ts`;
- `src/store/useTrainingStore.test.ts`;
- `src/utils/navigation.ts`;
- `App.tsx`.

Acciones:

- `Punto Equipo A`;
- `Punto Equipo B`;
- `Defensa`;
- `Tiro defendido`;
- `Error`;
- `En contra`;
- `Deshacer` si se implementa en MVP.

Reglas:

- puntos requieren equipo y tirador;
- puntos pueden abrir mapa si se decide trackear ubicacion;
- tiro defendido requiere tirador;
- defensa requiere defensor;
- en contra suma al otro equipo;
- al llegar a target score, mostrar confirmacion de ganador.
- bloquear nuevos eventos al llegar a target score;
- permitir `Deshacer` antes de cerrar el mini partido;
- `Finalizar mini partido` requiere ganador derivado;
- no iniciar segundo mini partido si ya existe uno `live`.

Mapa:

- Implementado: se reutiliza `CourtMapInput` full-court para `point` y `shot_defended`.
- Futuro: `TrainingGoalMapInput` one-frame si QA de campo lo pide.

Notas:

- El selector de jugador es modal y filtra por equipo.
- `Defensa`, `Tiro defendido` y `Error` piden primero equipo y luego jugador.
- El detalle de sesion muestra mini partidos cerrados con score, ganador y cantidad de eventos.
- No hay rotacion/cola automatica; eso sigue en Stage 4.

### Stage 4 - Rotacion y cola

Estado: Implemented.

Objetivo:

- Resolver continuidad entre mini partidos.

MVP:

- Despues de confirmar ganador:
  - mostrar ganador;
  - mostrar perdedor;
  - sugerir siguiente equipo de cola;
  - permitir seleccion manual.

Archivos implementados:

- `src/domain/training.ts`;
- `src/store/useTrainingStore.ts`;
- `src/screens/TrainingSessionsScreen.tsx`;
- `src/screens/LiveTrainingMiniMatchScreen.tsx`;
- `src/domain/training.test.ts`;
- `src/store/useTrainingStore.test.ts`.

Reglas implementadas:

- `teamQueue` persiste el orden actual de equipos.
- Sesiones antiguas sin `teamQueue` migran derivando el orden desde `queueOrder`.
- `getTrainingQueue` devuelve cola normalizada.
- `getSuggestedNextMiniMatch` sugiere el primer cruce valido cuando no hay mini partido activo.
- `advanceTrainingQueueAfterMiniMatch` mueve la cola al finalizar un mini partido.
- `winnerStays: true`: ganador queda, siguiente esperando entra, perdedor va al fondo.
- `winnerStays: false`: ambos equipos rotan al fondo y juegan los dos siguientes disponibles.
- Con dos equipos, se sugiere revancha.
- El proximo partido no arranca solo; requiere tocar `Iniciar proximo`.
- El override manual sigue disponible con `Elegir manualmente`.

Tests agregados:

- cola inicial;
- sugerencia con 2, 3 y 4 equipos;
- perdedor al fondo;
- ambos equipos rotan cuando `winnerStays` es false;
- override manual actualiza la siguiente sugerencia;
- bloqueo si ya hay mini partido activo;
- bloqueo en sesion cerrada.

Futuro:

- edicion de cola;
- modos de rotacion mas avanzados;
- rachas.

Tests:

- ganador queda sugerido;
- perdedor sale;
- siguiente equipo sugerido respeta cola;
- override manual crea mini partido correcto.

### Stage 5 - Session summary

Estado: Implemented.

Objetivo:

- Resumen in-app de practica.

Archivos implementados:

- `src/domain/training.ts`;
- `src/domain/training.test.ts`;
- `src/screens/TrainingSessionsScreen.tsx`;
- `docs/specs/011-training-3v3-scrimmage-mode.md`;
- `docs/plans/011-training-3v3-scrimmage-mode-plan.md`;
- `docs/implementation-log.md`.

Secciones:

- `Resumen de la practica`;
- `Tabla de equipos`;
- `Top ataque`;
- `Top defensa`;
- `Alertas`;
- `Rendimiento jugadores`;
- `Historial de mini partidos`.

Stats implementadas:

- jugador: puntos, intentos, efectividad, tiros defendidos, puntos en contra, errores, defensas, partidos jugados, ganados/perdidos, win rate y plus/minus;
- equipo: jugados, ganados, perdidos, win rate, puntos a favor, puntos en contra y diferencia;
- sesion: mini partidos totales/finalizados, mini partido activo, puntos totales, tops y alertas concretas.

Reglas:

- ataque ordena por puntos, intentos y efectividad;
- efectividad pura usa minimo de 2 intentos;
- defensa ordena por defensas;
- tabla de equipos ordena por ganados, diferencia y puntos a favor;
- mini partidos cancelados no suman a standings ni rankings.

Tests:

- standings ordenados;
- rankings por jugador;
- stats acumuladas de mini partidos;
- intentos = puntos + tiros defendidos + puntos en contra;
- efectividad segura con 0 intentos;
- plus/minus;
- mini partidos cancelados excluidos;
- jugadores sin eventos no rompen resumen.

### Stage 6 - Backup/export polish

Objetivo:

- Hacer que el modo sea durable y compartible.

Opciones:

- Incluir `trainingSessions` en backup.
- Texto compartible:
  - standings;
  - top jugadores;
  - mini match history.
- PDF diferido si el resumen in-app ya esta validado.

Archivos probables:

- `src/domain/backup.ts`;
- `src/export/reportHtml.ts` solo si se decide PDF compartido;
- nuevo `src/domain/trainingReportData.ts`;
- nuevo `src/export/trainingReportHtml.ts`.

## Impacto estimado de archivos

Dominio:

- nuevo `src/domain/trainingTypes.ts` o extension controlada de `types.ts`;
- nuevo `src/domain/trainingSession.ts`;
- nuevo `src/domain/trainingStats.ts`;
- posible nuevo `src/domain/trainingRotation.ts`.

Store:

- opcion A: extender `useMatchStore` con `trainingSessions`;
- opcion B: crear `useTrainingStore`.

Decision recomendada:

- Si backup/hidratacion sigue siendo una sola unidad local, extender store actual con seccion `trainingSessions` puede ser mas simple.
- Si el archivo crece demasiado, separar acciones puras en helpers de dominio y mantener store como orquestador.

UI:

- Home entry.
- Training sessions list.
- Setup/team builder.
- Live mini match.
- Summary.

Navigation:

- agregar rutas training a `RootStackParamList`.

Tests:

- dominio primero;
- store/persistencia despues;
- UI con QA manual, salvo helpers testeables.

## Estrategia de test

Priorizar funciones puras:

- validacion de equipos;
- creacion de mini matches;
- reducer/acciones de eventos;
- calculo de score;
- standings;
- stats por jugador;
- rotacion.

Store:

- migracion de version;
- crear sesion;
- persistir eventos;
- old state sin `trainingSessions`.

UI:

- evitar snapshots fragiles;
- documentar QA manual para setup, live y resumen.

## QA manual sugerido

- Abrir Home.
- Confirmar `Practica 3v3`.
- Elegir plantel `Mayores`.
- Seleccionar 9 jugadores.
- Crear 3 equipos de 3.
- Target score default 3.
- Iniciar Equipo A vs Equipo B.
- Registrar punto de jugador A.
- Registrar tiro defendido contra jugador A.
- Registrar defensa de jugador B.
- Registrar punto en contra.
- Confirmar que el score llega a 3 y aparece ganador.
- Elegir siguiente equipo manualmente.
- Terminar sesion.
- Confirmar standings.
- Confirmar stats por jugador.
- Confirmar resumen de mini matches.
- Cerrar y reabrir app, confirmar persistencia.

## Riesgos

- UI live con demasiadas acciones puede ser lenta para practica.
- Auto-rotacion puede equivocarse con reglas reales de entrenamiento.
- Mapa one-frame puede duplicar geometria si no se disena desde `courtVisual`.
- Usar `MatchEvent` puede contaminar reportes formales; evitarlo.
- No incluir undo puede ser riesgoso en tracking rapido; decidir antes de Stage 3.

## Decisiones necesarias antes de Stage 1

- Store unico vs store separado.
- Tipos en `types.ts` vs `trainingTypes.ts`.
- Si MVP incluye undo.
- Si puntos requieren ubicacion en practica.
- Full-court map vs one-frame map.
- Si target score es configurable desde el primer release.
- Si training sessions entran en backup en Stage 1 o Stage 6.

## Open questions capturadas

- ¿Team creation manual only en MVP o auto-balance?
- ¿Equipos de 4 rotan internamente o juegan como equipo de 4?
- ¿Un jugador puede pertenecer a mas de un equipo por sesion?
- ¿Se pueden editar equipos mid-session?
- ¿Target score siempre 3 o configurable?
- ¿Winner-stays automatico o confirmado manualmente?
- ¿Mapa one-frame o cancha completa?
- ¿PDF desde dia uno o diferido?

## Criterios de salida del MVP

- El usuario puede crear una practica 3v3 desde Home.
- Puede crear equipos de 3/4 desde un plantel.
- Puede registrar mini partidos a 3 puntos.
- Puede continuar rotacion manualmente.
- Puede ver resumen de sesion.
- Stats se derivan de eventos.
- Persistencia local funciona.
- Modo formal no cambia.
- Tests de dominio/store pasan.

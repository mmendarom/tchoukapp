# Spec 011 - Modo practica 3v3 / entrenamiento

## Estado

Draft - Stages 1-8 implemented; single-goal tactical model unified

## Problema

La app esta optimizada para partidos formales de tchoukball: `Match` asume Uruguay vs rival, 7 jugadores en cancha, tiempos oficiales, banco, periodos, resumen final y reporte de partido. En entrenamiento, muchas veces el cuerpo tecnico trabaja con 9, 10 u 11 jugadores y arma equipos internos de 3 o 4 para jugar mini partidos intensos, normalmente a 3 puntos, con rotacion del equipo perdedor.

Forzar ese flujo dentro de `Match` crearia reglas falsas:

- no hay Uruguay vs rival externo;
- no hay 7 titulares;
- no hay 3 tiempos oficiales;
- los dos equipos son internos y comparten el mismo plantel;
- se necesita una tabla de practica, cola de equipos y stats acumuladas por jugador/equipo.

## Objetivos

- Planificar un modo nuevo desde Home: `Practica 3v3` o `Modo entrenamiento`.
- Permitir elegir un plantel base y participantes presentes.
- Permitir crear equipos internos de 3 o 4 jugadores.
- Registrar mini partidos a puntaje objetivo, por defecto 3.
- Registrar puntos, tiros defendidos, defensas, errores y puntos en contra en contexto de equipos internos.
- Registrar y resumir estadisticas por jugador, por equipo y por sesion.
- Mantener el modo formal de partidos intacto.
- Mantener offline-first y persistencia local.
- Reusar jugadores, planteles, mapas y helpers tacticos cuando encajen sin acoplarse a supuestos de partido formal.

## No objetivos

- No implementar codigo en esta etapa.
- No reemplazar el flujo formal de partidos.
- No forzar equipos internos dentro de `Match`.
- No agregar backend, auth, cloud sync ni servicios pagos.
- No agregar dependencias nuevas.
- No implementar PDF/export en el MVP si retrasa el tracking en vivo.
- No resolver automaticamente balance perfecto de equipos sin validacion de campo.
- No inferir ubicaciones desde posicion del jugador.

## Usuarios / Casos de uso

- El entrenador llega a una practica con 10 jugadores, selecciona el plantel `Mayores`, marca asistentes, arma 3 equipos y empieza una rotacion.
- Un equipo gana 3-1, el perdedor sale, entra el siguiente equipo y se registra otro mini partido.
- El cuerpo tecnico revisa al final quien anoto mas, quien defendio mas, quien tuvo mejor efectividad, que equipo gano mas y que jugadores acumularon errores.
- La sesion queda disponible en backup local para no perder historial.

## Flujo de usuario propuesto

1. Desde Home, tocar `Practica 3v3`.
2. Seleccionar plantel base:
   - `Mayores`;
   - `Femenino`;
   - `+40`;
   - planteles creados por el usuario.
3. Seleccionar jugadores presentes.
4. Elegir cantidad de equipos.
5. Armar equipos manualmente.
6. Permitir equipos de 3 o 4 jugadores.
7. Definir puntaje objetivo, default `3`.
8. Iniciar sesion.
9. Seleccionar los dos equipos que juegan primero.
10. Registrar mini partido.
11. Al llegar al puntaje objetivo, confirmar ganador/perdedor.
12. Sacar al perdedor y elegir el proximo equipo, con sugerencia de cola si aplica.
13. Continuar hasta terminar sesion.
14. Ver resumen de sesion.

## Modelo de dominio propuesto

Se recomienda un modelo separado de `Match`.

### TrainingSession

```ts
type TrainingSessionStatus = 'draft' | 'live' | 'finished' | 'cancelled';

type TrainingSession = {
  id: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  teams: TrainingTeam[];
  miniMatches: TrainingMiniMatch[];
  activeMiniMatchId?: string;
  settings: TrainingSessionSettings;
  status: TrainingSessionStatus;
  archivedAt?: string;
  notes?: string;
};
```

### Archivo y eliminacion de sesiones

- `archivedAt` es independiente de `status`: una sesion draft, live, finished o cancelled puede archivarse.
- Sesiones sin `archivedAt`, incluidas las persistidas antes de Stage 6B, se consideran no archivadas.
- Archivar es la accion segura: oculta la sesion de las vistas principales y conserva todos sus datos.
- Restaurar una sesion archivada elimina `archivedAt`, pero no la reactiva automaticamente.
- Eliminar remueve la sesion de forma permanente y requiere confirmacion visible.
- Archivar o eliminar una sesion activa limpia `activeTrainingSessionId`; no modifica mini partidos, eventos ni scoring antes de archivar.
- La lista ofrece filtros `Activas`, `Finalizadas`, `Archivadas` y `Todas`; `Activas` es el default.

### TrainingSessionSettings

```ts
type TrainingRotationMode = 'winner_stays' | 'manual';

type TrainingSessionSettings = {
  targetScore: number;
  minTeamSize: 3;
  maxTeamSize: 4;
  rotationMode: TrainingRotationMode;
};
```

MVP recomendado:

- `targetScore: 3`;
- `rotationMode: 'manual'` con sugerencia de `winner_stays` documentada.

### TrainingTeam

```ts
type TrainingTeam = {
  id: string;
  sessionId: string;
  name: string;
  playerIds: string[];
  color?: string;
  queueIndex: number;
};
```

Reglas:

- Un jugador pertenece a un solo equipo activo por sesion en el MVP.
- Equipos de 3 o 4 jugadores son validos.
- La edicion de equipos durante sesion queda como decision abierta.

### TrainingMiniMatch

```ts
type TrainingMiniMatchStatus = 'draft' | 'live' | 'finished' | 'cancelled';

type TrainingMiniMatch = {
  id: string;
  sessionId: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  targetScore: number;
  winnerTeamId?: string;
  loserTeamId?: string;
  status: TrainingMiniMatchStatus;
  startedAt?: string;
  endedAt?: string;
  events: TrainingEvent[];
};
```

### TrainingEvent

```ts
type TrainingEventType =
  | 'point'
  | 'defense'
  | 'shot_defended'
  | 'error'
  | 'own_point_against';

type TrainingEvent = {
  id: string;
  sessionId: string;
  miniMatchId: string;
  createdAt: string;
  teamId: string;
  playerId?: string;
  type: TrainingEventType;
  location?: CourtLocation;
  defenderPlayerId?: string;
  defendingTeamId?: string;
  errorSubtype?: 'invasion' | 'line_step' | 'turnover';
  errorType?: 'falta' | 'punto_en_contra' | 'turnover' | 'other';
  scoreAfter?: {
    teamA: number;
    teamB: number;
  };
};
```

Notas:

- `point` requiere `teamId`, `playerId` y `location` si se decide trackear ubicacion.
- `shot_defended` representa un tiro de un jugador que el equipo contrario defendio; para eventos nuevos requiere `playerId`, `defenderPlayerId`, `defendingTeamId` y puede requerir `location`.
- `defense` representa defensa realizada por un jugador del equipo que defendio y queda como evento legacy/deprecated en UI live; sesiones antiguas lo siguen contando como defensa.
- `own_point_against` suma punto al otro equipo y requiere el jugador que cometio el error si se registra.
- `errorSubtype` distingue `invasion`, `line_step` y `turnover`; `own_point_against` no se mezcla con `error` porque cambia score e intentos.
- Los nombres son training-specific para evitar cargar semantica `uruguay/opponent` en equipos internos.

## Tracking rules

### Eventos MVP

La UI live actual es jugador-centrica:

- El entrenador toca un jugador y luego elige `Punto`, `Lo atajaron` o `Error`.
- `Punto`
  - el jugador tocado es el tirador;
  - abre mapa one-frame;
  - guarda `point`, ubicacion, +1 al equipo del jugador, punto e intento para el jugador.
- `Lo atajaron`
  - el jugador tocado es el tirador;
  - pide `¿Quién lo atajó?` con jugadores del equipo contrario;
  - abre mapa one-frame;
  - guarda `shot_defended` con tirador, defensor, equipo atacante, equipo defensor y ubicacion;
  - no cambia score;
  - suma intento/tiro atajado al tirador y defensa al defensor.
- `Error`
  - abre un segundo menu:
    - `Punto en contra`: guarda `own_point_against`, suma +1 al rival y cuenta intento errado/punto en contra al jugador;
    - `Invasión`: guarda `errorSubtype: 'invasion'`, no cambia score;
    - `Pisa la línea`: guarda `errorSubtype: 'line_step'`, no cambia score;
    - `Perdió la pelota`: guarda `errorSubtype: 'turnover'`, no cambia score.
- La UI live ya no crea eventos `defense` independientes; `defense` queda solo para compatibilidad con sesiones ya guardadas.

### Mapa

Stage 7 implementado:

- `TrainingGoalMapInput` muestra un solo marco, area semicircular y guias `0° fondo`, `45° intermedio`, `90° centro del area`.
- `point` usa `¿Donde cayo el punto?`; `shot_defended` usa `¿Donde fue defendido el tiro?`.
- Las coordenadas siguen siendo `CourtLocation { x, y }` normalizadas entre 0 y 1, pero en training representan el area one-frame.
- No se agrega migracion ni metadata obligatoria: eventos training legacy sin scope siguen cargando y calculando stats.
- Los mapas formales continúan full-court y sus coordenadas conservan la semantica anterior.
- No se aplican sectores tacticos formales a training.
- `deriveTrainingGoalSector(location)` interpreta ubicaciones de training como un solo marco y emite solo:
  - `lado izquierdo · 0°-30°`;
  - `lado izquierdo · 30°-60°`;
  - `centro · 60°-90°`;
  - `lado derecho · 30°-60°`;
  - `lado derecho · 0°-30°`.
- Training no usa `marco izquierdo`, `marco derecho`, `zona izquierda`, `zona derecha` ni angulos mayores a 90°.
- Eventos training antiguos con `{x,y}` capturados antes del mapa one-frame no se migran; desde este ajuste se interpretan como relativos a un solo marco para cualquier texto/resumen training.

## Rotacion

### Regla default de campo

- Mini partido a 3 puntos.
- Pierde un equipo, sale.
- Ganador puede quedarse.
- Siguiente equipo de la cola entra.

### MVP recomendado

- Confirmar ganador al llegar a target score.
- Mostrar sugerencia:
  - ganador se queda;
  - perdedor sale;
  - siguiente equipo sugerido por cola.
- Permitir seleccion manual del proximo mini partido para evitar automatismos erroneos.

### Futuro

- `winner_stays` automatico.
- `both_rotate`.
- edicion manual de cola.
- rachas.

## Estadisticas

### Por jugador

- puntos;
- tiros intentados;
- tiros defendidos por rival;
- efectividad;
- defensas;
- errores;
- puntos en contra;
- mini partidos jugados;
- mini partidos ganados;
- mini partidos perdidos;
- win rate;
- diferencial de puntos mientras su equipo jugo;
- rachas o MVP de practica en etapa futura.

Formula MVP:

- `attempts = points + shot_defended + own_point_against`.
- `effectiveness = points / attempts`.
- `shot_defended` suma intento y tiro atajado al tirador.
- `shot_defended` con `defenderPlayerId` suma defensa al defensor.
- `defense` legacy sigue contando como defensa si tiene `playerId`, pero la UI live nueva no lo crea.
- `error` con `invasion`, `line_step` o `turnover` cuenta como error comun y no cambia score.
- `own_point_against` queda separado de errores comunes porque suma punto al rival y cuenta como intento errado/punto en contra.

### Barras visuales de rendimiento

- El detalle de sesion muestra `Rendimiento jugadores` con barras visuales para `Ataque` y `Defensa`.
- Ataque:
  - ordena por puntos, intentos, efectividad y fallback jugador/equipo;
  - la barra suave representa tiros generados/intentos;
  - la barra fuerte representa puntos convertidos;
  - muestra texto compacto como `4/6 tiros · 67%` y desglose `1 atajado · 1 errado` cuando aplica.
- Defensa:
  - ordena por defensas, porcentaje de contribucion defensiva y fallback jugador/equipo;
  - `shot_defended.defenderPlayerId` es la fuente principal de defensas;
  - eventos legacy `defense` con `playerId` siguen contando;
  - muestra texto compacto como `3 defensas · 43%`.
- Se destacan los dos primeros grupos de ranking con empates incluidos.
- Jugadores con cero intentos no se destacan en ataque; jugadores con cero defensas no se destacan en defensa.
- PDF de practica sigue diferido.

### Por equipo

- mini partidos jugados;
- ganados/perdidos;
- puntos a favor;
- puntos en contra;
- diferencial;
- racha actual;
- promedio de puntos por mini partido;
- defensas totales;
- errores totales.

### Por sesion

- tabla de posiciones;
- top atacantes;
- top defensores;
- jugadores mas eficientes;
- jugadores con errores repetidos;
- jugadores bloqueados/retenidos por defensas rivales;
- sectores tacticos principales si hay ubicaciones.

## UX propuesta

### Home

Agregar accion de nivel app:

- `Practica 3v3`

Ubicacion sugerida:

- Nueva seccion `Entrenamiento`, cerca de `Partido` y `Gestion`.

### Pantallas

- `TrainingSessionsScreen`
  - lista de sesiones guardadas;
  - continuar sesion activa;
  - abrir resumen de sesion terminada.
- `TrainingSetupScreen`
  - elegir plantel;
  - seleccionar presentes;
  - target score;
  - cantidad de equipos.
- `TrainingTeamBuilderScreen`
  - equipos manuales;
  - validacion 3/4 jugadores;
  - colores/nombres simples.
- `LiveTrainingMiniMatchScreen`
  - marcador Equipo A vs Equipo B;
  - target score visible;
  - acciones grandes;
  - selector de jugador por equipo;
  - cola/proximo equipo visible.
- `TrainingSessionSummaryScreen`
  - standings;
  - rankings de jugador;
  - historial de mini partidos;
  - mapas si hay ubicacion.

### Live mini-match UI

Labels actuales:

- Botones grandes por jugador dentro de cada equipo.
- `Punto`
- `Lo atajaron`
- `Error`
- `Punto en contra`
- `Invasión`
- `Pisa la línea`
- `Perdió la pelota`
- `¿Quién lo atajó?`
- `¿Dónde cayó el punto?`
- `¿Dónde fue defendido el tiro?`
- `Terminar mini partido`
- `Siguiente partido`

Reglas UX:

- El flujo principal es `toco jugador -> elijo que paso`.
- No registrar defensas sueltas desde UI live.
- Filtrar defensor por equipo contrario cuando se elige `Lo atajaron`.
- Mostrar target score y equipo que esta cerca de ganar.
- Mantener botones grandes, legibles y en espanol.

## Relacion con modo formal

Reusar con cuidado:

- `Player` y `TeamPool`.
- `CourtLocation`, `CourtMapInput`, `CourtLocationMap`.
- `courtVisual` y `court` si se mantiene full-court.
- Helpers de labels de jugador si se extraen.
- Patrones de stats puros y tests.
- Backup/export infrastructure en etapa posterior.

No reutilizar directamente:

- `Match`, porque asume `uruguay/opponent`, 7 jugadores, periodos y lineup snapshots.
- `MatchEvent`, porque los equipos internos no son `TeamSide`.
- `LineupSnapshot`, porque no hay 7 slots ni banco formal.
- `reportData` de partido formal, salvo patrones de builder.

## Persistencia / backup

Stage 6A implementado:

- `useTrainingStore` sigue persistiendo sesiones por separado y offline-first.
- Backup v2 incluye `trainingSessions` completas.
- Las sesiones archivadas se incluyen y `archivedAt` se preserva en export/import; las eliminadas ya no forman parte del store ni del backup.
- Backup v1 sin `trainingSessions` sigue importando y usa `[]`.
- Restore reemplaza todas las sesiones, no hace merge, las normaliza y limpia `activeTrainingSessionId`.
- No se modifican `matches`, scoring formal, scoring de entrenamiento ni reportes PDF.

## Reporte / export

Stage 8 implementado:

- El detalle de sesion permite `Compartir resumen` mediante el share nativo de React Native.
- El texto compacto esta pensado para WhatsApp, notas y chat de equipo.
- Reutiliza stats Stage 5 para standings, ataque, defensa, errores y puntos en contra.
- Si hay ubicaciones, agrega secciones compactas `Zonas donde más convertimos` y `Zonas donde más nos defendieron` usando labels tacticos one-goal de training.
- Incluye hasta 5 equipos, 5 atacantes, 5 defensores, 3 alertas de cada tipo y 10 mini partidos.
- Mini partidos cancelados se excluyen del conteo/historial y de stats, consistente con el dominio existente.
- Sesiones vacias, activas, archivadas o con pocos datos generan texto seguro.
- No cambia scoring, persistencia, backup, mapas ni reportes formales.

PDF de practica sigue diferido.

Prioridad:

1. resumen in-app;
2. persistencia/backup;
3. texto compartible corto - implementado Stage 8;
4. PDF de sesion - diferido.

PDF futuro:

- `Resumen de practica`;
- equipos;
- standings;
- stats por jugador;
- mini matches;
- mapas/sectores si hay ubicaciones.

## Compatibilidad

- El modo formal sigue intacto.
- Partidos viejos no se migran a sesiones.
- Training sessions viejas deben tolerar eventos incompletos cuando existan migraciones futuras.
- Edicion de jugadores posterior puede cambiar nombres visibles historicos, igual que hoy en reportes formales.

## Plan por etapas

1. Stage 0 - Planning/docs only. Implemented.
2. Stage 1 - Domain model y store. Implemented.
3. Stage 2 - Setup UI. Implemented.
4. Stage 3 - Live mini-match tracking. Implemented.
5. Stage 4 - Rotacion y cola. Implemented.
6. Stage 5 - Resumen de sesion. Implemented.
7. Stage 6 - Backup/export polish.

## Stage 1 implementado

Archivos:

- `src/domain/training.ts`
- `src/store/useTrainingStore.ts`
- `src/domain/training.test.ts`
- `src/store/useTrainingStore.test.ts`

Modelo agregado:

- `TrainingSession`
- `TrainingTeam`
- `TrainingMiniMatch`
- `TrainingEvent`
- `TrainingSessionSettings`

Store:

- Se agrego `useTrainingStore` separado de `useMatchStore`.
- Se persiste con key propia `tchoukstats:training-state`.
- No se modifica la persistencia de partidos formales.

Acciones implementadas:

- `createTrainingSession`
- `updateTrainingSession`
- `startTrainingSession`
- `cancelTrainingSession`
- `finishTrainingSession`
- `startMiniMatch`
- `finishMiniMatch`
- `cancelMiniMatch`
- `recordTrainingEvent`
- `undoLastTrainingEvent`
- `getActiveTrainingSession`
- `resetTrainingData`

Reglas implementadas:

- Equipos de 3 o 4 jugadores.
- Un jugador no puede estar en dos equipos de una misma sesion.
- Todos los jugadores de equipo deben pertenecer a `participantPlayerIds`.
- `targetScore` default 3 y minimo efectivo 1.
- `winnerStays` default `true`.
- `point` suma 1 al equipo del evento.
- `own_point_against` suma 1 al equipo contrario.
- `shot_defended`, `defense` y `error` no cambian score.
- Al llegar al target score se marca `winnerTeamId` y `loserTeamId`; el mini partido queda `live` hasta confirmarlo con `finishMiniMatch`.
- Cuando hay ganador marcado, nuevos eventos quedan bloqueados para evitar doble conteo; `undoLastTrainingEvent` puede revertir el ultimo evento y limpiar ganador.

Stats implementadas:

- `getTrainingSessionStats(session)` devuelve:
  - player stats: puntos, intentos, tiros defendidos, puntos en contra, errores, defensas, mini partidos jugados, ganados y perdidos;
  - team stats: jugados, ganados, perdidos, puntos a favor, puntos en contra y diferencial.
- Formula actual de intentos:
  - `attempts = points + shotsDefended + ownPointsAgainst`.

Limitaciones actuales:

- Sin UI.
- Sin rotacion/cola automatica.
- Sin PDF/export.
- Sin integracion en backup formal.
- Sin heatmaps/resumen visual one-frame; Stage 7 solo optimiza la captura y conserva ubicaciones.
- Sin auto-balance.

## Stage 2 implementado

Archivos:

- `src/screens/TrainingSessionsScreen.tsx`
- `src/domain/trainingSetup.ts`
- `src/domain/trainingSetup.test.ts`
- `src/screens/HomeScreen.tsx`
- `src/utils/navigation.ts`
- `App.tsx`

UI agregada:

- Home muestra una nueva seccion `Entrenamiento`.
- La accion `Práctica 3v3` abre `TrainingSessionsScreen`.
- La pantalla permite:
  - elegir plantel;
  - seleccionar participantes;
  - elegir 2, 3 o 4 equipos segun cantidad de participantes;
  - asignar jugadores manualmente a `Equipo 1`, `Equipo 2`, `Equipo 3` o `Equipo 4`;
  - dejar jugadores seleccionados sin equipo;
  - definir `Puntos para ganar`;
  - guardar `Ganador queda`.
- La pantalla muestra sesiones guardadas y un detalle placeholder con equipos/configuracion.
- El detalle indica `Tracking en vivo pendiente para Stage 3`.

Validaciones visibles:

- `Seleccioná al menos 6 jugadores.`
- `Cada equipo necesita 3 o 4 jugadores.`
- `Los puntos para ganar deben ser al menos 1.`
- Si el store rechaza el input, se muestra `No se pudo crear la práctica.`

Limitaciones actuales:

- Sin tracking live de mini partido.
- Sin seleccion de proximo partido/cola.
- Sin rotacion automatica.
- Sin borrar o archivar sesiones.
- Sin export/PDF.
- Sin integracion de training sessions en backup.

## Stage 3 implementado

Archivos:

- `src/screens/LiveTrainingMiniMatchScreen.tsx`
- `src/domain/trainingLive.ts`
- `src/domain/trainingLive.test.ts`
- `src/components/CourtMapInput.tsx`
- `src/screens/TrainingSessionsScreen.tsx`
- `src/store/useTrainingStore.ts`
- `src/store/useTrainingStore.test.ts`
- `src/utils/navigation.ts`
- `App.tsx`

Flujo agregado:

- Desde el detalle de una sesion, el usuario puede elegir `Equipo A` y `Equipo B`.
- `Iniciar mini partido` llama `startTrainingSession` y `startMiniMatch`.
- Se abre una pantalla live para el mini partido.
- Si ya hay un mini partido `live`, no se puede iniciar otro en la misma sesion.

Acciones live:

- `Punto {Equipo}`:
  - selecciona jugador de ese equipo;
  - abre mapa full-court reutilizando `CourtMapInput`;
  - guarda `location`;
  - suma 1 al equipo.
- `En contra {Equipo}`:
  - selecciona jugador de ese equipo;
  - suma 1 al equipo contrario.
- `Defensa`:
  - selecciona equipo y jugador;
  - no cambia score.
- `Tiro defendido`:
  - selecciona equipo atacante y jugador;
  - abre mapa full-court;
  - guarda `location`;
  - no cambia score.
- `Error`:
  - selecciona equipo y jugador;
  - no cambia score.
- `Deshacer`:
  - revierte el ultimo evento y recalcula score/ganador.

Target score:

- Al llegar al target score se marca `winnerTeamId` y `loserTeamId`.
- El mini partido queda bloqueado para nuevos eventos hasta `Deshacer` o `Finalizar mini partido`.
- `Finalizar mini partido` marca el mini partido como `finished`.

Historial:

- El detalle de sesion muestra mini partidos cerrados con score, ganador y cantidad de acciones.

Limitaciones actuales:

- La rotacion/cola queda cubierta en Stage 4.

## Stage 4 implementado

Se agrego flujo de rotacion y cola para sesiones de `Practica 3v3`.

Reglas implementadas:

- Cada sesion guarda `teamQueue` como snapshot persistido de orden de equipos.
- Sesiones viejas sin `teamQueue` derivan cola desde `queueOrder`.
- Con `winnerStays: true`, el ganador queda primero, entra el siguiente equipo esperando y el perdedor va al fondo.
- Con `winnerStays: false`, ambos equipos que jugaron rotan al fondo y entran los dos siguientes disponibles.
- Con solo dos equipos, el proximo sugerido es revancha entre los mismos equipos.
- El proximo mini partido se sugiere, pero no se inicia automaticamente.
- El entrenador puede ignorar la sugerencia y usar `Elegir manualmente`.

UI implementada:

- El detalle de sesion muestra `Cola`, estados `jugando`, `esperando` y `ultimo perdedor`.
- Al no haber mini partido activo, muestra `Proximo sugerido` con accion `Iniciar proximo`.
- La pantalla live, despues de finalizar un mini partido, muestra la sugerencia siguiente y permite iniciarla.

Limitaciones:

- No hay edicion manual de orden de cola todavia.
- No hay standings avanzados de sesion.
- No hay export/PDF de entrenamiento.
- No hay auto-balance ni one-frame map.

## Stage 5 implementado

Se agrego resumen estadistico in-app para `Practica 3v3`.

Stats de jugador:

- puntos;
- tiros/intentados;
- efectividad;
- tiros defendidos;
- puntos en contra;
- errores;
- defensas;
- mini partidos jugados;
- ganados/perdidos;
- win rate;
- plus/minus.

Stats de equipo:

- jugados;
- ganados;
- perdidos;
- win rate;
- puntos a favor;
- puntos en contra;
- diferencia.

Resumen de sesion:

- mini partidos totales y finalizados;
- mini partido activo si existe;
- puntos totales;
- top ataque;
- top defensa;
- jugadores mas eficientes con minimo de intentos;
- mas errores;
- mas puntos en contra.

Reglas de ranking:

- ataque prioriza puntos, luego intentos, luego efectividad;
- efectividad pura usa minimo de intentos para evitar ruido;
- defensa prioriza cantidad de defensas;
- errores y puntos en contra ordenan por cantidad;
- tabla de equipos ordena por ganados, diferencia y puntos a favor.

UI implementada:

- `Resumen de la practica`;
- `Tabla de equipos`;
- `Top ataque`;
- `Top defensa`;
- `Alertas`;
- `Rendimiento jugadores`;
- `Historial de mini partidos`.

Limitaciones:

- No hay PDF de entrenamiento; el resumen textual se comparte desde Stage 8.
- No hay heatmaps tacticos especificos de practica.
- No hay edicion del contenido de sesiones ya creadas; archivo/restauracion/delete estan disponibles desde Stage 6B.
- Sin inicio automatico del siguiente mini partido.
- Sin standings completos de sesion.
- Sin PDF de training sessions; resumen textual compartible disponible desde Stage 8 y backup JSON mantiene datos crudos.
- Sin mapa one-frame dedicado.

## Testing plan

### Dominio

- crear sesion con participantes validos;
- bloquear sesion sin participantes suficientes;
- crear equipos de 3/4;
- rechazar jugador duplicado en dos equipos;
- crear mini partido entre dos equipos distintos;
- registrar punto y actualizar score;
- terminar mini partido al target score;
- calcular ganador/perdedor;
- calcular standings;
- calcular stats por jugador;
- calcular efectividad;
- undo de evento si se implementa;
- eventos legacy/incompletos no crashean.

### Store/persistencia

- migracion agrega `trainingSessions: []`;
- crear sesion persiste;
- terminar sesion persiste;
- backup incluye sesiones desde Stage 6A.
- backup preserva `archivedAt` desde Stage 6B.
- ubicaciones capturadas desde Stage 7 son one-frame-relative sin cambiar `{x,y}`.

### UI/manual

- Home muestra `Practica 3v3`.
- Setup permite elegir plantel y presentes.
- Equipo con menos de 3 jugadores muestra error.
- Mini partido permite registrar puntos rapido.
- Mapa training permite registrar punto/tiro defendido en lado izquierdo 0°, lado izquierdo 45°, centro 90°, lado derecho 45° y lado derecho 0°.
- Resumen compartible training usa `lado izquierdo`, `centro`, `lado derecho` y bandas hasta 90°.
- Ningun texto de training debe mostrar `marco izquierdo` o `marco derecho`; los reportes formales si conservan su modelo full-court.
- Al llegar a 3, se confirma ganador.
- Proximo partido se puede seleccionar manualmente.
- Resumen muestra standings y rankings.
- Detalle de sesion muestra barras visuales de ataque/defensa.
- `Lo atajaron` alimenta intento/tiro atajado del tirador y defensa del defensor en las barras.
- Eventos legacy `defense` no rompen las barras.

## Riesgos

- Mezclar entrenamiento con `Match` puede romper reglas formales.
- Auto-balance puede ser mas opinionado que util si no conoce niveles reales.
- One-frame map puede mejorar precision de practica, pero agrega otro renderer tactico.
- Muchas acciones en vivo pueden hacer lenta la practica.
- Rotacion automatica puede equivocarse si el entrenador decide variar reglas.

## Preguntas abiertas

- ¿El MVP debe tener equipos manuales solamente o auto-balance inicial?
- ¿Los equipos de 4 cuentan siempre los 4 jugadores o rota uno internamente?
- ¿Un jugador puede pertenecer a mas de un equipo en una misma sesion?
- ¿Se pueden editar equipos a mitad de sesion?
- ¿El target score siempre es 3 o configurable desde Stage 1?
- ¿Winner-stays debe ser automatico o confirmado manualmente?
- Resuelto Stage 7: nuevas capturas training usan mapa one-frame; mapas formales siguen full-court.
- ¿Tracking de ubicacion es obligatorio para puntos o opcional en practica?
- Resuelto: texto compartible en Stage 8; PDF sigue diferido.
- ¿Hace falta undo en mini partidos desde el MVP?

## Checklist de aceptacion para implementar

- Modo formal no cambia.
- Home tiene entrada clara a entrenamiento.
- Se puede crear sesion con plantel y participantes.
- Se pueden crear equipos internos de 3/4.
- Se puede registrar mini partido a target score.
- Stats por jugador/equipo/sesion se derivan de eventos.
- Todo persiste offline.
- Backup/import preserva sesiones y acepta backups anteriores sin sesiones.
- Se pueden archivar, restaurar y eliminar sesiones con confirmaciones seguras.
- UI visible esta en espanol.
- Tests cubren dominio y persistencia.

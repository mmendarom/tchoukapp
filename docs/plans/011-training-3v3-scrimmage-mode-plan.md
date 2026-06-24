# Plan 011 - Modo practica 3v3 / entrenamiento

Spec relacionada: `docs/specs/011-training-3v3-scrimmage-mode.md`

Estado: Draft - Stages 1-8 implemented; training PDF export implemented

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

- Stage 3 reutilizo `CourtMapInput` full-court para `point` y `shot_defended`.
- Stage 7 lo reemplaza solo en training por `TrainingGoalMapInput` one-frame.

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

#### Stage 6A - Backup/import de sesiones

Estado: Implemented.

- Backup v2 agrega `trainingSessions`; import acepta v1 y v2.
- Export lee el store separado de entrenamiento.
- Restore reemplaza sesiones, reutiliza su normalizacion y limpia `activeTrainingSessionId`.
- No incluye PDF ni texto compartible de resumen; no cambia modelos de score.

#### Stage 6B - Archivo, eliminacion y filtros

Estado: Implemented.

- Agregar `archivedAt?: string` sin mezclar archivo con el status deportivo de la sesion.
- Agregar acciones de store para archivar, restaurar y eliminar.
- Limpiar `activeTrainingSessionId` al archivar o eliminar la sesion activa, conservando intactos eventos y score de sesiones archivadas.
- Mostrar filtros `Activas`, `Finalizadas`, `Archivadas` y `Todas` con `Activas` por defecto.
- Requerir confirmacion antes de archivar y antes de eliminar; delete es irreversible.
- Mantener sesiones archivadas dentro del backup v2 y preservar `archivedAt` al restaurar.
- Cubrir store, filtros, compatibilidad legacy y backup con tests.

QA manual:

- Crear, archivar, localizar en `Archivadas` y restaurar una sesion.
- Eliminar una sesion y confirmar que se solicita confirmacion y no reaparece al reiniciar.
- Exportar/importar con una sesion archivada y confirmar que sigue archivada.
- Confirmar que `Partidos` formal sigue funcionando.

### Stage 7 - Mapa one-frame dedicado

Estado: Implemented.

- Crear `TrainingGoalMapInput` aislado de `CourtField` y `CourtMapInput` formal.
- Mostrar un marco, area semicircular, guias 0°/45°/90°, marcador y botones grandes de confirmar/cancelar.
- Mantener `{x,y}` normalizado 0-1 y agregar helpers puros de normalizacion/banda angular training-specific.
- Usarlo para `point` y `shot_defended` en `LiveTrainingMiniMatchScreen`.
- Mantener eventos legacy sin scope, scoring y stats sin migracion.
- No agregar heatmaps, PDF ni sectores tacticos avanzados.
- Probar helpers, persistencia de ubicaciones y que los tests formales/reportes siguen intactos.

QA manual:

- Crear practica, iniciar mini partido y registrar punto cerca de 0°, 45° y 90°.
- Registrar tiro defendido y confirmar ubicacion persistida.
- Confirmar que partidos formales siguen mostrando cancha completa.
- Abrir sesiones training antiguas y confirmar que no crashean.

### Stage 8 - Resumen textual compartible

Estado: Implemented.

- Crear builder puro `src/export/trainingShareText.ts` basado en `getTrainingSessionStats`.
- Incluir titulo/plantel, fecha, target, cantidad de mini partidos, standings, top ataque, top defensa, alertas e historial compacto.
- Limitar equipos/ataque/defensa a 5, alertas a 3 por tipo y mini partidos a 10 con indicador de restantes.
- Excluir mini partidos cancelados y tolerar sesiones vacias o con un solo partido live.
- Agregar `Compartir resumen` al detalle usando `Share.share`, sin dependencia ni PDF nuevos.
- Permitir compartir sesiones archivadas sin restaurarlas.
- Mantener reportes formales, backup, scoring y mapa one-frame sin cambios.

### Ajuste - Modelo tactico one-goal para ubicaciones training

Estado: Implemented.

- `src/domain/trainingGoalMap.ts` agrega `deriveTrainingGoalSector(location)`.
- El helper interpreta todas las ubicaciones de `Practica 3v3` como relativas a un solo marco.
- Labels permitidos:
  - `lado izquierdo · 0°-30°`;
  - `lado izquierdo · 30°-60°`;
  - `centro · 60°-90°`;
  - `lado derecho · 30°-60°`;
  - `lado derecho · 0°-30°`.
- No se usan `marco izquierdo`, `marco derecho`, `zona izquierda`, `zona derecha` ni angulos mayores a 90° en textos training.
- `trainingShareText` agrega, cuando hay ubicaciones, `Zonas donde más convertimos` y `Zonas donde más nos defendieron` usando esos labels one-goal.
- Eventos training antiguos con `{x,y}` no se migran; se interpretan con el helper one-goal para resumenes futuros.
- `CourtMapInput`, sectores tacticos formales, reportes PDF formales y scoring no cambian.

QA manual:

- Crear practica de 3 equipos y registrar puntos, defensas, errores y puntos en contra.
- Compartir y revisar legibilidad en WhatsApp/notas.
- Compartir una sesion archivada y una vacia.
- Confirmar que export/reporte formal no cambia.
- Registrar puntos cerca de lado izquierdo 0°, lado izquierdo 45°, centro 90°, lado derecho 45° y lado derecho 0°.
- Registrar tiros defendidos en zonas equivalentes.
- Compartir resumen y confirmar labels `lado izquierdo`, `centro`, `lado derecho`, sin `marco izquierdo/derecho`.
- Confirmar que reportes formales siguen usando labels full-court cuando corresponde.

### Ajuste - UI live jugador-centrica y defensa via shot_defended

Estado: Implemented.

- `LiveTrainingMiniMatchScreen` muestra dos equipos con botones grandes por jugador.
- El flujo principal queda `toco jugador -> elijo que paso`.
- Menu por jugador:
  - `Punto`;
  - `Lo atajaron`;
  - `Error`.
- `Punto` abre mapa one-frame y registra `point` con tirador, equipo y ubicacion.
- `Lo atajaron` pide `¿Quién lo atajó?`, filtra jugadores del equipo contrario, abre mapa one-frame y registra `shot_defended` con:
  - `playerId` como tirador;
  - `teamId` como equipo atacante;
  - `defenderPlayerId` como defensor;
  - `defendingTeamId` como equipo defensor;
  - `location` como ubicacion donde fue defendido.
- `Error` ofrece:
  - `Punto en contra` -> `own_point_against`, suma +1 al rival y cuenta intento errado;
  - `Invasión` -> `errorSubtype: 'invasion'`;
  - `Pisa la línea` -> `errorSubtype: 'line_step'`;
  - `Perdió la pelota` -> `errorSubtype: 'turnover'`.
- La UI live deja de crear eventos `defense` independientes.
- `defense` queda soportado como legacy y sigue contando en stats si tiene `playerId`.
- Stats:
  - ataques = puntos + tiros atajados + puntos en contra;
  - defensas = `shot_defended.defenderPlayerId` + eventos legacy `defense`;
  - errores comunes = `error` con subtipo o legacy compatible;
  - puntos en contra separados.
- No se modifican partidos formales, scoring formal, reportes formales ni backup.

QA manual:

- Iniciar un mini partido 3v3.
- Tocar un jugador y elegir `Punto`; confirmar que abre `¿Dónde cayó el punto?` y suma al equipo correcto.
- Tocar un jugador y elegir `Lo atajaron`; confirmar `¿Quién lo atajó?`, elegir defensor rival y marcar `¿Dónde fue defendido el tiro?`.
- Confirmar que `Lo atajaron` no cambia score, suma intento al tirador y defensa al defensor.
- Tocar un jugador y elegir `Error` -> `Punto en contra`; confirmar +1 al rival.
- Probar `Invasión`, `Pisa la línea` y `Perdió la pelota`; confirmar que no cambian score.
- Confirmar que no aparece boton global `Defensa`.

### Ajuste - Barras visuales de rendimiento training

Estado: Implemented.

- Crear helper puro `src/domain/trainingPerformance.ts`.
- Crear componente `src/components/TrainingPerformanceBars.tsx`.
- Integrar `TrainingPerformanceBars` en el detalle de `TrainingSessionsScreen`.
- Mantener las stats derivadas desde eventos; no se persiste ningun dato visual.
- Ataque:
  - puntos, intentos, tiros atajados, puntos en contra y efectividad;
  - intentos = puntos + `shot_defended` + `own_point_against`;
  - ranking por puntos, intentos, efectividad y fallback estable;
  - barra suave para intentos y barra fuerte para puntos.
- Defensa:
  - defensas desde `shot_defended.defenderPlayerId`;
  - compatibilidad con eventos legacy `defense`;
  - ranking por defensas, share defensivo y fallback estable.
- Top:
  - destacar dos primeros grupos con empates incluidos;
  - no destacar cero intentos en ataque ni cero defensas en defensa.
- Las barras quedan disponibles para el detalle; el PDF de training se implementa luego con HTML/export separados y sin tocar reportes formales.

### Ajuste - PDF export de sesiones training

Estado: Implemented.

- Crear builder puro `src/domain/trainingReportData.ts` para transformar una `TrainingSession` en datos imprimibles.
- Crear `src/export/trainingReportHtml.ts` con HTML print-safe especifico de `Practica 3v3`.
- Crear `src/export/exportTrainingReport.ts` usando el mismo patron Expo Print/Sharing del reporte formal, pero con dialogo y HTML propios de training.
- Agregar `Exportar PDF` al detalle de `TrainingSessionsScreen`, con estado `Generando PDF...` y mensaje de error seguro.
- Incluir en el PDF:
  - resumen ejecutivo;
  - composicion de `Equipos`;
  - tabla de equipos;
  - rendimiento de jugadores con barras de ataque/defensa;
  - top ataque/top defensa via stats existentes;
  - errores y puntos en contra;
  - historial de mini partidos;
  - mapas one-frame `Dónde convertimos` y `Dónde nos defendieron`;
  - tablas de sectores one-goal.
- Mini partidos cancelados no alimentan standings, rendimiento ni mapas agregados; pueden quedar visibles en historial.
- Mantener `{x,y}` normalizado, modelo one-goal de training y compatibilidad con eventos legacy `defense`.
- No tocar PDF formal, scoring formal, scoring training, backup ni mapa de captura.

QA manual:

- Crear practica con 3 equipos.
- Jugar varios mini partidos.
- Registrar puntos con ubicacion.
- Registrar `Lo atajaron` con tirador, defensor y ubicacion.
- Registrar errores y puntos en contra.
- Tocar `Exportar PDF`.
- Confirmar equipos/jugadores, standings, rendimiento, mini partidos y mapas one-frame.
- Confirmar `Dónde convertimos`, `Dónde nos defendieron`, `lado izquierdo`, `centro`, `lado derecho` y angulos hasta 90°.
- Confirmar ausencia de `marco izquierdo`, `marco derecho` y mapas full-court.
- Confirmar que PDF formal de partidos sigue funcionando.

### Ajuste - PDF training mapas corregidos y detalle por jugador

Estado: Implemented.

- Corregir el renderer del mapa one-frame en `trainingReportHtml` para que use una geometria base unica, mas cercana a `TrainingGoalMapInput`.
- Mantener un solo marco, semicirculo superior proporcionado, bandas discretas 0°/45°/90° y etiquetas limpias.
- Reutilizar esa misma base en:
  - `Dónde convertimos`;
  - `Dónde nos defendieron`;
  - `Mapa de tiros` por jugador;
  - `Mapa de defensas` por jugador.
- Extender `trainingReportData` con `playerDetails`.
- Por jugador, incluir identidad, equipo, mini partidos, puntos, intentos, tiros atajados, puntos en contra, efectividad, defensas, errores, win rate, share defensivo y ubicaciones.
- `Mapa de tiros`:
  - incluye `point` como convertidos;
  - incluye `shot_defended` como atajados/defendidos cuando el jugador fue tirador;
  - diferencia marcadores por color print-safe.
- `Mapa de defensas`:
  - incluye solo `shot_defended` donde `defenderPlayerId` coincide con el jugador;
  - eventos legacy `defense` siguen en stats, pero no generan mapa si no tienen ubicacion confiable.
- Mantener intactos PDF formal, scoring, backup, share text y coordenadas persistidas.

QA manual:

- Crear practica.
- Jugar mini partidos.
- Registrar puntos y `Lo atajaron` con ubicaciones.
- Exportar PDF.
- Confirmar geometria clara del semicírculo, marco y guias 0°/45°/90°.
- Confirmar que mapas globales e individuales usan la misma geometria.
- Confirmar que cada jugador muestra stats, `Mapa de tiros` y `Mapa de defensas`.
- Confirmar que tiros convertidos y atajados se distinguen visualmente.
- Confirmar que defensas individuales salen de `shot_defended.defenderPlayerId`.
- Confirmar que PDF formal sigue funcionando.

### Bugfix - Geometria visual del mapa one-frame en PDF training

Estado: Implemented.

- Limitar el cambio a `trainingReportHtml` y tests/docs relacionados.
- Mantener scoring, coordenadas `{x,y}`, backup, share text y PDF formal sin cambios.
- Reajustar la geometria centralizada del PDF:
  - contenedor con altura fija print-safe;
  - marco superior claro;
  - semicirculo menos alto y menos recortado;
  - guias de banda discretas;
  - labels de grados movidos a leyenda compacta.
- Agregar `data-x` y `data-y` normalizados a marcadores para auditar que la ubicacion original no cambia.
- Ajustar visualmente marcadores cerca de bordes para evitar clipping sin mutar coordenadas.

QA manual:

- Registrar puntos en fondo izquierdo/derecho, intermedios y centro 90°.
- Registrar `Lo atajaron` con ubicacion.
- Exportar PDF.
- Confirmar que el semicirculo se ve natural, los grados no ensucian el mapa y los puntos no se cortan.
- Confirmar que mapas globales e individuales usan la misma geometria.
- Confirmar que PDF formal sigue funcionando.

### Ajuste UX - Orientacion behind-goal y nombres generados

Estado: Implemented.

- Cambiar `TrainingGoalMapInput` para mostrarse desde atras del marco:
  - fondo/base abajo;
  - marco abajo al centro;
  - semicirculo extendido hacia arriba;
  - leyenda compacta 0°/45°/90°.
- Mantener coordenadas `{x,y}` normalizadas y sector math existente:
  - `y=1` -> fondo/0°;
  - `y=0` -> centro del area/90°.
- Actualizar el renderer PDF para usar la misma orientacion behind-goal en mapas globales e individuales.
- No migrar eventos anteriores; documentar que ubicaciones legacy pueden no coincidir visualmente perfecto.
- Agregar `generateTrainingTeamName` en `trainingSetup`.
- Usar nombres generados en sesiones nuevas desde la UI de setup:
  - primeras 3 letras del nombre;
  - minusculas;
  - sin acentos ni puntuacion;
  - fallback `equipoN`.
- Mantener nombres existentes de sesiones guardadas sin renombrado automatico.

QA manual:

- Crear practica con Mauro/Vladi/Nicolas y Mathias/Errazquin/Juan.
- Confirmar `mauvlanic` y `materrjua`.
- Iniciar mini partido.
- Registrar punto abajo/fondo y arriba/centro.
- Confirmar sectores 0° abajo y 90° arriba.
- Exportar PDF y confirmar misma orientacion behind-goal.
- Confirmar que partidos formales y PDF formal no cambian.

QA manual:

- Crear practica 3v3.
- Jugar varios mini partidos.
- Registrar puntos.
- Registrar `Lo atajaron` con tirador y defensor.
- Registrar `Punto en contra`.
- Volver al detalle de sesion.
- Confirmar barras de ataque con puntos/intentos/efectividad y atajados/errados.
- Confirmar barras de defensa con defensores derivados de `Lo atajaron`.
- Confirmar destacados `Top`.
- Abrir sesiones antiguas con eventos legacy `defense` y confirmar que no crashean.

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
- Resuelto Stage 7: `TrainingGoalMapInput` one-frame separado del mapa formal full-court.
- Si target score es configurable desde el primer release.
- Si training sessions entran en backup en Stage 1 o Stage 6.

## Open questions capturadas

- ¿Team creation manual only en MVP o auto-balance?
- ¿Equipos de 4 rotan internamente o juegan como equipo de 4?
- ¿Un jugador puede pertenecer a mas de un equipo por sesion?
- ¿Se pueden editar equipos mid-session?
- ¿Target score siempre 3 o configurable?
- ¿Winner-stays automatico o confirmado manualmente?
- Resuelto: one-frame para training desde Stage 7; cancha completa para partidos formales.
- Resuelto: texto compartible Stage 8; PDF de practica implementado con export separado del reporte formal.

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

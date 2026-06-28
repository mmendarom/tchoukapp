# Plan 012 - Roadmap formaciones, training e historial de jugadores

Spec relacionada: `docs/specs/012-training-roadmap-and-player-history.md`

Estado: Draft - future implementation

## Objetivo del plan

Ordenar las tareas pendientes en paquetes chicos, seguros y verificables. Este plan no implementa codigo; deja preparada la secuencia para futuras ramas/features sin mezclar cambios de partido formal, training, PDF e historial global.

## Secuencia recomendada

1. Pulido PDF training guiado por dispositivo real cuando exista feedback concreto.
2. Edicion segura de sesiones/equipos 3v3 ya creados.
3. Fundacion de historial acumulado entre practicas.
4. Estadisticas globales por jugador sobre historial training.
5. Auto-balance de equipos 3v3 usando historial cuando exista.
6. Formaciones configurables del partido formal como paquete independiente.

Notas:

- Auto-balance puede implementarse antes del historial con fallback simple, pero sera mas util despues de tener estadisticas acumuladas.
- Formaciones configurables no dependen de training, pero tocan el flujo formal estable; conviene aislarlas en una rama propia.
- PDF training depende de observaciones reales, asi que puede entrar en cualquier momento despues de la prueba de campo.

## Stage A - Pulido PDF training post dispositivo real

Objetivo:

- Corregir problemas observados al abrir/compartir el PDF training en un dispositivo real.

Entrada requerida:

- Fecha de prueba.
- Dispositivo y sistema.
- Visor/app usada.
- Orientacion.
- Sesion usada.
- Problemas concretos: cortes, margenes, escala, texto chico, mapas, saltos de pagina, colores, peso del archivo o share.

Archivos probables:

- `src/export/trainingReportHtml.ts`
- `src/export/trainingReportHtml.test.ts`
- `src/domain/trainingReportData.ts` solo si falta algun dato para render.
- `docs/implementation-log.md`

Pasos:

1. Registrar el feedback en la spec o en el implementation log.
2. Reproducir con una sesion local representativa.
3. Ajustar HTML/CSS print-safe de forma minima.
4. Verificar que mapas one-frame conservan `data-x` y `data-y`.
5. Confirmar que no aparecen labels full-court en training.
6. Exportar de nuevo en dispositivo real.

Tests:

- HTML contiene secciones esperadas.
- Marcadores conservan coordenadas normalizadas.
- Empty states siguen seguros.
- No aparecen `marco izquierdo`, `marco derecho`, `zona izquierda` ni `zona derecha` en PDF training.

QA manual:

- Exportar PDF desde una practica con varios mini partidos.
- Revisar portada/resumen, equipos, tablas, mapas globales, detalle por jugador y saltos de pagina.
- Compartir por WhatsApp/Drive/notas si aplica.
- Confirmar que PDF formal de partidos no cambio.

Stop conditions:

- Si el problema depende del visor externo y no del HTML generado, documentar la limitacion antes de rediseñar.

## Stage B - Edicion segura de sesiones/equipos 3v3

Estado: Implemented - first safe slice.

Objetivo:

- Permitir corregir sesiones/equipos ya creados sin reescribir el significado de mini partidos jugados.

Reglas de edicion:

- Sesion draft sin mini partidos: permitir editar participantes, equipos, nombres, colores, target score y `Ganador queda`.
- Sesion live sin mini partido activo y sin eventos: permitir cambios equivalentes a draft.
- Sesion con mini partidos/eventos: permitir solo nombres, colores y campos no historicos.
- Mini partido live: bloquear edicion de equipos/participantes.
- Sesiones archivadas: exigir restaurar antes de editar, salvo cambios explicitamente seguros si se decide permitirlos.

Archivos probables:

- `src/domain/training.ts`
- Nuevo `src/domain/trainingEditing.ts` si las reglas crecen.
- `src/domain/training.test.ts` o nuevo `trainingEditing.test.ts`
- `src/store/useTrainingStore.ts`
- `src/store/useTrainingStore.test.ts`
- `src/screens/TrainingSessionsScreen.tsx`
- Posibles componentes nuevos en `src/components`

Pasos:

1. Crear helpers puros para detectar si una sesion permite edicion completa, parcial o ninguna.
2. Agregar acciones de store para:
   - actualizar metadata de sesion;
   - actualizar settings;
   - actualizar equipos en draft/unplayed;
   - actualizar nombre/color de equipo con historial.
3. Validar `validateTrainingTeams` antes de guardar cambios profundos.
4. Actualizar UI con modo edicion y mensajes de bloqueo en espanol.
5. Mantener `updatedAt`.
6. Actualizar backup/import tests si se agregan campos opcionales.

Tests:

- Edicion completa en draft.
- Bloqueo de cambio de jugadores si un equipo ya tiene eventos.
- Edicion de nombre/color permitida con historial.
- Bloqueo con mini partido live.
- No duplicar jugadores.
- Persistencia y restore conservan cambios.

QA manual:

- Crear sesion, editar equipos antes de jugar y reiniciar app.
- Jugar mini partido, volver e intentar mover un jugador historico.
- Renombrar equipo con historial y confirmar que reportes muestran el nombre nuevo.
- Confirmar que scoring, undo y cola siguen funcionando.

Stop conditions:

- Si se necesita editar jugadores de equipos historicos, detener y disenar versionado/snapshots de equipos antes de mutar `playerIds`.

Implementado:

- `src/domain/training.ts` agrega permisos puros de edicion:
  - setup completo solo antes de que existan mini partidos y si la sesion no esta cerrada/archivada;
  - detalles de equipo permitidos sin mini partido live;
  - archivadas y mini partido live bloquean edicion.
- `src/store/useTrainingStore.ts` agrega:
  - `updateTrainingSessionSetup`;
  - `updateTrainingTeamDetails`.
- `TrainingSessionsScreen` agrega panel `Editar practica`:
  - nombres de equipos;
  - `Puntos para ganar` y `Ganador queda` solo si todavia no hay mini partidos.
- Tests de dominio/store cubren:
  - permisos de edicion;
  - actualizacion completa antes de jugar;
  - bloqueo de setup con historial;
  - renombrado seguro de equipos con historial;
  - bloqueo si hay mini partido live o sesion archivada.

Limitacion del primer corte:

- La UI no mueve jugadores entre equipos ya creados. La accion de store para setup completo existe para sesiones sin mini partidos, pero la pantalla solo expone nombres/settings para mantener el cambio chico y seguro.

## Stage C - Fundacion de historial acumulado entre practicas

Objetivo:

- Crear un builder puro que agregue multiples sesiones training con filtros y compatibilidad legacy.

Archivos probables:

- Nuevo `src/domain/trainingHistory.ts`
- Nuevo `src/domain/trainingHistory.test.ts`
- Posible uso desde `src/screens/TrainingSessionsScreen.tsx` en una primera vista simple.

Pasos:

1. Definir `TrainingHistoryQuery`.
2. Filtrar sesiones por fecha, plantel, jugador e inclusion de archivadas.
3. Reusar `getTrainingSessionStats` por sesion.
4. Agregar totales por periodo de consulta.
5. Excluir mini partidos cancelados consistentemente.
6. Ordenar resultados con tie-breakers estables.
7. Mantener todo derivado, sin persistir cache.

Tests:

- Acumula dos o mas sesiones.
- Excluye cancelados.
- Incluye/excluye archivadas segun filtro.
- Filtra por jugador.
- Filtra por rango de fechas.
- Tolera sesiones vacias y legacy.

QA manual:

- Crear varias sesiones con jugadores repetidos.
- Archivar una sesion.
- Revisar totales con y sin archivadas.
- Comparar totales con resumenes individuales.

## Stage D - Estadisticas globales por jugador

Objetivo:

- Mostrar una vista usable de rendimiento acumulado por jugador a lo largo del tiempo.

Archivos probables:

- `src/domain/trainingHistory.ts`
- `src/domain/trainingHistory.test.ts`
- Nueva pantalla, por ejemplo `src/screens/TrainingPlayerStatsScreen.tsx`
- `src/utils/navigation.ts`
- `App.tsx`
- Componentes existentes o nuevos para barras/rankings.

Pasos:

1. Crear `TrainingPlayerCareerStats` desde Stage C.
2. Definir rankings:
   - ataque;
   - defensa;
   - efectividad con minimo de intentos;
   - alertas de errores/puntos en contra;
   - win rate con minimo de partidos.
3. Agregar vista de lista global y detalle de jugador.
4. Agregar filtros simples: rango, plantel, incluir archivadas.
5. Mostrar estados vacios claros.
6. Mantener metricas training separadas de partidos formales.

Tests:

- Ranking de ataque prioriza volumen antes que efectividad aislada.
- Defensa usa `shot_defended.defenderPlayerId` y legacy `defense`.
- Efectividad no destaca jugadores sin volumen minimo.
- Zonas training usan labels one-goal.

QA manual:

- Revisar jugador con varias practicas.
- Confirmar que numeros coinciden con sesiones fuente.
- Cambiar filtro de archivadas.
- Confirmar legibilidad en telefono.

## Stage E - Auto-balance de equipos 3v3

Objetivo:

- Sugerir equipos equilibrados y editables durante el setup de practica.

Archivos probables:

- Nuevo `src/domain/trainingBalance.ts`
- Nuevo `src/domain/trainingBalance.test.ts`
- `src/domain/trainingSetup.ts`
- `src/domain/trainingSetup.test.ts`
- `src/screens/TrainingSessionsScreen.tsx`

Reglas recomendadas:

- Ser deterministico: mismos jugadores y mismos datos generan misma sugerencia.
- Respetar cantidad de equipos elegida y tamaños 3/4.
- No duplicar jugadores.
- Usar historial training si existe:
  - puntos/intentos/efectividad;
  - defensas;
  - win rate;
  - plus/minus;
  - errores/puntos en contra como balance negativo suave.
- Si no hay historial, usar fallback snake por orden visible de jugadores y permitir edicion manual.
- Mostrar que es una sugerencia, no un bloqueo.

Pasos:

1. Definir score de balance simple y transparente.
2. Crear distribuidor por equipos con cupos.
3. Agregar tie-breakers estables.
4. Exponer `Sugerir equipos` en setup.
5. Permitir `Rehacer sugerencia` solo si el algoritmo no usa azar, o documentar una semilla si se decide usar pseudoazar.
6. Permitir editar cualquier propuesta antes de crear sesion.

Tests:

- Equipos validos para 6, 7, 8, 9, 10, 11 y 12 presentes.
- Sin duplicados.
- Fallback sin historial.
- Balance con jugadores fuertes distribuidos.
- Resultado deterministico.

QA manual:

- Probar con 9 jugadores y 3 equipos.
- Probar con 10/11 jugadores y jugadores sin equipo.
- Editar propuesta antes de guardar.
- Crear sesion y confirmar cola/equipos.

Stop conditions:

- Si el cuerpo tecnico necesita ratings manuales, crear una spec chica de metadata de jugador antes de acoplarla al balance.

## Stage F - Formaciones configurables 3-1-3, 4-3, 3-4

Objetivo:

- Permitir cambiar la distribucion visual de los 7 slots del partido formal sin alterar eventos, lineup snapshots ni ubicaciones.

Archivos probables:

- Nuevo `src/domain/lineupFormations.ts`
- Nuevo `src/domain/lineupFormations.test.ts`
- `src/domain/lineupSlots.ts`
- `src/domain/lineupSlots.test.ts`
- `src/components/LineupCourt.tsx`
- `src/screens/LiveMatchScreen.tsx`
- Posible `src/domain/types.ts` si se persiste en `Match`
- `src/store/useMatchStore.ts` y tests si hay accion para cambiar formacion

Pasos:

1. Definir `LineupFormationId`.
2. Crear presets de coordenadas porcentuales para 7 slots.
3. Hacer que `LineupCourt` reciba `formationId` o `slotPositions`.
4. Mantener default `3-1-3`.
5. Agregar selector simple de formacion en pantalla formal, cuidando espacio mobile.
6. Si se persiste, agregar campo opcional y migracion/default.
7. Verificar sustituciones, swaps y undo.

Tests:

- Cada preset devuelve 7 posiciones.
- Las posiciones estan dentro de bounds.
- `3-1-3` conserva grupos legacy.
- Snapshots viejos sin formacion renderizan con default.
- Cambiar formacion no altera `playerIds`.
- Sustitucion y swap siguen creando snapshots/eventos correctos.

QA manual:

- Abrir partido formal.
- Cambiar entre `3-1-3`, `4-3` y `3-4`.
- Hacer sustitucion.
- Hacer intercambio en cancha.
- Usar undo.
- Registrar punto con mapa y confirmar que `landingLocation` no depende de la formacion.
- Revisar resumen de tiempo/final.

Stop conditions:

- Si el selector ocupa demasiado espacio en vivo, moverlo a setup/configuracion del partido.

## Validacion general por etapa

Antes de cerrar cualquier etapa con codigo:

```bash
npm test
npx tsc --noEmit
```

Tambien actualizar:

- spec correspondiente;
- plan correspondiente;
- `docs/implementation-log.md`;
- `docs/decisions` si se toma una decision de modelo o producto no reversible.

## Riesgos transversales

- Edicion historica sin snapshots puede corromper interpretacion de stats.
- Balance automatico puede generar falsa confianza si no muestra sus limites.
- Historial global puede mezclar reglas si se incluye partido formal demasiado pronto.
- Formaciones visuales pueden ser confundidas con zonas tacticas reales.
- PDF puede requerir ajustes por visor/dispositivo imposibles de cubrir con tests unitarios.

## Checklist antes de implementar la primera etapa

- [ ] Confirmar prioridad real entre las seis tareas.
- [ ] Confirmar si formaciones aplican solo al partido formal.
- [ ] Confirmar politica de sesiones archivadas en historial.
- [ ] Capturar feedback real para PDF training.
- [ ] Decidir si auto-balance puede esperar a historial global o necesita fallback primero.

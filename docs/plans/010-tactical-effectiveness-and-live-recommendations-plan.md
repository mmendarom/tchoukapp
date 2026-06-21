# Plan 010 - Tactical Effectiveness And Live Recommendations

Spec relacionada: `docs/specs/010-tactical-effectiveness-and-live-recommendations.md`

Estado: Draft

## Objetivo

Implementar, en etapas seguras, una mejora tactica que:

- modele `Defensa rival` como tiro uruguayo defendido por el rival;
- asocie nuevas defensas rivales a un jugador uruguayo;
- derive efectividad ofensiva por jugador;
- muestre barras visuales de rendimiento con datos existentes;
- muestre esa efectividad en resumenes y PDF;
- agregue alertas tacticas live compactas;
- corrija insights para no depender de asistencias ni castigar roles defensivos.

## Estado Actual Inspeccionado

Archivos revisados:

- `src/domain/types.ts`
- `src/store/useMatchStore.ts`
- `src/domain/stats.ts`
- `src/domain/periodStats.ts`
- `src/domain/insights.ts`
- `src/domain/reportData.ts`
- `src/components/LiveMapPanel.tsx`
- `src/screens/LiveMatchScreen.tsx`
- `src/screens/PeriodSummaryScreen.tsx`
- `src/screens/FinalSummaryScreen.tsx`
- `src/export/reportHtml.ts`

Hallazgos:

- `OpponentDefenseEvent` no tiene `playerId`.
- `recordOpponentDefense(defenseLocation)` guarda solo `defenseLocation`.
- `LiveMatchScreen` abre mapa de `Defensa rival` sin requerir jugador.
- Mapas live, resumenes y PDF ya muestran `Dónde nos defendieron` usando `defenseLocation`.
- `getOpponentDefenses` y funciones relacionadas cuentan defensas rivales totales.
- No existe efectividad ofensiva por jugador.
- No existian barras visuales de rendimiento por jugador antes de esta etapa.
- `createLowInvolvementInsights` usa puntos y `assistPlayerId`; el texto menciona asistencias.
- PDF/report tiene secciones de goleadores, defensas, errores, zonas y defensas rivales, pero no efectividad.

## Principios De Implementacion

- Cambios pequenos por etapa.
- Mantener eventos como fuente de verdad.
- No guardar estadisticas derivadas en Zustand.
- Mantener compatibilidad con eventos viejos sin `playerId`.
- No inferir `playerId` ni ubicacion historica.
- No tocar scoring salvo tests de no-regresion.
- No agregar dependencias.

## Stage 0 - Barras De Rendimiento Con Datos Existentes

Estado: Implemented.

### Cambios implementados

1. Se agrego helper puro `src/domain/playerPerformance.ts`.
2. Se agrego test `src/domain/playerPerformance.test.ts`.
3. Se agrego componente reusable `src/components/PlayerPerformanceBars.tsx`.
4. `LiveMatchScreen` muestra `Rendimiento en vivo`.
5. `PeriodSummaryScreen` muestra `Rendimiento del tiempo`.
6. `FinalSummaryScreen` muestra `Rendimiento total`.

### Formulas implementadas

Ataque:

- `pointsByPlayer`: puntos normales de Uruguay con `playerId`.
- `totalTeamPoints`: suma de esos puntos.
- `playerAttackShare = playerPoints / totalTeamPoints`.

Defensa:

- `defensesByPlayer`: defensas Uruguay con `playerId`.
- `totalTeamDefenses`: suma de esas defensas.
- `playerDefenseShare = playerDefenses / totalTeamDefenses`.

### Exclusiones

- `opponent_own_point` no cuenta en ataque.
- Puntos rivales no cuentan en ataque.
- Eventos sin `playerId` no cuentan.
- `opponent_defense` no cuenta como defensa Uruguay.

### UI

- Dos columnas:
  - `Ataque`;
  - `Defensa`.
- Cada fila muestra:
  - jugador;
  - cantidad;
  - porcentaje;
  - barra horizontal.
- Empty states:
  - `Sin puntos registrados.`;
  - `Sin defensas registradas.`
- Sin dependencias nuevas ni libreria de charts.

### Datos por pantalla

- Live:
  - tiempo actual;
  - jugadores actualmente en cancha aunque tengan cero stats;
  - orden de cancha.
- Resumen por tiempo:
  - eventos del periodo;
  - jugadores de snapshots del periodo si estan disponibles;
  - columnas ordenadas por contribucion.
- Resumen final:
  - totales del partido;
  - jugadores con stats.

### Tests implementados

- Share de ataque.
- Share de defensa.
- Exclusion de `punto en contra rival`.
- Exclusion de puntos rivales y eventos sin jugador.
- Exclusion de defensas rivales.
- Jugadores en cancha con cero stats en live.
- No division por cero.
- Filtrado por periodo.
- Totales de partido.

### Diferido

- Efectividad ofensiva con tiros defendidos.
- Integracion con PDF.
- Recomendaciones live.
- Cambio de modelo para `Defensa rival`.

## Stage 1 - Modelo Y Flujo De Defensa Rival

Estado: implementado el 2026-06-18.

### Cambios

1. Actualizar `src/domain/types.ts`:
   - agregar `playerId?: string` a `OpponentDefenseEvent`.
2. Actualizar `src/store/useMatchStore.ts`:
   - cambiar accion a firma tipo objeto:
     - `recordOpponentDefense(input: { playerId: string; defenseLocation: CourtLocation })`;
   - validar match activo/live;
   - validar `defenseLocation`;
   - validar que `playerId` este en cancha;
   - guardar `playerId`.
3. Actualizar `src/screens/LiveMatchScreen.tsx`:
   - `Defensa rival` debe usar jugador seleccionado;
   - si no hay jugador: `Seleccioná primero quién tiró.`;
   - si no esta en cancha: `Seleccioná un jugador en cancha.`;
   - al confirmar mapa llamar store con `playerId` y `defenseLocation`;
   - latest action puede seguir `Defensa rival registrada` o mejorar a `Defensa rival a tiro de {player}`.
4. Mantener `CourtMapInput` sin cambios salvo labels si hace falta:
   - `¿Dónde nos defendieron?`;
   - `Marcá dónde el rival defendió el tiro.`

### Tests

- `recordOpponentDefense` guarda `playerId` y `defenseLocation`.
- No registra sin `playerId`.
- No registra si jugador no esta en cancha.
- No registra sin ubicacion.
- No cambia score.
- Undo remueve el evento.
- Eventos viejos sin `playerId` siguen seguros en mapas/stats.

### Riesgo Principal

- Agregar requisito de jugador puede frenar registro. Mitigar con feedback claro y mantener seleccion de jugador persistente.

## Stage 2 - Efectividad Ofensiva

Estado: implementado el 2026-06-18 dentro de `src/domain/playerPerformance.ts` y `PlayerPerformanceBars`.

### Cambios

1. Dominio extendido:
   - `src/domain/playerPerformance.ts` agrega tiros atajados por el rival, intentos y efectividad.
   - Se mantuvo un helper unico para alimentar live, resumen por tiempo y resumen final.
2. Tipos sugeridos:

```ts
type PlayerEffectivenessStat = {
  playerId: string;
  goals: number;
  rivalDefensesAgainst: number;
  shotAttempts: number;
  effectiveness: number | undefined;
};
```

3. Funciones implementadas:
   - `buildPlayerPerformance(events, players, includedPlayerIds?)`;
   - `buildPlayerPerformanceForPeriod(events, players, lineupPlayerIds, periodNumber)`;
   - `buildLivePlayerPerformance(events, players, currentLineupPlayerIds, currentPeriod)`.
4. Integrar en:
   - `PeriodSummaryScreen`;
   - `FinalSummaryScreen`.
5. Labels:
   - `Efectividad ofensiva`;
   - `Goles`;
   - `Tiros defendidos`;
   - `Tiros`;
   - `Efectividad`;
   - `Sin tiros`.

### Formula

- `goals = puntos Uruguay normales con playerId`.
- `rivalDefensesAgainst = opponent_defense con playerId`.
- `ownPointsAgainst = punto_en_contra Uruguay con playerId`.
- `shotAttempts = goals + rivalDefensesAgainst + ownPointsAgainst`.
- `effectiveness = goals / shotAttempts`.
- Excluir `opponent_own_point`, puntos rivales y eventos sin `playerId`; incluir `punto_en_contra` Uruguay con jugador como intento errado.

### Tests

- Goles e intentos correctos.
- Tiros defendidos por jugador correctos.
- `opponent_own_point` excluido.
- `punto_en_contra` Uruguay con jugador incluido como intento errado.
- Legacy `opponent_defense` sin `playerId` excluido.
- `shotAttempts === 0` produce `effectiveness: undefined`.
- Period filtering correcto.

### Notas De Implementacion

- Live usa el tiempo actual y muestra jugadores en cancha aunque no tengan tiros.
- Resumen por tiempo usa eventos del tiempo y snapshots disponibles del periodo.
- Resumen final usa totales del partido.
- PDF/reporte queda diferido a Stage 3.
- Recomendaciones live quedan diferidas a Stage 4.

## Stage 3 - PDF/Reporte

Estado: implementado el 2026-06-18.

### Cambios

1. Extender `src/domain/reportData.ts`:
   - `PeriodReportData.effectiveness`;
   - `MatchReportData.totals.effectiveness`;
   - conteo de defensas rivales legacy sin jugador.
2. Actualizar `src/export/reportHtml.ts`:
   - tabla `Efectividad ofensiva`;
   - columnas `Jugador`, `Goles`, `Tiros defendidos`, `Tiros`, `Efectividad`;
   - nota legacy si corresponde.
3. Actualizar texto fallback:
   - incluir resumen compacto de efectividad;
   - incluir nota si hay legacy.

### Notas De Implementacion

- El reporte usa `src/domain/playerPerformance.ts` como fuente de calculo.
- Se muestran solo jugadores con al menos un tiro intentado.
- Orden: tiros intentados, goles, efectividad y nombre.
- La nota legacy aparece solo si existen `opponent_defense` sin `playerId`.
- Recomendaciones live siguen diferidas a Stage 4.

### Tests

- Report data incluye efectividad.
- Report HTML muestra labels en español.
- No aparecen raw enum values.
- Report genera con eventos legacy sin crashear.
- Nota legacy aparece solo cuando corresponde.

## Stage 4 - Bloque Live De Recomendaciones

Estado: implementado el 2026-06-18. Polish tactico/visual actualizado posteriormente.

### Cambios

1. Crear helper puro:
   - `src/domain/liveRecommendations.ts`;
   - entrada: match/events/currentLineup/players/opponentName;
   - salida: cards con `severity`, `title`, `description`, `suggestedAction`.
2. Reglas iniciales:
   - jugador defendido repetidamente;
   - baja efectividad con intentos minimos;
   - errores repetidos;
   - zona rival repetida;
   - zona de defensas rivales repetida;
   - jugador sin participacion despues de suficiente actividad;
   - aporte defensivo fuerte.
3. Integrar en `LiveMatchScreen`:
   - componente `LiveRecommendationsPanel`;
   - titulo `Lectura en vivo`;
   - 4 items maximo;
   - compacto y full-width.

### Notas De Implementacion

- Usa solo eventos del periodo actual.
- Orden de prioridad implementado:
  - puntos regalados;
  - errores repetidos;
  - jugador anulado;
  - baja efectividad;
  - zona vulnerable;
  - zona bloqueada;
  - baja participacion;
  - aporte defensivo.
- No usa ni menciona asistencias.
- Baja participacion requiere suficiente actividad y cero tiros/defensas.
- Defensas rivales legacy sin `playerId` no cuentan como intentos de jugador pero si pueden activar zona bloqueada.
- El cap de recomendaciones sube a 12.
- `Lo están anulando` requiere:
  - al menos 3 intentos;
  - al menos 2 tiros defendidos por el rival;
  - efectividad menor a 75%.
- `Baja efectividad` requiere:
  - al menos 4 intentos;
  - efectividad menor a 75%.
- Si un jugador tiene 2+ tiros defendidos por el rival pero mantiene 75% o mas de efectividad, se muestra `Le están defendiendo tiros` como dato neutral.
- `Buen rendimiento ofensivo` puede aparecer con 4+ intentos y 75% o mas de efectividad, con prioridad baja.
- El panel `Lectura en vivo` mantiene filas compactas y aprovecha dos columnas en tablet/ancho grande.
- `Rendimiento en vivo` usa orden por contribucion: puntos, intentos, efectividad y orden de cancha en ataque; defensas, share y orden de cancha en defensa.
- `Rendimiento en vivo` resalta los dos primeros grupos de ranking con empates incluidos.
- `LiveMatchScreen` agrupa las acciones por contexto Uruguay/rival.
- `Últimas acciones` muestra mas acciones en tablet/landscape y usa mejor el alto disponible.

### Ubicacion UI Sugerida

- Phone portrait: despues de `liveMapPanel`, antes de `Controles del partido` si no desplaza acciones esenciales.
- Tablet landscape: debajo de columna derecha o debajo del grid principal.
- Si no hay alertas, mostrar texto muy compacto o ocultar segun QA.

### Tests

- Sin eventos no crashea.
- Maximo 5 recomendaciones.
- Prioriza critical/warning/info.
- Jugador bloqueado repetidamente aparece.
- Baja efectividad aparece con umbral.
- Jugador con defensas no aparece como sin participacion.
- Texto no menciona asistencias.
- Alta efectividad con tiros defendidos no genera `Lo están anulando`.
- Alta efectividad con tiros defendidos genera nota neutral si entra por cap.
- Baja efectividad bajo 75% genera alerta con porcentaje.
- Maximo por defecto de 12 recomendaciones.

## Stage 4B - Polish De Resumenes

Estado: implementado como pase visual posterior a Stage 4.

### Cambios

1. `PeriodSummaryScreen`
   - Header oscuro con `Resumen del tiempo`, estado del resultado, marcador del tiempo y marcador global.
   - Tarjetas compactas para `Ataque`, `Defensa`, `Errores` y `Efectividad`.
   - `Alertas tácticas` con chips por severidad y acentos de color.
   - `Rendimiento del tiempo` queda antes de mapas.
   - Se agrega encabezado `Mapas del tiempo`.
2. `PlayerPerformanceBars`
   - Superficies y tracks diferenciados para ataque y defensa.
   - Colores mas claros:
     - ataque azul/celeste;
     - defensa verde/teal.
3. `FinalSummaryScreen`
   - Header y tarjetas de totales para consistencia visual ligera.

### No cambia

- Modelos de eventos.
- Reglas de scoring.
- Registro de puntos, defensas, errores o cambios.
- Mapas.
- PDF/export.
- Dependencias.

### QA manual

- Registrar 8 tiros de un jugador: 6 goles y 2 defensas rivales.
- Confirmar que no aparece alerta negativa `Lo están anulando`.
- Confirmar que, si aparece, `Le están defendiendo tiros` es dato neutral.
- Registrar 4 tiros: 2 goles y 2 defensas rivales.
- Confirmar `Lo están anulando` y/o `Baja efectividad`.
- Registrar errores repetidos y confirmar que siguen primero.
- Confirmar maximo 12 recomendaciones.
- Confirmar que ninguna alerta menciona asistencias.
- Confirmar que un jugador con defensas no aparece como baja participacion.
- Finalizar un tiempo con puntos, defensas, errores y defensas rivales.
- Confirmar que el resumen del tiempo es mas colorido y escaneable.
- Probar telefono portrait y tablet landscape.

## Stage 4C - Barras De Potencial Y Lectura Real Del Tiempo

Estado: implementado como refinamiento posterior a Stage 4B.

### Cambios

1. `PlayerPerformanceBars`
   - La columna `Ataque` muestra dos capas:
     - fondo suave para tiros generados (`puntos + tiros defendidos por el rival`);
     - barra frontal fuerte para puntos convertidos.
   - La fila de ataque muestra `puntos/tiros` y porcentaje de efectividad.
   - `punto en contra rival`, puntos rivales y defensas rivales legacy sin jugador quedan fuera de intentos individuales.
   - La columna `Defensa` mantiene barras por defensas Uruguay.
2. `PeriodSummaryScreen`
   - `Alertas tácticas` pasa a `Lectura del tiempo`.
   - Reutiliza `buildLiveRecommendations` con eventos del periodo y `maxRecommendations: 8`.
   - Las tarjetas de `Ataque`, `Defensa`, `Errores` y `Efectividad` usan superficies de color diferenciadas.
   - El resumen usa datos concretos del periodo: tiros, efectividad, errores, puntos en contra, defensas y zonas.

### No cambia

- Modelos de eventos.
- Reglas de scoring.
- Registro de puntos, defensas, errores o cambios.
- Mapas.
- PDF/export.
- Dependencias.

### QA manual

- Registrar para un jugador 4 puntos de Uruguay y 2 defensas rivales contra sus tiros.
- Confirmar que ataque muestra 6 tiros como capa de fondo y 4 puntos como capa frontal.
- Confirmar texto compacto tipo `4/6 tiros · 67%`.
- Confirmar que `punto en contra rival` no cambia la barra de ataque de ningun jugador.
- Finalizar el tiempo y confirmar que `Lectura del tiempo` muestra alertas concretas con numeros.
- Confirmar que no hay textos de asistencias.
- Confirmar que un defensor con defensas no queda marcado negativamente.
- Confirmar que resumen final sigue renderizando las barras sin cambios de comportamiento.

## Stage 4D - Sectores Tacticos Y Propagacion A Final/Reporte

Estado: implementado como mejora tactica posterior a Stage 4C.

### Cambios

1. `src/domain/court.ts`
   - Agrega `deriveTacticalCourtSector(location, frameOrSide?)`.
   - Calcula `marco izquierdo/derecho` con `frame` si existe o por mitad horizontal si no existe.
   - Divide cada area en `lado izquierdo` y `lado derecho` mirando desde el centro; invierte la orientacion entre marcos y espeja `y` para una aproximacion estable de 0°-90°.
   - Usa solo las bandas `0°-30°`, `30°-60°` y `60°-90°`.
   - Agrupa puntos rivales y defensas rivales por sectores como `marco derecho · lado izquierdo · 30°-60°`.
2. Recomendaciones
   - `buildLiveRecommendations`, `generatePeriodInsights` y `createTacticalInsights` dejan de usar `zona izquierda/derecha` para alertas rivales.
   - Las alertas de puntos rivales y defensas rivales usan sectores tacticos.
   - El agrupador de puntos rivales deriva marco, lado y angulo exclusivamente desde `landingLocation`, sin confiar en el `frame` default del evento.
   - Cada sector mantiene su conteo independiente y puede generar otra alerta si supera el umbral.
3. `FinalSummaryScreen`
   - Usa `Lectura final` basada en recomendaciones reales del partido.
   - Agrega `Efectividad ofensiva total`.
   - Muestra `Zonas donde nos entraron` y `Zonas donde nos defendieron` con sectores.
4. Reporte/PDF/texto
   - `buildMatchReportData` usa sectores para puntos rivales y defensas rivales.
   - El HTML cambia labels a `Rendimiento ofensivo`, `Tiros generados`, `Puntos convertidos`, `Tiros atajados` y `Lectura táctica`.
   - El texto compartible incluye resumen compacto de sectores.
   - Report Export v3 agrega rendimiento completo por tiempo/total, barras de intentos-conversiones, top ataque/defensa y lecturas `Lectura del tiempo`/`Lectura final`.

### No cambia

- Modelos de eventos.
- Reglas de scoring.
- Registro de puntos, defensas, errores o cambios.
- Coordenadas normalizadas.
- Mapas.
- Dependencias.

### QA manual

- Registrar puntos rivales repetidos en un mismo sector cerca de un marco.
- Registrar puntos rivales en ambos lados del mismo marco.
- Confirmar que `Lectura en vivo` usa `marco ... · lado ... · ...°` y no `zona derecha/izquierda`.
- Registrar 3 o mas puntos rivales en el area del marco izquierdo, lado derecho, y confirmar que no aparece `marco derecho · lado izquierdo`.
- Repetir 3 o mas puntos en un segundo sector y confirmar que ambos sectores pueden aparecer.
- Confirmar que ninguna etiqueta supera 90°.
- Registrar defensas rivales repetidas en un mismo sector.
- Confirmar que `Lectura del tiempo` y `Lectura final` muestran sectores concretos.
- Finalizar partido y confirmar `Efectividad ofensiva total`.
- Exportar PDF y confirmar `Rendimiento ofensivo`, `Lectura táctica`, `Zonas donde nos entraron` y `Zonas donde nos defendieron`.
- Confirmar que los mapas mantienen sus ubicaciones y funcionamiento.
- Confirmar que partidos antiguos sin ubicacion no crashean.

## Stage 5 - Mejora De Insights Existentes

Estado: limpieza parcial implementada durante el polish tactico posterior a Stage 4.

### Cambios

1. Actualizar `src/domain/insights.ts`.
2. Reemplazar `createLowInvolvementInsights`:
   - no usar `assistPlayerId`;
   - no mencionar asistencias;
   - usar intentos de tiro + defensas Uruguay;
   - requerir suficientes eventos/puntos/tiempo.
3. Agregar o reutilizar efectividad:
   - alerta de baja efectividad;
   - alerta de jugador anulado por defensas rivales.
4. Mantener alertas existentes utiles:
   - errores recientes;
   - zonas rivales;
   - defensores clave;
   - puntos regalados.

### Cambios ya implementados

- `createLowInvolvementInsights` ya no lee ni suma `assistPlayerId`.
- El texto visible ya no menciona asistencias.
- Baja participacion considera puntos, defensas Uruguay y defensas rivales con `playerId`.
- Un jugador con defensas o tiros defendidos por el rival no queda marcado como bajo involucramiento.

### Tests

- No hay texto `asistencia`/`asistencias`.
- Defensor con varias defensas no se marca como bajo involucramiento.
- Jugador sin tiros ni defensas puede aparecer si pasa umbral.
- Jugador con muchos tiros defendidos aparece como baja efectividad/anulado.

## Orden Recomendado

1. Stage 1: porque captura el dato faltante para todo lo demas.
2. Stage 2: porque define la metrica central.
3. Stage 3: porque export depende de la metrica.
4. Stage 5: puede hacerse antes de Stage 4 si se quiere limpiar insights finales primero.
5. Stage 4: requiere umbrales mas finos y QA visual en telefono real.

Orden alternativo seguro:

- Stage 1 -> Stage 2 -> Stage 5 -> Stage 3 -> Stage 4.

## Manual QA Global

- Iniciar partido.
- Seleccionar jugador en cancha.
- Tocar `Defensa rival`.
- Confirmar que abre mapa.
- Registrar ubicacion.
- Confirmar ultima accion.
- Confirmar score no cambia.
- Deshacer y confirmar que se elimina.
- Intentar `Defensa rival` sin jugador y confirmar feedback.
- Finalizar tiempo y revisar efectividad.
- Finalizar partido y revisar efectividad total.
- Exportar PDF y revisar tabla.
- Crear partido con datos legacy o backup viejo y confirmar que mapas siguen funcionando.
- Revisar alertas live con varios eventos.
- Confirmar que ninguna alerta menciona asistencias.

## Archivos Probables A Tocar En Implementacion

- `src/domain/types.ts`
- `src/store/useMatchStore.ts`
- `src/store/useMatchStore.test.ts`
- `src/domain/effectiveness.ts` (nuevo, recomendado)
- `src/domain/effectiveness.test.ts` (nuevo)
- `src/domain/periodStats.ts`
- `src/domain/periodStats.test.ts`
- `src/domain/insights.ts`
- `src/domain/insights.test.ts`
- `src/domain/reportData.ts`
- `src/domain/reportData.test.ts`
- `src/export/reportHtml.ts`
- `src/screens/LiveMatchScreen.tsx`
- `src/screens/PeriodSummaryScreen.tsx`
- `src/screens/FinalSummaryScreen.tsx`
- posible `src/components/LiveRecommendationPanel.tsx`

## Criterios Para Detenerse

- Si el flujo de `Defensa rival` se vuelve demasiado lento en telefono.
- Si las alertas live ocupan demasiado espacio o distraen de acciones principales.
- Si el reporte PDF queda demasiado largo para compartir.
- Si hay ambiguedad tactica sobre umbrales de efectividad.

## Validacion Por Etapa

Cada etapa de implementacion debe correr:

- `npm test`
- `npx tsc --noEmit`

Para etapas con UI, agregar QA manual en `docs/implementation-log.md`.

## Field-testing fixes finales - 2026-06-20

Estado: implementado el 2026-06-20; QA visual manual pendiente.

1. Actualizar `playerPerformance` y tests con `ownPointsAgainst`, manteniendo ranking por goles y top groups.
2. Propagar el campo a `reportData`, HTML y texto; actualizar fixtures y regresiones de periodo/total.
3. Mostrar `atajados` y `errados` en las filas de ataque sin cambiar la estructura estable de barras.
4. Reorganizar el score header en tres columnas flexibles, con numeros autoajustables y metadata central centrada/truncable.
5. Documentar QA manual para telefono portrait y tablet landscape.
6. Validar con `npm test`, `npx tsc --noEmit` y `git diff --check`.

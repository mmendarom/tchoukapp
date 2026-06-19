# Implementation Log

## 2026-06-19 - Tactical angle sectors and final report propagation

Se agregaron sectores tacticos por angulo sin cambiar modelos de eventos, scoring, tracking, coordenadas normalizadas, mapas ni dependencias.

- `src/domain/court.ts` ahora deriva sectores como `marco derecho · 30°-60°`.
- El marco sale de `frame` cuando existe y, si falta, de la mitad horizontal de la ubicacion.
- El angulo se aproxima desde `y` normalizado en 0°-180° con bandas:
  - `0°-30°`;
  - `30°-60°`;
  - `60°-120°`;
  - `120°-150°`;
  - `150°-180°`.
- `Lectura en vivo`, `Lectura del tiempo`, `createTacticalInsights` y `generatePeriodInsights` usan sectores tacticos para puntos rivales y defensas rivales.
- `FinalSummaryScreen` ahora muestra `Lectura final`, `Efectividad ofensiva total` y sectores donde nos entraron/nos defendieron.
- `buildMatchReportData`, PDF HTML y texto compartible incluyen sectores tacticos y labels de rendimiento ofensivo:
  - `Tiros generados`;
  - `Puntos convertidos`;
  - `Tiros atajados`;
  - `Lectura táctica`.
- Eventos antiguos sin ubicacion se ignoran para sectores; eventos antiguos con ubicacion siguen agrupando.

QA manual recomendado:

- Registrar puntos rivales repetidos en un mismo sector y confirmar que la alerta usa `marco ... · ...°`.
- Registrar defensas rivales repetidas en un mismo sector y confirmar `Zona bloqueada` con sector tactico.
- Finalizar tiempo y confirmar que `Lectura del tiempo` no usa `zona izquierda/derecha`.
- Finalizar partido y revisar `Lectura final`, `Efectividad ofensiva total` y sectores.
- Exportar PDF y revisar `Rendimiento ofensivo`, `Lectura táctica` y sectores.
- Confirmar que partidos viejos sin ubicacion no crashean.

## 2026-06-19 - Period summary tactical polish and potential attack bars

Se refino `PeriodSummaryScreen` y `PlayerPerformanceBars` sin cambiar modelos de eventos, scoring, tracking, mapas, PDF/export ni dependencias.

- La columna `Ataque` de `PlayerPerformanceBars` ahora muestra dos capas:
  - fondo celeste suave para tiros generados por jugador;
  - barra azul fuerte para puntos convertidos.
- Los tiros generados salen de `puntos Uruguay normales + defensas rivales con playerId`.
- La fila de ataque muestra texto compacto tipo `4/6 tiros · 67%`.
- `punto en contra rival`, puntos rivales y defensas rivales legacy sin jugador no cuentan como intentos individuales.
- `PeriodSummaryScreen` reemplaza alertas genericas por `Lectura del tiempo`, calculada con recomendaciones reales del periodo.
- La lectura del tiempo muestra hasta 8 recomendaciones con datos concretos de tiros, efectividad, errores, puntos en contra, defensas y zonas.
- Las tarjetas de resumen del tiempo usan superficies de color para ataque, defensa, errores y efectividad.
- No hay referencias a asistencias y los jugadores defensivos con defensas no quedan marcados negativamente.

QA manual recomendado:

- Registrar para un jugador 4 puntos y 2 defensas rivales contra sus tiros.
- Confirmar que ataque muestra 6 tiros como fondo y 4 puntos convertidos como barra frontal.
- Confirmar texto `4/6 tiros · 67%` o equivalente.
- Registrar `punto en contra rival` y confirmar que no afecta la barra de ataque de ningun jugador.
- Finalizar el tiempo y confirmar que `Lectura del tiempo` muestra alertas concretas con numeros.
- Confirmar que no hay textos de asistencias.
- Confirmar que un defensor con defensas no se marca como baja participacion.
- Confirmar que resumen final sigue funcionando.

## 2026-06-19 - Live performance ranking refinement

Se refino el ranking visual de `Rendimiento en vivo` sin cambiar recomendaciones live, modelos de eventos, scoring, tracking, mapas ni PDF/export.

- El ranking de ataque en modo contribucion ahora prioriza:
  - mas puntos;
  - mas intentos;
  - mejor efectividad;
  - orden actual de cancha como desempate final.
- Un jugador con muchos goles ya no queda debajo de un jugador 1/1 solo por tener efectividad menor a 100%.
- El ranking de defensa mantiene:
  - mas defensas;
  - mayor share defensivo;
  - orden actual de cancha.
- El resaltado `Top` ahora incluye los dos primeros grupos de ranking en ataque y defensa.
- Si hay empate en un grupo top, todos los jugadores empatados quedan resaltados.
- Jugadores sin puntos/intentos no reciben `Top ataque`; jugadores sin defensas no reciben `Top defensa`.
- Se agregaron tests de ranking y empates.

QA manual recomendado:

- Registrar un jugador con 6 goles y 2 tiros defendidos.
- Registrar otro jugador con 1 gol en 1 intento.
- Confirmar que el jugador de 6 goles rankea arriba en ataque.
- Crear empate de segundo lugar y confirmar que todos los empatados tienen chip `Top`.
- Confirmar que jugadores sin estadisticas no tienen chip `Top`.
- Registrar defensas con varios jugadores y confirmar top 2 grupos defensivos.
- Confirmar que `Lectura en vivo` mantiene el comportamiento anterior.

## 2026-06-19 - Live match tactical layout refinement

Se refino `LiveMatchScreen` sin cambiar modelos de eventos, scoring, registro de acciones, mapas, PDF/export, persistencia ni dependencias.

- La grilla de acciones ahora queda agrupada por contexto:
  - fila Uruguay: `Punto Uruguay`, `Defensa`, `Error`;
  - fila rival: `Punto rival`, `Defensa rival`, `En contra rival`.
- `Lectura en vivo` ahora permite hasta 12 recomendaciones, manteniendo orden por prioridad.
- `Rendimiento en vivo` usa orden por contribucion:
  - ataque prioriza mas puntos, mas intentos, mejor efectividad y luego orden de cancha;
  - defensa prioriza mas defensas y luego orden de cancha.
- `PlayerPerformanceBars` resalta los dos primeros grupos de ranking de ataque/defensa con chip `Top` y borde/acento.
- `Últimas acciones` muestra mas acciones en tablet/landscape y estira mejor para aprovechar el espacio vertical.
- No se agregan nuevas reglas tacticas ni nuevos tipos de recomendacion.

QA manual recomendado:

- Abrir partido en vivo en telefono portrait.
- Confirmar fila Uruguay: `Punto Uruguay`, `Defensa`, `Error`.
- Confirmar fila rival: `Punto rival`, `Defensa rival`, `En contra rival`.
- Tocar cada accion y confirmar que mantiene comportamiento previo.
- Registrar puntos, defensas, errores y defensas rivales.
- Confirmar que `Rendimiento en vivo` ordena ataque por efectividad/contribucion.
- Confirmar que defensa ordena por defensas.
- Confirmar chip `Top` en mejores aportes.
- Generar varias recomendaciones y confirmar que pueden mostrarse hasta 12.
- Confirmar que no hay alertas con asistencias.
- En tablet/landscape, confirmar que `Últimas acciones` usa mejor el espacio y muestra mas filas.

## 2026-06-19 - Tactical UI polish for live recommendations and period summaries

Se hizo un pase de polish tactico y visual sin cambiar modelos de eventos, scoring, registro de acciones, mapas, PDF/export, persistencia ni dependencias.

- `Lectura en vivo` ahora muestra hasta 12 recomendaciones.
- `Lo están anulando` ya no aparece solo por tener 2 tiros defendidos: requiere 3+ intentos, 2+ tiros defendidos por el rival y efectividad menor a 75%.
- Jugadores con tiros defendidos pero efectividad de 75% o mas reciben una nota neutral `Le están defendiendo tiros`.
- `Baja efectividad` ahora requiere 4+ intentos y efectividad menor a 75%.
- Se agrego nota informativa de `Buen rendimiento ofensivo` para 4+ intentos y 75% o mas de efectividad, con prioridad baja.
- `LiveRecommendationsPanel` queda mas compacto, con acentos de severidad mas claros y dos columnas en ancho grande.
- `PlayerPerformanceBars` diferencia mejor ataque y defensa con superficies y barras de color.
- `PeriodSummaryScreen` agrega header de resultado, tarjetas de `Ataque`, `Defensa`, `Errores` y `Efectividad`, alertas tacticas con chips de severidad y encabezado `Mapas del tiempo`.
- `FinalSummaryScreen` recibe consistencia visual ligera con header y tarjetas de totales.
- `createTacticalInsights` deja de usar o mencionar asistencias en baja participacion; considera tiros y defensas para no castigar roles defensivos.
- No se agregaron dependencias.

QA manual recomendado:

- Registrar 8 tiros de un jugador: 6 goles y 2 defensas rivales.
- Confirmar que no aparece `Lo están anulando`.
- Confirmar que `Le están defendiendo tiros`, si aparece, usa tono neutral.
- Registrar 4 tiros: 2 goles y 2 defensas rivales.
- Confirmar `Lo están anulando` y/o `Baja efectividad`.
- Registrar errores repetidos y confirmar que siguen primero.
- Confirmar maximo 12 recomendaciones.
- Confirmar que ninguna alerta menciona asistencias.
- Confirmar que jugadores con defensas no aparecen como baja participacion.
- Finalizar un tiempo con puntos, defensas, errores y defensas rivales.
- Confirmar que el resumen del tiempo es mas colorido y legible.
- Probar telefono portrait y tablet landscape.

## 2026-06-18 - Tactical effectiveness Stage 4 live recommendations

Se agrego un bloque compacto de lectura tactica en vivo sin cambiar modelos de eventos, scoring, registro de acciones, mapas ni PDF.

- Se creo `src/domain/liveRecommendations.ts` con reglas puras de recomendaciones del periodo actual.
- Se creo `src/components/LiveRecommendationsPanel.tsx`.
- `LiveMatchScreen` muestra `Lectura en vivo` debajo de mapas/rendimiento y antes de controles del partido.
- El bloque muestra hasta 4 recomendaciones ordenadas por prioridad.
- Reglas implementadas:
  - puntos en contra repetidos;
  - errores repetidos por jugador;
  - jugador anulado por defensas rivales;
  - baja efectividad ofensiva;
  - zona vulnerable de puntos rivales;
  - zona bloqueada por defensas rivales;
  - baja participacion solo si no hay tiros ni defensas tras suficiente actividad;
  - aporte defensivo fuerte.
- Las alertas no mencionan asistencias.
- Jugadores con defensas Uruguay no se marcan como baja participacion.
- Defensas rivales legacy sin `playerId` siguen pudiendo alimentar alerta de zona bloqueada si tienen ubicacion.

QA manual recomendado:

- Iniciar partido y tiempo.
- Registrar varias `Defensa rival` contra el mismo jugador y confirmar `Lo están anulando`.
- Registrar tres intentos con baja conversion y confirmar `Baja efectividad`.
- Registrar errores repetidos por un jugador y confirmar `Errores repetidos`.
- Registrar dos puntos en contra y confirmar `Puntos regalados`.
- Registrar puntos rivales en una misma zona y confirmar `Zona vulnerable`.
- Registrar defensas Uruguay de un jugador y confirmar que no aparece como baja participacion.
- Confirmar que ninguna alerta menciona asistencias.
- Probar telefono y tablet landscape.

## 2026-06-18 - Tactical effectiveness Stage 3 report export

Se agrego efectividad ofensiva al reporte/PDF y al resumen de texto compartible sin cambiar modelos de eventos, scoring, mapas ni comportamiento live.

- `reportData` ahora incluye efectividad ofensiva por periodo y total.
- Cada fila muestra jugador, goles, tiros atajados por el rival, tiros intentados y porcentaje.
- El PDF renderiza `Efectividad ofensiva` por tiempo y `Efectividad ofensiva total`.
- El texto compartible agrega una linea compacta de efectividad con hasta tres jugadores.
- Defensas rivales legacy sin `playerId` siguen excluidas de efectividad individual.
- Si existen defensas rivales antiguas sin jugador, el PDF/texto muestra una nota de compatibilidad.
- Recomendaciones live siguen diferidas.

QA manual recomendado:

- Crear partido.
- Seleccionar jugador y registrar `Punto Uruguay`.
- Registrar `Defensa rival` contra el mismo jugador.
- Registrar otro punto con otro jugador.
- Registrar `En contra rival` y confirmar que no afecta efectividad individual.
- Finalizar partido y exportar PDF.
- Confirmar secciones `Efectividad ofensiva` y `Efectividad ofensiva total`.
- Confirmar columnas `Jugador`, `Goles`, `Atajados`, `Tiros`, `Efectividad`.
- Confirmar que partidos viejos con defensas rivales sin jugador no crashean y muestran nota si corresponde.

## 2026-06-18 - Tactical effectiveness Stage 1 and 2

Se implemento el primer corte de efectividad tactica sin cambiar reglas de score, mapas, PDF ni recomendaciones live.

- `Defensa rival` ahora requiere un jugador uruguayo seleccionado en cancha antes de abrir el mapa.
- Las nuevas defensas rivales guardan `playerId` del tirador y `defenseLocation`.
- Eventos viejos `opponent_defense` sin `playerId` siguen siendo compatibles y siguen apareciendo en mapas.
- Las barras de rendimiento ahora muestran en ataque puntos, tiros atajados por el rival y efectividad.
- La formula usada es `efectividad = puntos / (puntos + tiros atajados por el rival)`.
- `punto en contra rival`, puntos rivales, puntos en contra y defensas rivales legacy sin jugador quedan excluidos de efectividad individual.
- Se actualizaron tests de store y dominio.
- Se actualizo la spec 010 y el plan 010.

QA manual recomendado:

- Iniciar partido y tiempo.
- Tocar `Defensa rival` sin jugador seleccionado y confirmar `Seleccioná primero quién tiró.`
- Seleccionar jugador en cancha, tocar `Defensa rival`, marcar ubicacion y confirmar que se registra.
- Confirmar que el mapa `Dónde nos defendieron` se actualiza.
- Confirmar que el jugador suma un tiro atajado y la efectividad cambia.
- Registrar `Punto Uruguay` del mismo jugador y confirmar que la efectividad cambia.
- Registrar `En contra rival` y confirmar que no afecta la efectividad individual.
- Finalizar tiempo y confirmar barras/efectividad en resumen.
- Finalizar partido y confirmar barras/efectividad total.
- Abrir datos viejos con defensas rivales sin jugador y confirmar que no crashea.

## 2026-06-18 - Player performance bars Stage 0

Se implemento una primera version de barras de rendimiento por jugador sin cambiar modelo de eventos, scoring, registro de puntos/defensas/errores, mapas, PDF ni recomendaciones live.

- Se actualizo la spec 010 y el plan 010 con `Barras de rendimiento por jugador`.
- Se agrego `src/domain/playerPerformance.ts` con helpers puros.
- Se agrego `src/domain/playerPerformance.test.ts`.
- Se agrego `src/components/PlayerPerformanceBars.tsx` con barras horizontales usando Views de React Native.
- `LiveMatchScreen` muestra `Rendimiento en vivo` usando datos del tiempo actual y jugadores en cancha.
- `PeriodSummaryScreen` muestra `Rendimiento del tiempo`.
- `FinalSummaryScreen` muestra `Rendimiento total`.
- Ataque usa solo puntos normales de Uruguay con `playerId`.
- Defensa usa solo defensas Uruguay con `playerId`.
- `punto en contra rival` no afecta las barras de ataque.
- `Defensa rival` no afecta todavia las barras de defensa.
- No se agregaron dependencias.

Validacion:

- `npm test`: 15 archivos, 162 tests pasaron.
- `npx tsc --noEmit`: paso.
- `git diff --check`: paso.

QA manual recomendado:

- Iniciar un partido.
- Iniciar tiempo.
- Confirmar que aparece `Rendimiento en vivo`.
- Confirmar que los jugadores en cancha aparecen aunque tengan cero puntos/defensas.
- Registrar `Punto Uruguay` con un jugador.
- Confirmar que la barra de `Ataque` se actualiza.
- Registrar `Defensa` con otro jugador.
- Confirmar que la barra de `Defensa` se actualiza.
- Registrar `En contra rival`.
- Confirmar que no cambia la barra de ataque por jugador.
- Registrar `Defensa rival`.
- Confirmar que no cambia la columna de defensa Uruguay.
- Finalizar tiempo y confirmar `Rendimiento del tiempo`.
- Finalizar partido y confirmar `Rendimiento total`.
- Probar telefono portrait y tablet landscape.

## 2026-06-18 - Spec 010 tactical effectiveness planning

Se planifico la siguiente mejora tactica/estadistica sin cambiar codigo de produccion ni comportamiento de la app.

- Se inspecciono el modelo actual de eventos, store, estadisticas, insights, mapas live, resumenes y PDF.
- Hallazgo principal: `opponent_defense` hoy registra `defenseLocation` pero no `playerId`.
- Se creo `docs/specs/010-tactical-effectiveness-and-live-recommendations.md` con estado `Draft`.
- Se creo `docs/plans/010-tactical-effectiveness-and-live-recommendations-plan.md`.
- La propuesta define que nuevas `Defensa rival` deben asociarse al jugador uruguayo que tiro.
- Se definio la formula MVP de efectividad:
  - goles = puntos Uruguay normales con `playerId`;
  - tiros defendidos = `opponent_defense` con `playerId`;
  - tiros intentados = goles + tiros defendidos;
  - efectividad = goles / tiros intentados.
- Se documento que defensas rivales viejas sin `playerId` siguen en mapas pero no entran en efectividad por jugador.
- Se planifico un bloque live compacto de `Alertas tácticas`.
- Se planifico remover referencias a asistencias en insights y respetar roles defensivos.
- No se implementaron cambios de codigo.

## 2026-06-15 - Performance and responsiveness hardening

Se hizo una pasada enfocada de performance/responsividad sin cambiar reglas de score, modelos de eventos, tracking, mapas, backups, reportes, sustituciones ni timer.

Hallazgos:

- La app montaba la navegacion antes de que Zustand terminara de hidratar AsyncStorage, permitiendo render/interaccion prematura.
- `normalizeMatch` recreaba el array de `events` en cada normalizacion aunque los eventos ya estuvieran normalizados. En vivo, cada tick del timer podia invalidar memoizaciones de score/mapas y disparar recalculos innecesarios.
- `tickTimer` calculaba el tiempo restante varias veces para el mismo periodo.
- `LiveMapPanel` recalculaba datasets y conteos de mapas por cada render.
- `CourtLocationMap` recalculaba densidad de marcadores durante render.
- `MatchesScreen`, `PlayerManagerModal` y `TeamPoolManagerModal` hacian derivaciones de listas dentro del render.
- Acciones de backup/import, crear partido y guardar jugador/plantel necesitaban feedback/disabled mas claro contra doble toque.

Cambios:

- Se agrego `hasHydrated` / `setHasHydrated` en el store persistido y `App.tsx` muestra `Cargando datos...` hasta terminar hidratacion.
- `normalizeMatch` conserva la referencia de `events` cuando no hay eventos legacy que normalizar.
- `tickTimer` calcula `remainingSeconds` una sola vez por periodo activo.
- `LiveMapPanel` usa `React.memo` y `useMemo` para datasets, conteos y marcadores combinados.
- `CourtLocationMap` usa `React.memo` y memoiza marcadores/densidades.
- `LiveMatchScreen` memoiza score, ultimas acciones, jugadores disponibles/banco y usa callback estable para expandir mapas.
- `MatchesScreen` memoiza partidos visibles, plantel seleccionado, mapa de jugadores, titulares y banco.
- `PlayerManagerModal` memoiza jugadores ordenados y jugador en edicion.
- `TeamPoolManagerModal` memoiza el set de jugadores seleccionados.
- `Exportar backup`, `Importar backup`, `Restaurar backup`, `Crear partido`, `Guardar jugador` y `Guardar plantel` muestran estados como `Generando...`, `Seleccionando...`, `Restaurando...`, `Creando...` o `Guardando...` y bloquean doble toque.

QA manual recomendado:

- Abrir la app desde cold start y confirmar que `Cargando datos...` aparece solo mientras carga.
- Abrir un partido con muchos eventos, iniciar tiempo y observar que timer/acciones siguen fluidos.
- Registrar puntos, defensas y errores rapidamente.
- Cambiar pestañas de mapas en vivo y confirmar que no hay congelamientos perceptibles.
- Abrir `Gestionar jugadores` con muchos jugadores y verificar scroll/edicion.
- Abrir `Gestionar planteles` y verificar seleccion/guardado.
- Exportar backup e importar backup y confirmar feedback/disabled.
- Exportar PDF y confirmar que el feedback existente sigue funcionando.
- Probar telefono real y tablet landscape.

## 2026-06-15 - Home action hierarchy refinement

Se reorganizo Home en tres secciones funcionales sin cambiar comportamiento de negocio, navegacion ni logica de backup.

- `Partido` agrupa `Crear partido`, `Partidos` y `Fixture`.
- `Gestión` agrupa `Gestionar planteles`, `Gestionar jugadores` y `Jugadores`.
- `Datos` agrupa `Exportar backup` e `Importar backup`.
- `Crear partido` sigue siendo la accion primaria.
- `Importar backup` queda visualmente separado de acciones de partido y gestion para reducir toques accidentales.
- `Fixture` sigue navegando a la pantalla `Fixtures`.
- `Jugadores` sigue navegando a la pantalla `Players`.
- No se cambio match setup, planteles, jugadores, backup, scoring, mapas, reportes, sustituciones ni timer.

QA manual recomendado:

- Abrir Home y confirmar que logo/hero siguen visibles.
- Confirmar seccion `Partido`: `Crear partido`, `Partidos`, `Fixture`.
- Confirmar seccion `Gestión`: `Gestionar planteles`, `Gestionar jugadores`, `Jugadores`.
- Confirmar seccion `Datos`: `Exportar backup`, `Importar backup`.
- Tocar cada accion y confirmar que mantiene su flujo existente.
- Probar telefono portrait y tablet landscape.

## 2026-06-15 - Stage 4B local backup import and restore

Se implemento importacion/restauracion local de backups JSON con validacion y confirmacion antes de reemplazar datos.

- Home agrega la accion `Importar backup` junto a `Exportar backup`.
- Se agrego `expo-document-picker` con `npx expo install` para seleccionar archivos locales.
- `src/export/importBackup.ts` abre el picker, lee el archivo y devuelve validacion controlada.
- `src/domain/backup.ts` ahora valida y parsea backups:
  - JSON valido;
  - `backupVersion` soportado;
  - `data` presente;
  - arrays requeridos: `players`, `teamPools`, `matches`, `fixtures`;
  - campos minimos de jugadores, planteles, partidos y fixtures.
- Version incompatible muestra `Este backup no es compatible con esta versión de la app.`
- Archivos invalidos muestran `No se pudo importar el backup.`
- Antes de restaurar se muestra resumen con conteos y fecha exportada.
- El usuario debe confirmar `Restaurar backup`.
- `restoreBackupData` reemplaza `players`, `teamPools`, `matches` y `fixtures` como bloque.
- `activeMatchId` se limpia despues de restaurar para evitar estados live stale.
- Si la validacion falla, no se muta el estado actual.
- No se cambia tracking, scoring, mapas, sustituciones, timer, resumenes ni PDF.

QA manual recomendado:

- Exportar un backup.
- Crear un jugador de prueba.
- Crear o editar un plantel de prueba.
- Importar el backup anterior.
- Confirmar que aparece resumen de validacion.
- Tocar `Cancelar` y confirmar que los datos actuales siguen igual.
- Importar de nuevo y tocar `Restaurar backup`.
- Confirmar `Backup restaurado correctamente.`
- Confirmar que jugadores, planteles y partidos corresponden al backup.
- Intentar importar un archivo no JSON.
- Intentar importar JSON malformado.
- Intentar importar backup con `backupVersion` incompatible.

## 2026-06-15 - Stage 4A local backup export

Se implemento export-only de backup local JSON para proteger datos offline sin agregar import/restore todavia.

- Se agrego `src/domain/backup.ts` con builder puro de backup.
- Se agrego `src/export/exportBackup.ts` para escribir el JSON local y abrir la hoja nativa de compartir.
- Home agrega la accion `Exportar backup`.
- Si no hay share sheet disponible, la UI muestra `Backup generado, pero no se pudo compartir.`
- El backup incluye `players`, `teamPools`, `matches` y `fixtures`.
- El backup incluye metadata: `backupVersion`, `exportedAt`, `appName` y `dataVersion`.
- Se excluye estado transitorio como `activeMatchId`, modales, formularios e intervalos runtime.
- Se agrego `expo-file-system` con `npx expo install` para escribir archivos locales compatible con Expo SDK 54.
- Import/restore queda diferido para una etapa futura.
- No se modifica tracking, scoring, mapas, sustituciones, timer, resumenes ni PDF de partido.

QA manual recomendado:

- Abrir Home.
- Tocar `Exportar backup`.
- Confirmar `Generando backup...`.
- Confirmar que se abre la hoja nativa de compartir.
- Guardar o compartir el JSON.
- Abrir el JSON y confirmar metadata, jugadores, planteles, partidos y fixtures.
- Confirmar que los datos de la app no se modifican.
- Crear un jugador y editar/crear un plantel.
- Exportar de nuevo y confirmar que los datos nuevos aparecen.
- Probar Android e iOS/iPad si esta disponible.

## 2026-06-15 - PDF report map readability

Se mejoro la legibilidad de mapas tacticos en el PDF sin cambiar tracking, score, coordenadas, mapas live ni resumenes in-app.

- Los mapas PDF ya no se muestran como tres tarjetas pequenas en una fila.
- `Mapas del tiempo` y `Mapas totales` ahora renderizan un mapa grande por fila.
- Cada SVG de cancha usa viewBox `640x360` y altura visual aproximada de `260px`.
- Las tarjetas de mapa tienen mas padding, titulos mas legibles y reglas anti-corte (`break-inside` / `page-break-inside`).
- Los marcadores se agrandaron levemente y siguen siendo circulares.
- Se usan colores diferenciados en PDF: azul para puntos Uruguay, rojo para puntos rivales y violeta para defensas rivales.
- El modelo de coordenadas normalizadas no cambio.

Validacion:

- `npm test`: 13 archivos, 136 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Generar PDF desde un partido con muchas ubicaciones.
- Revisar mapas de cada tiempo: `Donde hicimos los puntos`, `Donde nos hicieron puntos` y `Donde nos defendieron`.
- Confirmar que cada mapa ocupa una fila grande y es mas facil de leer.
- Confirmar que puntos y clusters cerca del marco/area prohibida son visibles.
- Confirmar que los marcadores son circulares.
- Confirmar que los titulos de mapas no quedan huerfanos al final de una pagina.
- Revisar `Mapas totales`.
- Confirmar que el PDF puede ser mas largo, pero mantiene mejor lectura tactica.

## 2026-06-14 - Player roster Stage 3C plantel inline creation

Se implemento Stage 3C para crear jugadores desde `Gestionar planteles`, sin agregar delete, sin cambiar match creation, scoring, mapas, sustituciones, timer, resumenes ni export.

- Se extrajo `PlayerForm` como formulario reutilizable para alta/edicion de jugadores.
- `PlayerManagerModal` reutiliza `PlayerForm` y mantiene el flujo standalone de `Gestionar jugadores`.
- `TeamPoolManagerModal` agrega `Nuevo jugador` junto a la seleccion de jugadores.
- Al tocar `Nuevo jugador` dentro de un plantel se abre el formulario de alta sin cerrar el modal.
- `Cancelar` vuelve al formulario de plantel conservando nombre y jugadores seleccionados.
- `Guardar` usa `createPlayer`.
- Si el alta es exitosa, el nuevo jugador queda seleccionado automaticamente en el plantel actual.
- El plantel se persiste solo cuando el usuario toca `Guardar` en el plantel.

QA manual recomendado:

- Home -> `Gestionar planteles`.
- Crear un plantel nuevo.
- Seleccionar algunos jugadores existentes.
- Tocar `Nuevo jugador`.
- Tocar `Cancelar`.
- Confirmar que los jugadores seleccionados siguen seleccionados.
- Tocar `Nuevo jugador` otra vez.
- Crear `Jugador Prueba`.
- Confirmar que vuelve al formulario de plantel.
- Confirmar que `Jugador Prueba` aparece seleccionado.
- Guardar el plantel.
- Reabrir el plantel y confirmar que el jugador sigue incluido.
- Crear partido con ese plantel y confirmar que el jugador puede ser titular.
- Home -> `Gestionar jugadores`.
- Confirmar que el jugador aparece ahi tambien.
- Editar el jugador y confirmar que el plantel sigue referenciando el mismo registro.

## 2026-06-14 - Player manager modal interaction fix

Se corrigio la interaccion de `PlayerManagerModal` sin cambiar store, planteles, match creation, scoring, mapas, sustituciones, resumenes ni export.

- Causa: `Nuevo jugador` y `Editar` cambiaban el estado del modal, pero el formulario se renderizaba debajo de toda la lista dentro del `ScrollView`; con un roster largo la pantalla seguia mostrando la lista y parecia que los botones no respondian.
- `PlayerManagerModal` ahora tiene estados visuales claros:
  - lista de jugadores;
  - formulario `Nuevo jugador`;
  - formulario `Editar jugador`.
- Tocar `Nuevo jugador` reemplaza la lista por el formulario vacio.
- Tocar `Editar` reemplaza la lista por el formulario precargado del jugador.
- `Cancelar` vuelve a la lista sin guardar.
- `Guardar` sigue usando `createPlayer` o `updatePlayer`.
- `Cerrar` sigue cerrando el modal.

QA manual recomendado:

- Home -> `Gestionar jugadores`.
- Tocar `Nuevo jugador`.
- Confirmar que abre el formulario de alta.
- Tocar `Cancelar`.
- Confirmar que vuelve a la lista.
- Tocar `Nuevo jugador` otra vez.
- Crear un jugador.
- Confirmar que aparece en la lista.
- Tocar `Editar` en ese jugador.
- Confirmar que abre el formulario precargado.
- Cambiar nombre o numero.
- Guardar.
- Confirmar que la lista se actualiza.
- Cerrar el modal.
- Abrir `Gestionar planteles`.
- Confirmar que el jugador nuevo/editado aparece en la seleccion.

## 2026-06-14 - Player roster Stage 3B management UI

Se implemento Stage 3B de gestion de jugadores sin agregar delete ni cambiar scoring, match creation, mapas, sustituciones, timer, resumenes o export.

- Home agrega la accion `Gestionar jugadores`.
- Se agrego `PlayerManagerModal` para listar, crear y editar jugadores.
- La lista muestra numero, nombre, posicion, zona habitual y mano dominante.
- El formulario permite editar `Nombre`, `Apellido`, `Número`, `Posición`, `Zona habitual` y `Mano dominante`.
- La UI valida nombre, posicion, zona habitual y mano dominante antes de guardar.
- Crear jugadores usa `createPlayer`.
- Editar jugadores usa `updatePlayer` y preserva `id`.
- Los jugadores nuevos quedan disponibles en `Gestionar planteles` porque el modal de planteles lee `players` del store.
- Los jugadores nuevos no se agregan automaticamente a ningun plantel.

Validacion:

- `npm test`: 13 archivos, 136 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir Home.
- Tocar `Gestionar jugadores`.
- Confirmar que abre la lista `Jugadores`.
- Tocar `Nuevo jugador` usando el formulario vacio y confirmar validaciones.
- Crear jugador `Test Player`.
- Confirmar que aparece en la lista.
- Editar nombre/numero del jugador.
- Abrir `Gestionar planteles`.
- Confirmar que el jugador nuevo aparece en la seleccion.
- Agregarlo a un plantel.
- Crear partido con ese plantel.
- Confirmar que el jugador puede seleccionarse como titular.
- Confirmar que live y reportes muestran el nombre.

## 2026-06-14 - Player roster Stage 3A local state

Se implemento Stage 3A de gestion de roster sin agregar UI nueva, delete de jugadores ni cambios en scoring, mapas, sustituciones, timer, resumenes o export.

- `players` queda como fuente de datos local persistida en Zustand.
- Los jugadores iniciales se siembran desde `uruguayPlayers`.
- La migracion mergea jugadores default faltantes sin duplicar ids existentes.
- Se agrego `createPlayer(input)` al store.
- `createPlayer` valida campos requeridos, genera `id` unico desde nombre/apellido, autoasigna numero si falta y usa `caps/goals/blocks` en `0`.
- Se agrego `updatePlayer(playerId, updates)` al store.
- `updatePlayer` preserva `id`, valida campos editables y devuelve `true`/`false`.
- `resetDemoData` preserva jugadores locales y restaura partidos/fixtures demo.
- Crear/editar jugadores no agrega automaticamente jugadores a planteles.
- Team pools siguen validandose contra `players` del store.
- Partidos, eventos y snapshots historicos `availablePlayerIds` no se mutan.

Validacion:

- `npm test`: 13 archivos, 136 tests pasaron.
- `npx tsc --noEmit`: paso.

Limitacion documentada:

- Si se edita el nombre de un jugador, reportes/eventos viejos pueden mostrar el nombre actualizado porque todavia no hay snapshot historico de nombre.
- UI de gestion de jugadores, delete de jugadores y alta automatica en planteles quedan diferidos.

## 2026-06-14 - Team pool manager close UX and Mayores cleanup

Se corrigieron dos problemas del flujo de `Planteles` sin cambiar match creation, scoring, live match, mapas, sustituciones, resumenes ni export.

- `TeamPoolManagerModal` ahora tiene titulo `Planteles` con cierre compacto `✕` en el encabezado.
- Se agrego una accion `Cerrar` al pie del modal para una salida mas clara.
- `Cancelar` queda como accion de formulario para descartar creacion/edicion sin cerrar necesariamente el modal.
- Los pools default persistidos se normalizan por `id`.
- `Mayores` se fuerza al roster mayor original y elimina cualquier `plus40-*` persistido.
- `+40` se mantiene como pool fijo separado con sus ids default.
- Planteles creados por el usuario se preservan sin normalizarlos contra defaults.
- Se subio la version persistida a `7` para ejecutar la limpieza en estados viejos.
- Los snapshots historicos `availablePlayerIds` de partidos existentes no se mutan.

Validacion:

- `npm test`: 12 archivos, 126 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir Home.
- Tocar `Gestionar planteles`.
- Confirmar que el cierre `✕` es visible y tappable.
- Confirmar que `Cerrar` aparece al pie del modal.
- Crear un plantel y usar `Cancelar`.
- Editar un plantel y usar `Cancelar`.
- Editar un plantel y guardar.
- Confirmar que `Mayores` no muestra jugadores `plus40-*`.
- Confirmar que `+40` muestra jugadores `plus40-*`.
- Confirmar que `Errazquin` y `Fede` aparecen donde corresponde sin duplicar registros.
- Crear partido con `Mayores` y confirmar que solo aparecen jugadores mayores.
- Crear partido con `+40` y confirmar que aparecen jugadores +40.
- Confirmar que partidos viejos finalizados siguen abriendo su resumen final.

## 2026-06-14 - Home Uruguay identity redesign

Se rediseño la pantalla principal para darle mayor identidad visual de Uruguay/Tchoukball, sin cambiar reglas de partido, scoring, mapas, resumenes, planteles ni persistencia.

- Home integra el logo desde `assets/association-logo.png`.
- El hero usa titulo `Tchoukball Uruguay` y subtitulo `Estadísticas, planteles y análisis en tiempo real`.
- Se aplica una paleta celeste, blanco y azul profundo.
- `Crear partido` queda como accion primaria y abre el modal de setup existente en `Partidos`.
- `Partidos` y `Gestionar planteles` quedan como acciones claras de segundo nivel.
- Se agregan cards sutiles de contexto: `Partidos`, `Planteles` y `Próximos`.
- `Gestionar planteles` sigue abriendo el mismo `TeamPoolManagerModal`.
- `Retomar en vivo` aparece como accion destacada solo cuando hay partido activo.

Validacion:

- `npm test`: 12 archivos, 125 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir Home en telefono.
- Confirmar que el logo aparece proporcionado y sin deformarse.
- Confirmar que la pantalla se ve balanceada y con identidad celeste/blanco/azul.
- Tocar `Crear partido` y confirmar que abre el setup existente.
- Tocar `Partidos` y confirmar que abre la lista.
- Tocar `Gestionar planteles` y confirmar que abre la gestion de planteles.
- Probar telefono portrait.
- Probar tablet landscape.
- Confirmar que no cambio el tracking de partido.

## 2026-06-14 - Move team pool management to home

Se movio la entrada `Gestionar planteles` desde `Partidos` a la pantalla principal, sin cambiar modelo, persistencia ni reglas de creacion/edicion de planteles.

- `HomeScreen` muestra `Gestionar planteles` como accion secundaria de nivel app.
- `MatchesScreen` ya no muestra la entrada de gestion de planteles.
- Se extrajo `TeamPoolManagerModal` para reutilizar la misma UI de `Planteles` desde Home.
- Crear/editar planteles sigue usando las mismas acciones persistidas del store.
- Crear partido sigue usando los planteles persistidos como en Stage 2C.

Validacion:

- `npm test`: 12 archivos, 125 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir la pantalla principal.
- Confirmar que aparece `Gestionar planteles`.
- Tocar `Gestionar planteles`.
- Confirmar que abre la UI `Planteles`.
- Crear un plantel de prueba.
- Editar un plantel.
- Confirmar que los datos persisten.
- Ir a `Partidos`.
- Confirmar que `Gestionar planteles` ya no aparece en esa pantalla.
- Confirmar que la lista de partidos sigue funcionando.
- Confirmar que `Crear partido` sigue funcionando.
- Confirmar que los planteles existentes aparecen en `Crear partido`.

## 2026-06-14 - Team pools Stage 2C match creation integration

Se implemento Stage 2C para usar planteles persistidos en la creacion de partidos, sin cambiar scoring, eventos, mapas, sustituciones, timer, resumenes ni export.

- `Crear partido` ahora lista los planteles guardados en el store.
- Se puede elegir `Mayores`, `+40` o cualquier plantel creado por el usuario.
- La seleccion de titulares se limita a los jugadores del plantel seleccionado.
- Al cambiar de plantel se limpian titulares para no mezclar jugadores entre pools.
- El partido guarda `teamPoolId`, `teamPoolName` y `availablePlayerIds` como snapshot historico.
- Planteles con menos de 7 jugadores muestran `El plantel necesita al menos 7 jugadores.` y no permiten crear.
- Si no hay exactamente 7 titulares, se muestra `Elegí 7 titulares para iniciar el partido.`.
- Editar un plantel despues de crear un partido no cambia el roster historico de ese partido.
- Reporte/PDF sigue usando `match.teamPoolName`, ahora tambien para `+40` o planteles custom.
- Delete de planteles y player CRUD siguen diferidos.

Validacion:

- `npm test`: 12 archivos, 125 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir `Crear partido`.
- Ingresar rival `Brasil`.
- Seleccionar plantel `+40`.
- Confirmar que la lista de titulares muestra solo jugadores de `+40`.
- Seleccionar 7 titulares.
- Crear partido.
- Confirmar que la cancha live muestra esos 7 titulares.
- Confirmar que el banco muestra los restantes del plantel `+40`.
- Hacer una sustitucion y confirmar que solo aparece el roster del partido.
- Finalizar partido y exportar PDF.
- Confirmar `Plantel: +40` en el reporte.
- Editar `+40` despues de crear el partido.
- Reabrir el partido creado y confirmar que su roster no cambio.

## 2026-06-14 - Fixed +40 default team pool

Se separo el plantel `+40` del plantel `Mayores` en los datos mock/default sin cambiar la creacion de partidos ni el flujo live.

- `Mayores` ya no se define con todos los jugadores globales.
- `Mayores` usa una lista explicita de ids del roster mayor original.
- `+40` se agrega como pool default separado con ids explicitos.
- `errazquin` y `fede` aparecen en ambos planteles por el mismo `id`, sin duplicar registros de jugador.
- La normalizacion de pools puede agregar defaults faltantes, como `+40`, sin sobrescribir pools persistidos existentes.
- La migracion mergea jugadores default faltantes para que instalaciones con estado viejo puedan recibir los jugadores `+40`.
- Los partidos demo siguen usando `Mayores`.
- La creacion de partido sigue limitada a `Mayores`; elegir `+40` al crear partido queda para Stage 2C.

Validacion:

- `npm test`: 12 archivos, 121 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir `Partidos`.
- Tocar `Gestionar planteles`.
- Confirmar que aparecen `Mayores` y `+40`.
- Confirmar que `Mayores` no incluye jugadores `plus40-*`.
- Confirmar que `+40` incluye jugadores `plus40-*`.
- Confirmar que `Errazquin` y `Fede` pueden estar en `+40` sin duplicarse como jugadores.
- Confirmar que los partidos demo siguen usando `Mayores`.
- Si una instalacion vieja ya tenia un `Mayores` persistido con todos los jugadores, editarlo manualmente o limpiar storage local para regenerar defaults.

## 2026-06-13 - Team pools Stage 2B management UI

Se implemento Stage 2B de planteles/categorias con UI simple de gestion, sin integrar todavia planteles custom en la creacion de partidos.

- `MatchesScreen` agrega la accion secundaria `Gestionar planteles`.
- El modal `Planteles` lista planteles existentes con nombre y cantidad de jugadores.
- Se puede crear un `Nuevo plantel` usando jugadores globales existentes.
- Se puede editar nombre y jugadores de un plantel existente.
- La seleccion de jugadores es multi-select y muestra conteo de seleccionados.
- La UI valida nombre vacio, lista sin jugadores y errores del store.
- Se reutilizan `createTeamPool` y `updateTeamPool`.
- Delete de planteles, player CRUD, fotos e integracion con creacion de partido quedan diferidos.
- Para preservar alcance, la creacion de partido sigue usando `Mayores` hasta Stage 2C.

Validacion:

- `npm test`: no se pudo ejecutar en esta entrada porque la herramienta rechazo el comando por limite de uso.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir `Partidos`.
- Tocar `Gestionar planteles`.
- Verificar que aparece `Mayores`.
- Tocar `Nuevo plantel`.
- Intentar guardar con nombre vacio y confirmar validacion.
- Ingresar `Sub 18`.
- Intentar guardar sin jugadores y confirmar validacion.
- Seleccionar jugadores y confirmar que el conteo sube.
- Guardar y verificar que `Sub 18` aparece en la lista.
- Editar `Sub 18`, cambiar nombre o jugadores y guardar.
- Cancelar una creacion/edicion y confirmar que no guarda cambios.
- Confirmar que `Crear partido` sigue usando el flujo actual con `Mayores`.

## 2026-06-13 - Team pools Stage 2A store and persistence

Se implemento Stage 2A de planteles/categorias sin agregar UI de gestion ni cambiar el flujo de partido en vivo.

- `teamPools` queda como parte del store persistido offline-first.
- Se agregaron helpers puros para normalizar nombres, filtrar jugadores existentes y asegurar el pool default `Mayores`.
- `createTeamPool(name, playerIds)` crea planteles locales y rechaza nombres vacios o listas sin jugadores validos.
- `updateTeamPool(poolId, updates)` actualiza nombre y jugadores preservando el `id`.
- Editar un plantel no modifica partidos existentes: los partidos siguen usando su snapshot historico `availablePlayerIds`.
- `Mayores` se asegura por default/migracion sin duplicarse.
- `resetDemoData` conserva planteles creados por el usuario y mantiene `Mayores`.
- Delete de planteles, UI de gestion y rosters reales de `Sub 18` / `+40` quedan diferidos.

Validacion:

- `npm test`: 12 archivos, 119 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado cuando exista UI:

- Crear/editar planteles locales.
- Confirmar que sobreviven reinicio de app.
- Confirmar que editar un plantel no cambia partidos ya creados.
- Confirmar que `Mayores` no se duplica.

## 2026-06-13 - Real match setup field bugfixes

Se corrigieron dos problemas detectados al probar el setup real de partido, sin cambiar scoring, eventos, timer, mapas, sustituciones ni export.

- Los partidos `Finalizado` ya no se pueden reiniciar desde la lista de partidos.
- Tocar una tarjeta finalizada o `Ver resumen` navega a `Resumen final`.
- `startMatch` ahora ignora partidos `finished` y `cancelled` como segunda linea de defensa.
- El label/chip `Plantel: Mayores` queda centrado y mas legible en tarjetas de partidos.
- El selector de `Plantel` en el setup queda centrado y con mayor peso visual.
- El label de plantel en el marcador live se muestra como badge compacto centrado.

Validacion:

- `npm test`: 11 archivos, 109 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Crear partido.
- Finalizar partido.
- Volver a la lista de partidos.
- Tocar el partido finalizado y confirmar que abre `Resumen final`.
- Confirmar que no aparece `Iniciar partido` ni `Retomar` para partidos finalizados.
- Confirmar que PDF/share siguen disponibles desde el resumen final.
- Crear/abrir partido con `Plantel: Mayores`.
- Confirmar que el plantel se ve centrado, balanceado y legible en telefono portrait y tablet landscape.

## 2026-06-13 - Real match setup planning

Se planifico la proxima feature importante sin modificar codigo de produccion ni comportamiento de la app.

- Se agrego `docs/specs/008-real-match-setup.md` para definir un flujo real de setup de partido.
- Se agrego `docs/plans/008-real-match-setup-plan.md` con implementacion por etapas.
- El Stage 1 propuesto reemplaza la creacion demo-like por un wizard/modal con rival, convocados, 7 titulares, banco derivado y revision.
- El modelo recomendado mantiene `LineupSnapshot.playerIds` como fuente de los 7 slots neutrales y agrega un campo opcional de convocados, por ejemplo `availablePlayerIds`.
- El banco debe seguir siendo derivado, no una fuente independiente.
- Stage 2 queda para colocar titulares en cancha visual 3 izquierda - 1 centro - 3 derecha.
- Stage 3 queda para presets locales de convocados si field testing lo justifica.
- No se implementaron cambios de app.

Actualizacion previa a Stage 1:

- Se agrego explicitamente el concepto `TeamPool` / `Plantel`.
- Los planteles referencian jugadores globales por `id`.
- Stage 1 usara solo `Mayores` con el roster real actual para evitar pools vacios confusos.
- `Sub 18` y `+40` quedan documentados como categorias futuras hasta que existan listas reales.
- El partido debe guardar `teamPoolId`, `teamPoolName` y `availablePlayerIds` como snapshot historico.
- El banco sigue derivado desde `availablePlayerIds - LineupSnapshot.playerIds`.

Implementacion Stage 1:

- Se agrego `TeamPool` al dominio.
- Se sembro el plantel `Mayores` con el roster actual de Uruguay.
- `Sub 18` y `+40` quedan diferidos hasta contar con listas reales; no se agregaron pools vacios seleccionables.
- `Match` ahora puede guardar `teamPoolId`, `teamPoolName` y `availablePlayerIds`.
- `Crear partido` abre un setup con rival, plantel, seleccion de 7 titulares y banco derivado.
- Stage 1 usa todos los jugadores de `Mayores` como convocados para reducir riesgo; seleccion manual de convocados queda diferida.
- El live usa `availablePlayerIds` para calcular el banco, con fallback al roster global en partidos viejos.
- Las sustituciones rechazan jugadores fuera del roster snapshot del partido.
- El reporte incluye `Plantel: Mayores` cuando esta disponible.

Validacion:

- `npm test`: 11 archivos, 108 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Crear partido.
- Ingresar rival `Brasil`.
- Confirmar plantel `Mayores`.
- Elegir 7 titulares.
- Confirmar que el banco se muestra con los restantes de Mayores.
- Crear partido y verificar que el live muestra esos 7 en cancha.
- Entrar a `Cambiar jugadores` y confirmar que solo aparecen suplentes del roster del partido.
- Hacer una sustitucion y usar `Deshacer`.
- Finalizar tiempo y partido.
- Exportar PDF y confirmar `Plantel: Mayores`.
- Reiniciar datos demo y confirmar que el demo sigue funcionando.
- Abrir partido viejo si existe y confirmar fallback sin crash.

## 2026-06-13 - Editable rivals Stage 1

Se implemento Stage 1 de rivales editables sin agregar CRUD, recientes, backend, auth ni cloud.

- `Crear partido` ahora abre un modal con campo `Rival`.
- El usuario puede ingresar un nombre libre, por ejemplo `Brasil`.
- El nuevo partido guarda el rival en `Match.opponent`.
- Si el campo queda vacio, el rival se normaliza a `Rival`.
- `createDemoMatch` y `Reiniciar datos demo` mantienen `Argentina` como dato demo.
- Partidos viejos sin `opponent` se normalizan de forma defensiva a `Rival`.
- Marcador live, lista de partidos, resumen por tiempo, resumen final, dashboard y reportes usan el nombre normalizado.
- Lista de rivales recientes y CRUD completo quedan diferidos.

Validacion:

- `npx tsc --noEmit`: paso.
- `npm test`: no se pudo ejecutar en esta sesion porque la herramienta rechazo el comando por limite de uso.

QA manual recomendado:

- Crear partido con rival `Brasil`.
- Confirmar que el marcador muestra `vs Brasil`.
- Registrar puntos y finalizar un tiempo.
- Confirmar que el resumen del tiempo usa `Brasil`.
- Finalizar el partido y confirmar que el resumen final usa `Brasil`.
- Exportar PDF y compartir texto; confirmar `Uruguay vs Brasil`.
- Crear partido con rival vacio y confirmar fallback `Rival`.
- Reiniciar datos demo y confirmar que el demo sigue funcionando con `Argentina`.

## 2026-06-13 - Live map panel compact polish

Se documento e implemento el polish compacto del panel de mapas en vivo.

- `Combinado` pasa a ser el primer tab y la vista seleccionada por defecto.
- Se quitan los textos `Mapas en vivo` y `Tiempo actual` del panel para liberar espacio visual.
- El comportamiento de tiempo actual no cambia.
- `Defensas nuestras` como heatmap queda explicitamente diferido: defensas Uruguay registran quien defendio, no ubicacion.
- Uruguay defensas siguen siendo estadistica por jugador solamente.

Validacion:

- `npm test`: 10 archivos, 94 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir partido en vivo.
- Confirmar que no aparece el titulo `Mapas en vivo`.
- Confirmar que no aparece el subtitulo `Tiempo actual`.
- Confirmar orden de tabs: `Combinado`, `Puntos nuestros`, `Puntos rivales`, `Defensas rivales`.
- Confirmar que `Combinado` queda seleccionado por defecto.
- Registrar punto Uruguay, punto rival y defensa rival; confirmar que `Combinado` se actualiza.
- Registrar defensa Uruguay y confirmar que no aparece en mapas.
- Confirmar que los mapas siguen usando solo el tiempo actual.

## 2026-06-13 - Live maps combined view

Se documento e implemento un refinamiento del panel `Mapas en vivo`, sin cambiar reglas de score, eventos, persistencia, timer, sustituciones ni export PDF.

- El panel suma el cuarto tab `Combinado`.
- `Combinado` superpone en un mismo mapa:
  - puntos nuestros con marcador azul;
  - puntos rivales con marcador rojo;
  - defensas rivales con marcador violeta.
- La vista combinada sigue usando solo eventos del tiempo actual.
- `Punto en contra`, `Punto en contra rival`, defensas Uruguay y eventos sin ubicacion siguen fuera de mapas.
- Uruguay defensas siguen siendo estadistica por jugador, no mapa.

Validacion:

- `npm test`: 10 archivos, 94 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir partido en vivo en tablet landscape.
- Confirmar tabs `Puntos nuestros`, `Puntos rivales`, `Defensas rivales` y `Combinado`.
- Registrar puntos Uruguay con ubicacion.
- Registrar puntos rivales con ubicacion.
- Registrar defensas rivales con ubicacion.
- Abrir `Combinado` y verificar que aparecen los tres colores.
- Verificar leyenda azul/rojo/violeta.
- Registrar `Punto en contra` y `Punto en contra rival`; confirmar que no aparecen en `Combinado`.
- Usar `Deshacer` y confirmar que el mapa combinado se actualiza.
- Finalizar el tiempo e iniciar el siguiente; confirmar que `Combinado` muestra solo el tiempo actual.
- Probar telefono portrait y confirmar que los 4 tabs siguen usables.

## 2026-06-13 - Live maps panel

Se implemento el panel de mapas en vivo para `LiveMatchScreen`, sin cambiar reglas de score, eventos, persistencia ni export PDF.

- En tablet landscape, `Mapas en vivo` aparece en la columna izquierda bajo las acciones/deshacer, usando el espacio libre detectado en pruebas.
- En telefono y layouts mas chicos, el panel aparece mas abajo y queda colapsable para no entorpecer el registro.
- El panel muestra un mapa por vez con tabs:
  - `Puntos nuestros`.
  - `Puntos rivales`.
  - `Defensas rivales`.
- Los mapas usan solo datos del tiempo actual.
- `Puntos nuestros` incluye puntos Uruguay normales con `landingLocation`.
- `Puntos rivales` incluye puntos rivales normales con `landingLocation`.
- `Defensas rivales` incluye eventos `opponent_defense` con `defenseLocation`.
- `Punto en contra`, `Punto en contra rival` y defensas Uruguay quedan fuera de mapas live porque no tienen ubicacion tactica real.
- Se extrajo `CourtLocationMap` para reutilizar cancha y marcadores entre resumenes y mapas live.
- Se agregaron helpers puros en `src/domain/liveMaps.ts` y tests de filtrado por tiempo/tipo de evento.

Validacion:

- `npm test`: 10 archivos, 92 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Abrir partido en vivo en tablet landscape.
- Confirmar que `Mapas en vivo` aparece bajo las acciones del lado izquierdo.
- Confirmar tabs `Puntos nuestros`, `Puntos rivales` y `Defensas rivales`.
- Registrar un punto Uruguay con ubicacion y confirmar que aparece en `Puntos nuestros`.
- Registrar un punto rival con ubicacion y confirmar que aparece en `Puntos rivales`.
- Registrar una defensa rival con ubicacion y confirmar que aparece en `Defensas rivales`.
- Registrar `Punto en contra` y confirmar que no aparece en mapas.
- Registrar `Punto en contra rival` y confirmar que no aparece en mapas.
- Usar `Deshacer` y confirmar que el mapa se actualiza.
- Finalizar un tiempo e iniciar el siguiente; confirmar que los mapas muestran el tiempo actual.
- Probar telefono portrait y confirmar que el panel colapsable no incomoda las acciones.

## 2026-06-13 - Editable rivals and live maps planning

Se planificaron las proximas mejoras de producto sin modificar codigo de produccion ni comportamiento de la app.

- Se agrego `docs/specs/007-opponents-and-live-heatmaps.md` para cubrir rivales editables y mapas/estadisticas en vivo.
- Se agrego `docs/plans/007-opponents-and-live-heatmaps-plan.md` con implementacion por etapas.
- La etapa recomendada para el MVP es usar `Match.opponent` como texto libre al crear partido, con fallback `Rival` y demo default `Argentina`.
- La lista local de rivales recientes queda como Stage 2 opcional.
- Los mapas en vivo quedan planificados solo para eventos con ubicacion real: puntos Uruguay, puntos rival y defensas del rival.
- Las defensas de Uruguay quedan como estadistica por jugador, no como mapa, porque no registran ubicacion.

## 2026-06-13 - Court map tablet readability refinement

Se refino la UI de mapas luego de pruebas en tablet/iPad, sin cambiar el modelo de ubicacion ni la logica de coordenadas normalizadas.

- `CourtMapInput` agranda sustancialmente los botones inferiores `Cancelar` y `Confirmar ubicacion` / `Cambiar ubicacion`.
- La cancha del input reduce su altura maxima para reservar una zona inferior clara y comoda de tocar.
- Se mantiene la medicion real del rectangulo de cancha y la normalizacion `x/y` desde el tap.
- `CourtMapSummary` aumenta la altura de los mapas en telefono y tablet, con una altura mayor en tablet landscape.
- Los marcadores de resumen siguen posicionados por porcentaje desde coordenadas normalizadas y mantienen forma circular.

QA manual recomendado:

- Abrir un partido en vivo.
- Tocar `Punto Uruguay` con jugador seleccionado.
- Verificar que `Cancelar` y `Confirmar ubicacion` / `Cambiar ubicacion` son grandes y faciles de tocar.
- Tocar varias zonas de la cancha y confirmar que el marcador aparece donde se toca.
- Repetir con `Punto rival` y `Defensa rival`.
- Probar telefono portrait, telefono landscape y tablet landscape.
- Finalizar un tiempo con puntos y defensas rivales en distintas zonas.
- Verificar que los mapas de resumen son mas altos, legibles y con marcadores circulares.
- Verificar que `Sin ubicaciones registradas` sigue apareciendo en mapas vacios.

## 2026-06-06 - Field testing UX/report refinements

Se implemento un batch de bugfixes luego de pruebas reales en tablet/iPad, sin cambiar reglas de score, modelos de eventos ni persistencia.

- `LiveMatchScreen` ajusta el layout en tablet landscape para dar mas ancho relativo a la zona de acciones.
- El banco queda oculto fuera de `Cambiar jugadores`; aparece solo en modo cambio y vuelve a colapsar al cancelar o confirmar.
- `CourtMapInput` reduce levemente la altura de la cancha y agranda las acciones inferiores para mejorar taps de `Cancelar` y `Confirmar ubicacion`.
- `CourtMapSummary` fuerza `borderRadius` dinamico segun el tamano real del marcador para que los puntos se vean circulares en iPad/tablet.
- `src/domain/insights.ts` corrige mojibake en textos con acentos que pueden aparecer en PDF y resumen compartido.
- `src/export/reportHtml.ts` declara `UTF-8` y usa labels acentuados en el reporte.
- `FinalSummaryScreen` agrega `Volver al inicio` sin borrar datos ni resetear estado.

Validacion:

- `npm test`: 9 archivos, 87 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual recomendado:

- Probar pantalla live en tablet landscape.
- Verificar que los botones de accion tienen espacio suficiente.
- Verificar que el banco esta oculto hasta tocar `Cambiar jugadores`.
- Verificar que sustituciones e intercambios siguen funcionando.
- Abrir mapa de ubicacion y verificar botones inferiores grandes y faciles de tocar.
- Registrar ubicaciones y verificar precision de tap.
- Finalizar tiempo y verificar que los marcadores de resumen se ven circulares.
- Exportar PDF y verificar acentos: `formacion/formación`, `convirtio/convirtió`, `esta/está`, `tacticas/tácticas`, `ubicacion/ubicación`.
- Compartir resumen textual y verificar que no aparece `Ã`, `Â` ni `�`.
- Finalizar partido y tocar `Volver al inicio`.
- Confirmar que vuelve a Home sin borrar el partido.
- Probar telefono portrait y tablet landscape.

## 2026-06-04 - Report Export v2 implemented

Se implemento `Report Export v2` sobre el export existente, sin cambiar el flujo en vivo ni los modelos persistidos.

- `src/domain/reportData.ts` ahora expone resumen ejecutivo y datasets de mapas por tiempo/totales.
- `src/export/reportHtml.ts` ahora genera un PDF con mejor jerarquia: portada, resumen ejecutivo, tiempos, totales, mapas, formaciones y notas.
- El PDF incluye SVG inline para:
  - `Donde hicimos los puntos`.
  - `Donde nos hicieron puntos`.
  - `Donde nos defendieron`.
- Los mapas usan coordenadas normalizadas existentes y no infieren ubicaciones.
- `Punto en contra` y `Punto en contra rival` quedan fuera de mapas porque no tienen ubicacion tactica.
- El resumen textual para compartir se acorto para WhatsApp e incluye resultado, parciales, top stats, zonas e insights.
- No se agregaron dependencias nuevas; se mantiene `expo-print` y `expo-sharing`.

Validacion:

- `npm test`: 9 archivos, 87 tests pasaron.
- `npx tsc --noEmit`: paso.

QA manual pendiente:

- Finalizar un partido con datos en los 3 tiempos.
- Incluir puntos Uruguay por distintos jugadores, puntos rival, punto en contra, punto en contra rival, defensas Uruguay, defensas rival, faltas, sustituciones e intercambios.
- Exportar PDF.
- Verificar que abre/share sheet funciona.
- Verificar que cada tiempo tiene datos correctos.
- Verificar que la seccion de totales tiene datos correctos.
- Verificar que los mapas aparecen y que los puntos coinciden razonablemente con las ubicaciones registradas.
- Verificar que los puntos de jugador no incluyen punto en contra rival.
- Verificar que no aparecen enums crudos.
- Verificar que el PDF es legible en telefono.
- Probar `Compartir resumen`.
- Probar un partido con pocos datos y confirmar que el reporte no crashea.

## 2026-06-04 - Report Export v2 planning

Se planifico `Report Export v2` sin modificar codigo de produccion ni comportamiento de la app.

- Se audito la implementacion actual de export:
  - `src/domain/reportData.ts` arma datos puros.
  - `src/export/reportHtml.ts` genera HTML y texto compartible.
  - `src/export/exportMatchReport.ts` integra `expo-print` y `expo-sharing`.
  - `FinalSummaryScreen` llama las acciones de export/share.
- Se documento que el reporte actual ya incluye score, stats por periodo, totales, defensas, defensas rivales, faltas, puntos en contra, puntos en contra rival, cambios, intercambios, formaciones, insights, notas y zonas textuales.
- Se documento la brecha principal: falta resumen ejecutivo fuerte, mapas visuales exportables por periodo/total y un fallback textual mas corto para WhatsApp.
- Se actualizo `docs/specs/005-match-report-export.md` con la seccion `Report Export v2`.
- Se actualizo `docs/plans/005-match-report-export-plan.md` con etapas incrementales para datos, HTML, mapas SVG, texto y QA.
- Se extendio `docs/decisions/002-match-report-export-format.md` para elegir SVG inline en HTML como enfoque de mapas PDF sin dependencias nuevas.
- No se implemento Report Export v2 todavia.

## 2026-05-31 - Live action grid equal-width rows

Se refino la grilla de acciones del partido en vivo para equilibrar area tactil y peso visual.

- La primera fila ahora tiene tres acciones con el mismo ancho: `Punto Uruguay`, `Punto rival`, `En contra rival`.
- La segunda fila ahora tiene tres acciones con el mismo ancho: `Defensa`, `Defensa rival`, `Error`.
- `Deshacer` queda como accion full width debajo.
- Los handlers y reglas de cada accion no cambiaron.
- Se mantienen colores diferenciados: azul, rojo oscuro, verde, teal, violeta, rojo y naranja para deshacer.

QA manual recomendado:

- Abrir partido en vivo en telefono en portrait.
- Verificar que la primera fila tiene tres botones de igual ancho: `Punto Uruguay`, `Punto rival`, `En contra rival`.
- Verificar que la segunda fila tiene tres botones de igual ancho: `Defensa`, `Defensa rival`, `Error`.
- Verificar que todos los labels son legibles.
- Verificar que los botones son faciles de tocar.
- Verificar que el texto auxiliar del jugador no rompe el layout.
- Tocar cada accion y confirmar que el comportamiento no cambio.
- Rotar a landscape y verificar que la grilla sigue usable.
- Verificar que `Deshacer` queda full width y funciona.

## 2026-05-31 - Defensa split action refinement

Se refino la UX de la defensa dividida para acelerar el registro en vivo.

- Se elimino el popup/modal `Registrar defensa`.
- La grilla de acciones ahora muestra una accion dividida `Defensa` / `Defensa rival`.
- `Defensa` registra inmediatamente la defensa del jugador uruguayo seleccionado en cancha.
- `Defensa rival` abre directamente el mapa `¿Dónde nos defendieron?`.
- Los botones usan colores distintos: teal para `Defensa` y violeta para `Defensa rival`.
- No se cambio el modelo de eventos, heatmaps, score, puntos, errores, cambios, timer, undo ni export PDF.

QA manual recomendado:

- Abrir partido en vivo e iniciar tiempo.
- Tocar `Defensa` sin jugador seleccionado y confirmar `Seleccioná primero un jugador en cancha.`.
- Seleccionar jugador en cancha.
- Tocar `Defensa` y confirmar que se registra inmediatamente sin modal.
- Confirmar feedback `+1 defensa · {jugador}`.
- Tocar `Defensa rival` y confirmar que abre el mapa.
- Marcar ubicacion y confirmar feedback `Defensa rival registrada`.
- Confirmar que el score no cambia.
- Usar `Deshacer` para ambos tipos de defensa.
- Finalizar tiempo y confirmar que `Dónde nos defendieron` sigue actualizando.
- Revisar portrait/landscape y que los colores se distinguen rapido.

## 2026-05-31 - Defensa rival y mapas visuales

Se implemento la spec `docs/specs/006-rival-defense-and-heatmaps.md`.

- `Defensa` ahora abre el modal `Registrar defensa` con dos opciones: `Defensa Uruguay` y `Defensa rival`.
- `Defensa Uruguay` mantiene la regla existente: requiere jugador uruguayo seleccionado y en cancha, no usa mapa y no cambia score.
- `Defensa rival` registra un nuevo evento `opponent_defense` con `defenseLocation`, no requiere jugador, no cambia score y es undoable.
- `CourtMapInput` suma modo `opponent_defense` con textos especificos: `¿Dónde nos defendieron?`.
- Los resumenes por tiempo y final agregan mapa `Dónde nos defendieron`, total de `Defensas del rival` y zonas agrupadas.
- `CourtMapSummary` ahora soporta puntos y defensas rivales con puntos de densidad sin dependencia nueva.
- Los insights agregan una alerta cuando el rival defiende repetidamente ataques en una misma zona.
- El dashboard y el reporte PDF/texto incluyen defensas del rival y zonas donde nos defendieron.
- `Punto en contra` y `Punto en contra rival` siguen fuera de mapas porque no tienen ubicacion tactica.

Validacion:

- `npm test`: pasa, 9 archivos de test y 87 tests.
- `npx tsc --noEmit`: pasa.

QA manual recomendado:

- Abrir partido en vivo e iniciar tiempo.
- Tocar `Defensa`.
- Elegir `Defensa Uruguay` sin jugador y confirmar feedback de seleccion requerida.
- Seleccionar jugador en cancha, registrar `Defensa Uruguay` y verificar ultimas acciones.
- Tocar `Defensa`, elegir `Defensa rival`, marcar ubicacion y confirmar feedback `Defensa rival registrada`.
- Confirmar que el score no cambia.
- Usar `Deshacer` y confirmar que la defensa rival desaparece.
- Finalizar tiempo y revisar mapa `Dónde nos defendieron`.
- Finalizar partido y revisar resumen final, dashboard y export de reporte.
- Probar portrait y landscape en Expo Go.

## 2026-05-31 - Scoreboard compact height fix

Se corrigio el exceso de altura del marcador observado en Expo Go.

- Causa: el refinamiento anterior aumento `minHeight` y mantenia estado, label de tiempo y timer en tres lineas, generando espacio vertical innecesario.
- El marcador ahora reduce `minHeight`, padding vertical, altura de botones y tamano del badge de tiempo.
- El footer del marcador se compacto en una sola linea: `En vivo · Tiempo restante 14:48`.
- Los scores siguen siendo grandes y protagonistas, con una reduccion leve para entrar en una tarjeta mas baja.
- No se cambio comportamiento de timer, finalizar tiempo, score, puntos, defensa/error, cambios, resumenes ni export PDF.

QA manual recomendado:

- Abrir partido en vivo en telefono en portrait.
- Verificar que el marcador es mas bajo que la version anterior.
- Verificar que los numeros de score siguen grandes y legibles.
- Verificar que no hay grandes espacios verticales sin uso.
- Verificar que el timer sigue legible.
- Verificar que el badge de tiempo sigue legible.
- Verificar que pausar/reanudar y finalizar tiempo siguen siendo faciles de tocar.
- Verificar que no hay solapamientos.
- Rotar a landscape y revisar el layout.
- Confirmar que el timer no cambio su comportamiento.
- Confirmar que finalizar tiempo no cambio su comportamiento.

## 2026-05-31 - Scoreboard score hierarchy refinement

Se ajusto la jerarquia visual del marcador tras prueba manual en Expo Go.

- Los numeros de score de Uruguay y Rival ahora son mas grandes y vuelven a ser el elemento dominante del marcador.
- Se aprovecha mejor el espacio vertical disponible dentro de la tarjeta sin volver a posicionamiento absoluto.
- Se redujeron gaps internos del bloque de timer para evitar aire innecesario debajo del score.
- Los controles `Pausar` / `Reanudar` y `Fin tiempo` mantienen su fila dedicada y no se superponen con labels o scores.
- No se cambio comportamiento de timer, finalizar tiempo, score, puntos, defensa/error, cambios, resumenes ni export PDF.

QA manual recomendado:

- Abrir partido en vivo en telefono en portrait.
- Verificar que los numeros de score son mas grandes y prominentes.
- Verificar que no hay solapamiento con controles, labels, badge de tiempo ni rival.
- Verificar que el timer sigue legible.
- Verificar que el badge de tiempo sigue legible.
- Rotar a landscape y verificar que el marcador mantiene balance.
- Tocar pausar/reanudar.
- Tocar finalizar tiempo.

## 2026-05-31 - Live match vertical density refinement

Se compacto la pantalla de partido en vivo para mejorar el espacio disponible en telefonos.

- El header del marcador mantiene la estructura sin solapamientos, pero usa menor alto, padding y score mas compacto.
- Los botones del header conservan superficie visual compacta y suman `hitSlop` para mantenerlos faciles de tocar.
- Las acciones principales (`Punto Uruguay`, `Punto rival`, `En contra rival`, `Defensa`, `Error`) reducen alto y padding para liberar espacio vertical.
- El boton `Deshacer` y los gaps entre columnas/paneles se compactaron para que la cancha y las acciones importantes entren antes en el viewport.
- No se cambio comportamiento de timer, score, puntos, defensa/error, cambios, undo, resumenes ni export PDF.

QA manual recomendado:

- Abrir partido en vivo en telefono en portrait.
- Verificar que el marcador sigue legible y sin solapamientos.
- Verificar que los botones principales siguen siendo faciles de tocar.
- Verificar que cancha y acciones principales aparecen mas arriba en el viewport.
- Seleccionar jugador en cancha.
- Registrar punto Uruguay, punto rival, punto en contra rival, defensa y error.
- Usar `Deshacer`.
- Rotar a landscape y verificar que el layout sigue legible.

## 2026-05-31 - Scoreboard header overlap fix

Se corrigio el layout del header del marcador tras prueba manual en Expo Go.

- Causa: los controles de pausa/reanudar y finalizar tiempo estaban posicionados en absoluto sobre el mismo contenedor de labels y scores, por lo que en telefonos reales podian pisar `URU` y `RIVAL`.
- El header ahora usa filas dedicadas: controles + tiempo arriba, score y rival al medio, estado/timer abajo.
- Los controles ahora son botones pill compactos con texto (`Pausar`, `Reanudar`, `Fin tiempo`) y alto contraste, integrados al layout sin superponerse.
- El marcador usa labels compactos `URU` y `RIVAL` para evitar cortes o wrapping feo.
- No se cambio comportamiento de timer, finalizar tiempo, score, puntos, defensa/error, cambios, resumenes ni export PDF.

QA manual recomendado:

- Abrir partido en vivo en telefono en portrait.
- Verificar que `Pausar` / `Reanudar` no se superpone con `URU`.
- Verificar que `Fin tiempo` no se superpone con `RIVAL`.
- Verificar que los labels de equipos son legibles.
- Verificar que los scores son legibles.
- Verificar que el badge de tiempo es legible.
- Verificar que el timer es legible.
- Tocar pausar.
- Tocar reanudar.
- Tocar finalizar tiempo.
- Rotar a landscape.
- Verificar que no hay solapamientos.
- Verificar que los controles siguen siendo faciles de tocar.
- Verificar que barras nativas de Android no interfieren con el header.

## 2026-05-31 - Scoreboard header visual refinement

Se refino visualmente el header del marcador en partido en vivo.

- Los controles `Pausar` / `Reanudar` y `Finalizar tiempo` ahora usan botones de mayor contraste sobre el fondo oscuro.
- Los iconos quedan anclados mas cerca de las esquinas superiores del marcador para mejorar balance visual.
- El boton de finalizar tiempo queda visualmente diferenciado con superficie roja y texto blanco.
- En phone, el label de Uruguay se muestra como `URU` para evitar cortes feos del texto; `Rival` conserva lectura limpia.
- No se cambio comportamiento de timer, score, puntos, defensa/error, cambios, resumenes ni export PDF.

QA manual recomendado:

- Abrir partido en vivo.
- Verificar que el icono de pausar/reanudar se lee bien sobre el marcador oscuro.
- Verificar que el icono de finalizar tiempo se lee bien y queda claramente diferenciado.
- Verificar que los botones se ven balanceados en el header.
- Verificar que `URU` / `Uruguay` y `Rival` son legibles y no se cortan mal.
- Verificar que periodo, rival y timer siguen claros en el centro.
- Probar portrait y landscape.
- Confirmar que los iconos siguen siendo faciles de tocar.
- Confirmar que barras nativas de Android no pisan el header.
- Confirmar que pausar/reanudar sigue funcionando.
- Confirmar que finalizar tiempo sigue funcionando.

## 2026-05-31 - Field testing bugfix batch

Se corrigieron tres puntos detectados en pruebas de campo.

- `Cambiar jugadores` ahora permite seleccionar dos jugadores en cancha e intercambiar sus slots.
- El intercambio en cancha registra un evento `lineup_swap`, crea un nuevo `LineupSnapshot`, aparece en ultimas acciones y se puede deshacer.
- El flujo cancha + banco sigue registrando sustituciones normales.
- `Punto Uruguay` ahora requiere un jugador uruguayo seleccionado y actualmente en cancha antes de abrir el mapa.
- `Punto rival` y `Punto en contra rival` no requieren jugador uruguayo y mantienen su comportamiento.
- Los controles `Pausar` / `Reanudar` y `Finalizar tiempo` se movieron al header del marcador como botones compactos con iconos.
- La seccion inferior de controles queda enfocada en `Cancelar partido` para evitar duplicar acciones.
- No se cambio el timer, undo, defensa/error, mapa de cancha, PDF export ni reglas de `landingLocation`.

Validacion:

- `npm test`: pasa, 9 archivos de test y 80 tests.
- `npx tsc --noEmit`: pasa.

## 2026-05-31 - Match report PDF export

Se implemento exportacion de reporte post-partido desde `Resumen final`.

- Se agrego `Exportar reporte PDF`, que genera un PDF local desde HTML con `expo-print`.
- Se agrego `Compartir resumen`, que usa un resumen textual compartible con `Share` de React Native.
- Si la generacion PDF o el share de archivo falla, la pantalla intenta compartir el resumen textual como fallback.
- Se instalo `expo-print` `~15.0.8` y `expo-sharing` `~14.0.8` con `npx expo install`.
- La logica pura del reporte vive en `src/domain/reportData.ts`.
- La construccion de HTML/texto vive en `src/export/reportHtml.ts`.
- La integracion nativa PDF/share vive en `src/export/exportMatchReport.ts`.
- El reporte incluye score final, resultado por tiempos, estadisticas por periodo, totales, puntos en contra, puntos en contra del rival, zonas agrupadas, cambios, formaciones, insights y notas.
- El mapa visual o imagen compartible queda diferido; el PDF incluye resumen textual por zonas y una nota de limitacion.
- Se agregaron `docs/specs/005-match-report-export.md`, `docs/plans/005-match-report-export-plan.md` y `docs/decisions/002-match-report-export-format.md`.

Validacion:

- `npm test`: pasa, 9 archivos de test y 76 tests.
- `npx tsc --noEmit`: pasa.

## 2026-05-31 - Punto en contra rival

Se implemento `Punto en contra rival` como accion rapida de scoring.

- El nuevo evento se guarda como `kind: point`, `scoringTeam: uruguay` y `pointSource: opponent_own_point`.
- Suma exactamente +1 a Uruguay.
- No requiere jugador, jugador rival ni `landingLocation`.
- No abre el mapa de cancha y no infiere ubicacion desde posiciones.
- No cuenta como goleador ni aparece en mapas o puntos por zona.
- Se muestra en vivo como `Punto en contra rival (+1 Uruguay)`.
- En la pantalla en vivo comparte el espacio de `Punto rival` como accion dividida, sin agregar un quinto boton al grid.
- Deshacer remueve el evento y recalcula el marcador desde eventos.
- Resumen por tiempo, resumen final y dashboard muestran el conteo separado de puntos en contra del rival.
- Los insights agregan una lectura liviana cuando el rival regala varios puntos.
- Se agregaron `docs/specs/004-opponent-own-point.md` y `docs/plans/004-opponent-own-point-plan.md`.

Validacion:

- `npm test`: pasa, 7 archivos de test y 72 tests.
- `npx tsc --noEmit`: pasa.

## 2026-05-31 - Live match controls layout adjustment

Se reorganizaron los controles de la pantalla de partido en vivo para liberar espacio en el primer viewport.

- `Deshacer` queda junto a las acciones rapidas porque se usa durante el registro en vivo.
- `Pausar` / `Reanudar`, `Finalizar tiempo` y `Cancelar partido` pasan a un panel inferior de controles del partido.
- No se cambio comportamiento de marcador, timer, undo, defensa/error, mapa de cancha ni cambios.

## 2026-05-31 - Visual lineup substitutions bench tap fix

Se corrigieron dos problemas detectados en pruebas manuales con Expo Go.

- La seleccion de jugadores del banco no respondia de forma confiable; se removio el `ScrollView` anidado de `BenchList` y se dejo que la pantalla principal maneje el scroll.
- Las tarjetas del banco siguen siendo `Pressable` simples y ahora los taps actualizan `selectedBenchPlayerId`.
- `Confirmar cambio` queda habilitado al seleccionar un jugador en cancha y un jugador del banco.
- La interpretacion visual 3 - 1 - 3 se corrigio a izquierda-centro-derecha: 3 jugadores a la izquierda, 1 al centro y 3 a la derecha.
- Se agrego un helper testeable para fijar el grupo visual de los 7 slots neutrales.
- Drag/drop sigue diferido; no se reintrodujo `PanResponder` ni dependencia nueva.

QA manual recomendado:

- Abrir partido en vivo e iniciar tiempo.
- Confirmar que la cancha muestra 7 jugadores en 3 izquierda - 1 centro - 3 derecha.
- Tocar `Cambiar jugadores`.
- Seleccionar un jugador en cancha y verificar highlight.
- Seleccionar un jugador en banco y verificar highlight.
- Confirmar que `Confirmar cambio` queda habilitado.
- Tocar `Confirmar cambio` y verificar que el entrante ocupa el slot seleccionado.
- Verificar que el saliente aparece en banco y ultimas acciones muestra el cambio.
- Usar `Deshacer` y verificar que vuelve la alineacion anterior.
- Probar portrait, landscape y barra de navegacion Android.

## 2026-05-31 - Visual lineup substitutions stability fix

Se ajusto el flujo de cambios despues de pruebas manuales en Expo Go con telefono real.

- Drag/drop queda desactivado/diferido porque no fue confiable en campo: interferia con taps y no permitia completar cambios de forma consistente.
- `Banco` vuelve a usar tarjetas con `Pressable` simple para priorizar taps confiables y scroll estable.
- Se implemento modo cambio explicito: `Cambiar jugadores`, seleccionar jugador en cancha, seleccionar jugador del banco y `Confirmar cambio`.
- `Confirmar cambio` queda bloqueado hasta que existan ambas selecciones.
- La cancha mantiene 7 slots neutrales y ahora se distribuye visualmente como 3 - 1 - 3.
- El cambio sigue reutilizando `substitutePlayer`, registrando evento de sustitucion y creando nuevo `LineupSnapshot`.
- Si el jugador seleccionado para acciones rapidas sale de cancha, la seleccion se limpia para evitar Defensa/Error sobre suplentes.
- No se cambio el modelo de datos, marcador, mapa de cancha, defensa/error, timer, undo ni persistencia.

QA manual recomendado:

- Abrir partido en vivo e iniciar tiempo.
- Confirmar que la cancha muestra 7 jugadores en 3 - 1 - 3 sin solaparse.
- Tocar `Cambiar jugadores`.
- Seleccionar un jugador en cancha.
- Seleccionar un jugador del banco.
- Confirmar que `Confirmar cambio` queda habilitado.
- Tocar `Confirmar cambio`.
- Verificar que el jugador entrante aparece en el mismo slot y el saliente aparece en banco.
- Verificar que ultimas acciones muestra el cambio.
- Tocar `Deshacer` y verificar que vuelve la alineacion anterior.
- Entrar a modo cambio y cancelar; verificar que no cambia la alineacion.
- Intentar confirmar sin ambas selecciones y verificar feedback.
- Sustituir al jugador seleccionado para acciones rapidas y verificar que Defensa/Error no quedan apuntando al jugador que salio.
- Probar portrait, landscape y barra de navegacion Android.

## 2026-05-31 - Visual lineup substitutions UX refinement

Se refino la experiencia de cambios en la pantalla de partido en vivo.

- Se compacto `LineupCourt` para reducir solapamiento de tarjetas y mantener 7 slots neutrales legibles.
- `Cambio` se removio del grid superior de acciones rapidas; Cancha/Banco pasa a ser el espacio principal de sustituciones.
- Se elimino el flujo popup/modal de cambios.
- Se agrego drag/drop desde `Banco` hacia slots de `Cancha` usando `PanResponder` y `Animated` de React Native, sin dependencias nuevas.
- Se mantiene fallback tap-to-swap: tocar suplente y luego tocar slot en cancha.
- Al completar un cambio, se reutiliza `substitutePlayer`, se registra evento de sustitucion, se crea nuevo `LineupSnapshot` y se muestra feedback.
- Si el jugador seleccionado para acciones rapidas sale de cancha, la seleccion pasa al jugador entrante para evitar estado obsoleto.
- La posicion habitual del jugador sigue siendo metadata solamente y no restringe cambios.

QA manual recomendado:

- Abrir partido en vivo.
- Verificar que las tarjetas de cancha no se solapen y que los 7 jugadores sean legibles.
- Verificar que el banco sea legible.
- Arrastrar un suplente a un slot en cancha.
- Verificar que el suplente entra, el jugador saliente va al banco y aparece feedback.
- Verificar que ultimas acciones muestra el cambio.
- Usar Deshacer y verificar que vuelve la alineacion anterior.
- Tocar suplente y luego tocar slot en cancha para validar el fallback.
- Verificar que Defensa/Error no usan un jugador que ya salio de cancha.
- Probar portrait y landscape.
- Verificar que la barra de navegacion de Android no bloquee la zona inferior.

## 2026-05-28 - Visual lineup substitutions Stage 1

Se implemento Stage 1 de cambios visuales.

- La pantalla de partido en vivo ahora muestra una cancha visual con 7 slots neutrales.
- Los slots se derivan del orden actual de `LineupSnapshot.playerIds`; no se agregaron nombres tacticos ni restricciones por posicion.
- Se agrego lista separada de `Banco` / `Suplentes` con iniciales, nombre y numero.
- El boton `Cambio` abre un flujo enfocado tap-to-swap: seleccionar jugador del banco y tocar una posicion en cancha.
- El cambio registra el evento de sustitucion y crea un nuevo snapshot de alineacion.
- Deshacer sigue removiendo el evento de sustitucion y el snapshot creado.
- La posicion habitual del jugador queda como metadata solamente y no limita donde puede entrar.
- Drag/drop queda intencionalmente diferido a Stage 2.
- No se agregaron fotos, upload de imagenes, backend ni dependencias nuevas.
- Se preservan registro de puntos, mapa de cancha, defensa/error, timer, cancelacion, resumenes por tiempo y resumen final.

Validacion:

- `npm test`: pasa.
- `npx tsc --noEmit`: pasa.

## Current MVP Summary

Fecha inicial del log: 2026-05-27

La app actual es un MVP React Native / Expo para registrar estadisticas de partidos de tchoukball en vivo para el cuerpo tecnico de Uruguay.

Funcionalidad existente observada:

- Flujo de partido en vivo con creacion de partido demo.
- Soporte para 3 tiempos de 15 minutos.
- Timer simple por tiempo con pausa, reanudacion y finalizacion manual.
- Registro de puntos.
- Registro de errores.
- Registro de cambios.
- Deshacer ultima accion.
- Cancelar partido.
- Resumen del tiempo.
- Resumen final del partido.
- Registro explicito de ubicacion de caida de la pelota para puntos mediante mapa de cancha.
- Mapas/resumenes visuales para puntos de Uruguay y puntos recibidos.
- Calculos de estadisticas e insights mediante funciones puras en `src/domain`.
- Persistencia local offline-first usando Zustand persistido con AsyncStorage.
- Tests con Vitest para funciones de dominio y flujo de store.

Tests disponibles observados:

- `src/domain/periodStats.test.ts`
- `src/domain/court.test.ts`
- `src/store/useMatchStore.test.ts`

Comandos de validacion actuales:

```bash
npx tsc --noEmit
npm test
```

Notas:

- No hay backend.
- No hay autenticacion.
- No hay cloud sync.
- No hay lint configurado actualmente.
- Exportacion del resumen final figura como pendiente / futura iteracion.

## 2026-05-28 - Codex development operating system

Se creo una capa liviana de documentacion para que el trabajo futuro con Codex siga Spec Driven Development y proteja el MVP estable.

- `AGENTS.md` ahora funciona como entrada concisa para Codex.
- Se agregaron guias de roles en `docs/agents` para producto/dominio, arquitectura, UX mobile, estado/persistencia, QA/testing y release/git.
- Se agregaron workflows en `docs/workflows` para SDD, implementacion de features, bugfixes y feedback de campo.
- Se agregaron checklists en `docs/checklists` para pre-implementacion, pre-release y field testing.
- No se cambio comportamiento de la app ni codigo de produccion.

## 2026-05-28 - Field testing feedback specs

Se convirtio feedback de una practica real en specs y planes Draft para las proximas mejoras sin implementar cambios de app.

- `docs/specs/002-defense-and-error-tracking.md` cubre defensas, errores `Falta` / `Punto en contra`, estadisticas por jugador, undo, resumenes y compatibilidad con eventos viejos.
- `docs/plans/002-defense-and-error-tracking-plan.md` divide la implementacion en tipos de eventos, stats, store, UI, resumenes, tests y log.
- `docs/specs/003-visual-lineup-substitutions.md` cubre alineacion visual, banco, tap-to-swap, compatibilidad de cambios y preferred position como metadata.
- `docs/plans/003-visual-lineup-substitutions-plan.md` propone Stage 1 con tap-to-swap y deja drag/drop, animaciones y fotos para Stage 2.
- Se aclararon reglas de producto: `Punto en contra` suma un punto al rival sin ubicacion de caida, defensas/errores solo se registran para jugadores en cancha y los 7 slots visuales quedan neutrales por ahora.

## 2026-05-28 - Defense and typed error tracking

Se implemento la spec `docs/specs/002-defense-and-error-tracking.md`.

- `Defensa` registra que jugador de Uruguay en cancha hizo la accion defensiva, sin ubicacion de cancha.
- `Falta` queda como estadistica de error por jugador y no afecta el tanteador.
- `Punto en contra` queda como estadistica de error por jugador y suma automaticamente 1 punto al rival.
- `Punto en contra` no requiere `landingLocation` porque surge de una accion propia, no de la ubicacion de caida de un ataque rival.
- Las defensas, faltas y puntos en contra se muestran en vivo, dashboard, resumen del tiempo y resumen final.
- Los eventos legacy de error se ignoran para score, se evitan en insights nuevos y se muestran con fallback seguro cuando corresponde.
- Se agregaron tests de dominio, store e insights para score, undo, agrupaciones por jugador, jugadores en cancha y compatibilidad legacy.

## 2026-05-28 - Error modal and defense feedback UX

Se refino la UX de la feature de defensas y errores tipados sin cambiar reglas de dominio ni score.

- `Defensa` ahora es una accion de un toque usando el jugador seleccionado en cancha.
- Si no hay jugador valido seleccionado, se muestra feedback: `Seleccioná primero un jugador en cancha.` o `Seleccioná un jugador en cancha.`
- El flujo `Error` ahora abre un modal enfocado solo para elegir tipo de error del jugador seleccionado.
- El modal muestra `Error de {jugador}`, botones grandes `Falta` y `Punto en contra`, ayudas `No cambia el marcador` y `Suma +1 al rival`, y `Cancelar`.
- Cancelar el modal no registra eventos; tocar un tipo de error guarda y cierra el modal.
- `Defensa` muestra un feedback temporal: `+1 defensa · {jugador}`.
- Los errores registrados muestran feedback temporal para `Falta` y `Punto en contra`.
- No se modifico el flujo de puntos, mapa de cancha, `landingLocation`, sustituciones ni reglas de score.

QA manual sugerida:

- Iniciar partido y tiempo.
- Tocar `Defensa` sin jugador seleccionado y confirmar `Seleccioná primero un jugador en cancha.` si aplica.
- Seleccionar Mauro.
- Tocar `Defensa` y confirmar que se registra inmediatamente.
- Confirmar feedback `+1 defensa · Mauro` o similar.
- Confirmar que no aparece panel inline de defensa.
- Tocar `Error` y confirmar que el modal dice `Error de Mauro`.
- Confirmar que no aparece grilla de jugadores en el modal.
- Cancelar y verificar que no se registra evento.
- Tocar `Error`, tocar `Falta` y verificar que el score no cambia.
- Seleccionar otro jugador.
- Tocar `Error`, tocar `Punto en contra` y verificar que el rival suma +1.
- Usar `Deshacer` y verificar que el punto rival vuelve atras.
- Confirmar que `Ultimas acciones` se actualiza.
- Probar portrait y landscape.
- Verificar que los botones no quedan tapados por barras nativas.

## 2026-05-27 - Court map accuracy, landscape and animations

Se implemento la spec `docs/specs/001-court-map-landscape-accuracy-animations.md`.

Cambios principales:

- La app ahora permite rotacion con `"orientation": "default"` en `app.json`.
- `CourtMapInput` paso a un modal enfocado de pantalla completa para marcar puntos con mas espacio.
- La captura de taps usa `pageX/pageY` y resta el rectangulo real medido de la cancha con `measureInWindow`.
- Se agregaron helpers puros para clamp, validacion de layout, normalizacion y denormalizacion de coordenadas.
- El marcador usa la misma medida real de cancha para renderizarse desde `landingLocation`.
- Se ignoran taps hasta tener dimensiones validas.
- Se agregaron animaciones livianas con `Animated` de React Native.
- Se agrego un overlay debug opcional solo para desarrollo, apagado por defecto.
- No se agregaron dependencias nuevas.

Checklist manual sugerido:

- Probar Expo Go en telefono vertical.
- Probar Expo Go en telefono horizontal.
- Tocar centro, esquinas y bordes del mapa.
- Rotar despues de seleccionar una ubicacion.
- Confirmar punto Uruguay y punto rival.
- Deshacer punto.
- Finalizar tiempo y revisar mapas de resumen.
- Finalizar partido y revisar resumen final.

## 2026-05-27 - Court map marker animation fix

Se corrigio un error observado en telefono real:

- React Native no soporta animar `top`/`left` con el native animated module.
- `CourtMapInput` ya no pasa `Animated.Value` a `top` ni `left`.
- La posicion del marcador se calcula como layout normal desde `landingLocation` normalizada y las medidas reales de la cancha.
- Las animaciones del marcador quedan limitadas a `opacity` y `transform: scale`, compatibles con `useNativeDriver: true`.
- Se mantiene la precision de tap, el modal enfocado, landscape y la logica normalizada de coordenadas.

## 2026-05-27 - Court map visual references

Se mejoro el dibujo de la cancha sin agregar assets ni cambiar el modelo de datos.

- Se agrego `CourtField` como base visual reutilizable para carga y resumenes.
- La cancha ahora muestra linea central mas clara, marca de centro, carriles izquierda/centro/derecha y guias horizontales sutiles.
- Se agregaron semicirculos laterales para representar el area prohibida cerca de cada marco.
- Los mapas de resumen usan la misma cancha visual que el mapa interactivo.
- Las capas visuales no capturan eventos tactiles y quedan dentro del mismo rectangulo medido, preservando la precision del tap.
- `landingLocation` sigue usando coordenadas normalizadas y los eventos viejos sin ubicacion siguen soportados.

## 2026-05-27 - Android QA stability fixes

Se corrigieron tres problemas detectados en telefono Android real.

- Se agrego `SafeAreaProvider` y los wrappers de pantalla usan insets para separar contenido y botones de las barras nativas.
- `CourtMapInput` suma padding superior/inferior de safe area y recalcula el alto util del mapa en portrait y landscape.
- El timer del tiempo ahora se calcula desde timestamps reales en vez de depender de descontar 1 segundo por tick.
- Pausar congela el tiempo activo, reanudar acumula la pausa y finalizar/cancelar partido detiene el timer.
- Las lecturas tacticas ya no muestran valores crudos como `center`, `left` o `right`.
- Los insights de zona usan ubicaciones derivadas desde `landingLocation`; eventos antiguos sin ubicacion no generan insights de zona.

Checklist QA manual:

- Abrir la app en Android con Expo Go.
- Probar telefono en portrait.
- Probar telefono en landscape.
- Verificar que botones importantes no quedan tapados por la barra de navegacion.
- Iniciar partido e iniciar tiempo.
- Esperar 10 segundos reales y confirmar que el timer baja aproximadamente 10 segundos.
- Pausar 10 segundos y confirmar que el timer no avanza.
- Reanudar y confirmar que continua correctamente.
- Registrar puntos de Uruguay en distintas zonas del mapa.
- Finalizar tiempo.
- Confirmar que los insights muestran zonas en espanol.
- Confirmar que no aparece `center`, `left` o `right` en texto visible.
- Confirmar que los mapas de resumen siguen funcionando.

## 2026-05-27 - Uruguay real player seed data

Se reemplazaron los jugadores ficticios de demo por la lista real provista del plantel de Uruguay.

- La semilla vive en `src/domain/mockData.ts`.
- Se agrego metadata `usualPlayingZone` con valores `izquierda`, `central` y `derecha`.
- La zona habitual del jugador se muestra como metadata de plantel y no se usa para calcular donde cayo un punto.
- `landingLocation` sigue viniendo exclusivamente del mapa de cancha.
- El boton `Reiniciar datos demo` vuelve a cargar esta lista real.
- Se agregaron tests para la lista de jugadores, zonas habituales, reset demo y preservacion de `landingLocation`.

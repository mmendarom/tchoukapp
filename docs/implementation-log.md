# Implementation Log

## 2026-06-21 - Stage 3 modo practica 3v3: live mini-match tracking

Se implemento tracking en vivo de un mini partido dentro de una sesion de `Práctica 3v3`, sin rotacion automatica, sin summary avanzado y sin export.

Implementado:

- `LiveTrainingMiniMatchScreen` muestra marcador, target score, estado, ganador, acciones, deshacer y ultimas acciones.
- `TrainingSessionsScreen` permite elegir dos equipos e iniciar un mini partido desde el detalle de sesion.
- Se bloquea iniciar un segundo mini partido si ya hay uno `live`.
- `CourtMapInput` agrega modos de texto para:
  - `training_point`;
  - `training_shot_defended`.
- `trainingLive.ts` agrega helpers para labels en espanol, score y jugadores por equipo.
- Tests nuevos/actualizados cubren labels, ubicaciones en eventos, bloqueo de segundo mini partido activo y score.

Acciones live:

- `Punto {Equipo}`: jugador + ubicacion, suma al equipo.
- `En contra {Equipo}`: jugador, suma al rival interno.
- `Defensa`: equipo + jugador, no cambia score.
- `Tiro defendido`: equipo + jugador + ubicacion, no cambia score.
- `Error`: equipo + jugador, no cambia score.
- `Deshacer`: revierte ultimo evento y recalcula score/ganador.

Target score:

- Al llegar al target se marca ganador/perdedor y se bloquean nuevos eventos.
- Antes de cerrar, `Deshacer` permite corregir y reabrir el score.
- `Finalizar mini partido` marca el mini partido como finalizado.

Diferido:

- Rotacion/cola winner-stays.
- Inicio automatico del siguiente mini partido.
- Standings/resumen avanzado.
- Backup/export/PDF de training sessions.
- Mapa one-frame dedicado.

QA manual recomendado:

- Crear una sesion de 3 equipos con 9 jugadores.
- Iniciar `Equipo 1` vs `Equipo 2`.
- Registrar punto con jugador y ubicacion.
- Registrar punto del otro equipo con ubicacion.
- Registrar defensa.
- Registrar tiro defendido con ubicacion.
- Registrar error.
- Registrar punto en contra.
- Llegar al target score.
- Confirmar ganador y bloqueo de nuevos eventos.
- Deshacer ultimo evento y confirmar que score/ganador se revierten.
- Finalizar mini partido.
- Volver a la sesion y confirmar historial.
- Confirmar que `Partidos` formal sigue funcionando.

## 2026-06-21 - Stage 2 modo practica 3v3: setup UI

Se implemento la UI inicial para crear sesiones de `Práctica 3v3`, sin tracking live, sin rotacion y sin export.

Implementado:

- Home agrega seccion `Entrenamiento` con accion `Práctica 3v3`.
- `TrainingSessionsScreen` permite:
  - elegir plantel;
  - seleccionar jugadores presentes;
  - elegir 2, 3 o 4 equipos segun participantes;
  - asignar jugadores manualmente a equipos;
  - ver jugadores seleccionados sin equipo;
  - definir `Puntos para ganar`;
  - guardar `Ganador queda`;
  - crear sesion con `useTrainingStore`;
  - listar sesiones guardadas;
  - ver un detalle basico con equipos y configuracion.
- Se agregaron helpers puros en `src/domain/trainingSetup.ts` para opciones de cantidad de equipos, armado de equipos desde asignaciones, parsing de target score y validacion.
- `App.tsx` y `src/utils/navigation.ts` registran la ruta `TrainingSessions`.

Validaciones visibles:

- `Seleccioná al menos 6 jugadores.`
- `Cada equipo necesita 3 o 4 jugadores.`
- `Los puntos para ganar deben ser al menos 1.`
- `No se pudo crear la práctica.`

Diferido:

- Tracking en vivo de mini partidos.
- Rotacion/cola.
- Auto-balance.
- Borrado/archivo de sesiones.
- Backup/export/PDF de training sessions.

QA manual recomendado:

- Abrir Home.
- Tocar `Práctica 3v3`.
- Seleccionar `Mayores`.
- Seleccionar 9 jugadores.
- Elegir 3 equipos y asignar 3 jugadores a cada uno.
- Dejar target score en 3.
- Confirmar que se crea la sesion y aparece el detalle.
- Probar invalidos: menos de 6 participantes, equipo con 2 jugadores y target score 0.
- Volver a `Partidos` y confirmar que el flujo formal sigue funcionando.
- Reiniciar app y confirmar que la sesion creada persiste.

## 2026-06-21 - Stage 1 modo practica 3v3: dominio/store/tests

Se implemento la primera etapa tecnica del modo entrenamiento 3v3/4v4 sin agregar UI y sin modificar el flujo formal de partidos.

Implementado:

- `src/domain/training.ts` define `TrainingSession`, `TrainingTeam`, `TrainingMiniMatch`, `TrainingEvent`, settings, validaciones y helpers de stats.
- `src/store/useTrainingStore.ts` agrega un store Zustand separado de `useMatchStore`.
- `src/storage/asyncStorage.ts` agrega `STORAGE_KEYS.trainingState` para persistir entrenamiento con key propia.
- Tests nuevos:
  - `src/domain/training.test.ts`;
  - `src/store/useTrainingStore.test.ts`.

Reglas actuales:

- Equipos validos de 3 o 4 jugadores.
- Un jugador solo puede estar en un equipo por sesion.
- `targetScore` default 3 y `winnerStays` default `true`.
- `point` suma al equipo del evento.
- `own_point_against` suma al equipo contrario.
- `shot_defended`, `defense` y `error` no cambian score.
- Al llegar al target se marca ganador/perdedor y se bloquean nuevos eventos hasta `undo` o `finishMiniMatch`.
- `undoLastTrainingEvent` recalcula score y limpia ganador si corresponde.
- Stats de sesion derivan de eventos: player stats, team stats, intentos y diferencial.

No incluido todavia:

- UI de Home/setup/live/resumen.
- Rotacion/cola visual.
- Backup/export de training sessions.
- PDF/texto compartible.
- Mapa one-frame dedicado.
- Auto-balance de equipos.

## 2026-06-21 - Planning: modo practica 3v3 / entrenamiento

Se planifico un nuevo modo de entrenamiento para mini partidos internos 3v3/4v4, sin implementar codigo productivo.

Decisiones propuestas:

- Crear un modelo separado de `Match` para no mezclar Uruguay vs rival, 7 titulares, periodos oficiales y reportes formales con equipos internos de practica.
- Introducir entidades futuras `TrainingSession`, `TrainingTeam`, `TrainingMiniMatch`, `TrainingEvent` y `TrainingSessionSettings`.
- Entrar desde Home con `Practica 3v3` o `Modo entrenamiento`.
- MVP recomendado:
  - elegir plantel;
  - seleccionar presentes;
  - crear equipos manuales de 3/4;
  - target score default 3;
  - seleccionar manualmente los equipos del proximo mini partido;
  - summary in-app antes que PDF.
- Reusar `Player`, `TeamPool`, `CourtLocation`, `CourtMapInput`/`CourtLocationMap` y patrones de stats solo cuando no arrastren supuestos del modo formal.
- Diferir auto-balance, rotacion automatica, mapa one-frame dedicado y PDF hasta validar el tracking vivo.

Docs creados:

- `docs/specs/011-training-3v3-scrimmage-mode.md`.
- `docs/plans/011-training-3v3-scrimmage-mode-plan.md`.

QA/validacion:

- Tarea docs-only.
- No se tocaron modelos, store, navegacion ni pantallas productivas para este modo.

## 2026-06-21 - Full court geometry unification pass

Se unifico la geometria visual de mapas en input, mapas live, resumenes in-app y PDF/preview, sin cambiar eventos, scoring, tracking, coordenadas normalizadas, sectores tacticos ni persistencia.

Root cause:

- El merge habia dejado decisiones visuales duplicadas: `CourtField`/`CourtMapInput`, `CourtLocationMap`, `CourtMapSummary`, `LiveMapPanel` y `reportHtml` calculaban tamanos o proporciones de cancha por separado.
- El PDF ya compartia porcentajes de areas, pero conservaba una proporcion independiente; los mapas live/resumen tambien tenian alturas hardcodeadas distintas.
- Esa deriva hacia que el mismo `landingLocation` o `defenseLocation` pudiera verse en zonas visuales distintas segun pantalla/export.

Implementado:

- `src/domain/courtVisual.ts` centraliza porcentajes de carriles, areas, semicirculos, guias, relacion visual del input, alturas de mapas live/resumen y tamano objetivo del PDF.
- `CourtField`, `CourtMapInput`, `CourtLocationMap`, `CourtMapSummary`, `LiveMapPanel` y `reportHtml` consumen esa fuente compartida.
- `CourtMapSummary` deja de recalcular altura propia y delega en `CourtLocationMap`.
- El PDF mantiene HTML/CSS print-safe, `report-court-map`, marcadores absolutos y `print-color-adjust: exact`.
- Las guias de grados siguen siendo exclusivas de `CourtMapInput`; mapas live/resumen/PDF permanecen limpios.
- Se agregaron tests de helpers responsive y tests de guardia para evitar hardcodes divergentes en renderers activos.

QA manual recomendado:

- Marcar ubicaciones en `CourtMapInput` cerca de 0°, 45° y 90° en ambos marcos.
- Revisar esas ubicaciones en mapas live, resumen de tiempo, resumen final y PDF.
- Comparar que puntos, semicírculos y espacio de 0° correspondan visualmente en todos los renderers.
- Confirmar `Mapas del tiempo` y `Mapas totales` con puntos visibles.
- Confirmar que solo el input tactil muestra la leyenda `Guía: 0° fondo · 45° intermedio · 90° centro del área`.
- Confirmar que mapas vacios muestran `Sin ubicaciones registradas.`

## 2026-06-21 - PDF report map geometry alignment

Se corrigio la geometria visual de mapas PDF para que coincida con la cancha usada al registrar ubicaciones, sin cambiar eventos, scoring, tracking, coordenadas normalizadas, sectores tacticos ni mapas interactivos.

Root cause:

- El renderer PDF print-safe usaba una cancha HTML/CSS independiente de `CourtField`.
- Los marcadores PDF aplicaban offsets artificiales (`4%/6%` de margen), por lo que un mismo `landingLocation` o `defenseLocation` podia verse desplazado respecto a `CourtMapInput`.

Implementado:

- Se agrego `src/domain/courtVisual.ts` como fuente compartida de geometria visual.
- `CourtField` consume esos valores para carriles, areas de marco, guias horizontales y areas prohibidas.
- `reportHtml` consume los mismos valores para dibujar la cancha PDF con HTML/CSS print-safe.
- Los marcadores del PDF ahora usan coordenadas normalizadas directas (`x * 100`, `y * 100`) y conservan `data-normalized-x/y`.
- La matematica de sectores tacticos, labels, eventos legacy y coordenadas persistidas no cambiaron.

QA manual recomendado:

- En `CourtMapInput`, marcar puntos cerca de ambos marcos y lados.
- Exportar PDF y confirmar que los puntos aparecen en las mismas areas visuales.
- Confirmar que las areas/semicirculos del PDF se parecen a la cancha de carga.
- Confirmar que los puntos no se ven desplazados, invertidos ni recortados.
- Confirmar que no aparecen etiquetas de grados dentro de los mapas PDF.
- Confirmar que las tablas de sectores tacticos siguen coincidiendo con los puntos visibles.

## 2026-06-21 - PDF report map rendering fix

Se corrigio el render de mapas en reportes PDF sin cambiar modelos de eventos, scoring, tracking, coordenadas normalizadas, sectores tacticos ni mapas de la app.

- `src/export/reportHtml.ts` reemplaza el mapa SVG inline por una cancha HTML/CSS print-safe.
- La cancha del reporte usa `report-court-map` con alto fijo, `min-height`, fondo, borde, linea central, areas laterales aproximadas y frames.
- Los puntos se renderizan como `report-map-point` con `position: absolute`, coordenadas porcentuales y atributos `data-normalized-x/y`.
- Los colores usan `print-color-adjust: exact` para mejorar visibilidad en Expo Print/PDF.
- Los mapas vacios muestran `Sin ubicaciones registradas.`
- `CourtMapInput`, `CourtMapSummary`, `CourtLocationMap`, `landingLocation`, `defenseLocation` y la matematica de sectores no cambian.

QA manual recomendado:

- Exportar un partido con puntos Uruguay, puntos rivales y defensas rivales con ubicacion.
- Abrir el PDF generado.
- Confirmar que `Mapas del tiempo` y `Mapas totales` muestran cancha visible.
- Confirmar que los puntos son visibles y no quedan recortados en bordes.
- Confirmar que mapas sin datos muestran `Sin ubicaciones registradas.`
- Confirmar que no aparecen guias de grados dentro del mapa.
- Confirmar que las tablas de sectores tacticos siguen coincidiendo con las ubicaciones.
## 2026-06-20 - Ajuste fino de altura del semicirculo

Se recupero espacio visual para marcas cercanas a 0° sin perder el ancho util incorporado en el mapa.

- El area conserva `width: 52%` y el desplazamiento lateral de 26%, por lo que mantiene su alcance horizontal ampliado.
- La altura baja de 88% a 80% y el margen superior/inferior sube de 6% a 10%.
- El arco sigue centrado, pero queda mejor separado de fondo/laterales y distingue con mas claridad la zona de 0°.
- Ticks, leyenda compacta, altura del mapa, botones y superficie de tap permanecen sin cambios.
- No cambiaron coordenadas normalizadas, eventos, sectores tacticos, scoring, persistencia ni exportacion.

QA manual pendiente:

- Comparar telefono portrait y tablet landscape, especialmente taps entre el arco y los bordes superior/inferior.
- Confirmar que 0° se distingue mejor, que 45°/90° siguen siendo intuitivos y que los arcos no se ven demasiado bajos.
- Verificar que live/resumenes heredan la forma mas limpia sin agregar guias o ruido.

Validacion:

- `npm test`: 17 archivos y 215 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.

## 2026-06-20 - Polish de guias angulares del mapa

Se redujo el ruido visual de `CourtMapInput` sin tocar la geometria ampliada, los taps ni la lectura tactica.

- Se eliminaron los diez labels `0°/45°/90°` repetidos dentro de la cancha y las lineas azules largas que competian con grilla, zonas y arcos.
- Cada marco conserva tres ticks cortos y neutros junto al arco para referenciar 45°/90°/45° sin ocupar el area principal.
- Una leyenda unica bajo la cancha explica `0° fondo · 45° intermedio · 90° centro del área` con tipografia pequena y ajuste a una linea.
- Las marcas siguen activas solo mediante `showDegreeGuides` en `CourtMapInput`; mapas live y resumenes permanecen limpios.
- Los semicirculos ampliados no cambiaron. Tampoco cambiaron `CourtLocation`, normalizacion, math de sectores, eventos, score ni exportacion; no se requiere migracion.

QA manual pendiente:

- Revisar input en telefono portrait y tablet landscape, verificando ausencia de solapamientos con zonas, `Área prohibida` y botones.
- Tocar cerca de 0°/45°/90° y confirmar que las lecturas conservan sus tres bandas.
- Confirmar live y resumenes sin labels angulares.

Validacion:

- `npm test`: 17 archivos y 215 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.

## 2026-06-20 - Precision visual del mapa de cancha

Se mejoro la representacion compartida de la cancha sin cambiar eventos, score, tracking ni coordenadas persistidas.

- Las areas de marco pasan de una media elipse visible de aproximadamente 16% a una aproximacion semicircular mas amplia de aproximadamente 26% por extremo.
- La franja visual inmediata del marco aumenta de 12% a 18%, mejorando la lectura y el objetivo tactil sin alterar el area real de tap.
- `CourtField` incorpora `showDegreeGuides`; `CourtMapInput` lo activa y muestra `0°`, `45°`, `90°`, `45°`, `0°` desde borde superior a inferior en ambos marcos.
- Live, resumen de tiempo y resumen final reutilizan automaticamente las areas ampliadas mediante `CourtLocationMap`, pero omiten labels angulares para mantener limpios los mapas compactos.
- La geometria visual coincide con la derivacion existente: `y=0/1` representa 0°, `y=0.25/0.75` representa 45° y `y=0.5` representa 90°.
- `normalizeTapLocation`, `denormalizeLocation`, `CourtLocation` y los eventos guardados no cambiaron. Los puntos antiguos conservan exactamente su posicion relativa.
- Se reforzaron tests de ambos lados, bandas angulares, coordenadas legacy fuera de rango y ausencia de labels mayores a 90°.

QA manual pendiente:

- Abrir input de punto/defensa rival en telefono portrait y tablet landscape; revisar semicírculos, guias y botones inferiores.
- Tocar ambos marcos cerca de 0°/45°/90° y verificar `0°-30°`, `30°-60°` y `60°-90°` en lecturas tacticas.
- Confirmar mapas live, de tiempo y finales legibles, y revisar sectores en PDF.

Limitacion conocida:

- Los semicirculos son una aproximacion con Views/elipses recortadas, no geometria vectorial reglamentaria; se prioriza consistencia, rendimiento y ausencia de dependencias.

Validacion:

- `npm test`: 17 archivos y 215 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.
## 2026-06-20 - Plantel default Femenino

Se agrego un tercer plantel fijo sin cambiar score, tracking, eventos, mapas, snapshots historicos ni backup/import.

- Se incorporaron 16 jugadoras con ids estables `femenino-*`: Kari, Fio, Mori, Vicky, Larre, Aly, Flaca, Ile, Cami, Karen, Juli, Pau, Romi, Ede, Maca y Mariana.
- Usan dorsales temporales 1-16, posicion `Wing`, mano `Right`, zonas habituales rotadas y estadisticas iniciales en cero.
- El pool fijo `femenino` referencia exclusivamente `femeninoPlayerIds`; `Mayores` y `+40` no reciben esos ids.
- La persistencia sube de v8 a v9 para que instalaciones existentes ejecuten el merge aditivo de jugadores por id y reciban el pool faltante.
- La normalizacion fija los rosters de los tres defaults, conserva planteles custom y evita pools duplicados.
- `resetDemoData` conserva jugadores/planteles locales y vuelve a asegurar jugadores y pools default faltantes.
- Crear un partido con `Femenino` guarda `teamPoolId: femenino`, `teamPoolName: Femenino` y el roster completo en `availablePlayerIds`.

QA manual recomendado:

- Revisar las 16 jugadoras en `Gestionar planteles` y confirmar que no aparecen en `Mayores` ni `+40` salvo una edicion manual futura.
- Crear partido con `Femenino`, seleccionar siete titulares y comprobar banco, live y reporte.
- Verificar una instalacion existente tras hidratar v9 y confirmar que conserva jugadores y planteles custom.

Validacion:

- `npm test`: 17 archivos y 213 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.

## 2026-06-20 - Identidad visible del equipo propio

Se separo la identidad competitiva visible de los identificadores internos, sin cambiar eventos, score, tracking, persistencia ni backup/import.

- `getOwnTeamDisplayName` toma el snapshot `teamPoolName` del partido, lo normaliza y usa `Equipo` como fallback seguro para partidos historicos.
- `getMatchupDisplayName` centraliza `{Plantel} vs {Rival}`; `MatchReportData` expone `ownTeamName` para que el HTML no reconstruya la identidad.
- PDF y texto compartible usan el plantel en matchup, score final y parcial, tarjetas de puntos/defensas y estados vacios.
- Live, dashboard, resumen de tiempo, resumen final y listado de partidos muestran el plantel real. Las acciones compactas usan textos genericos como `Punto nuestro` para evitar desbordes.
- Fixtures sin snapshot de plantel usan `Equipo`; Players usa lenguaje generico de planteles.
- Los enums, sides, helpers y eventos internos `uruguay` permanecen sin cambios para conservar compatibilidad. El branding institucional de Home y el nombre de aplicacion en backups siguen siendo Uruguay deliberadamente.

QA manual recomendado:

- Crear partidos con `Mayores` y `+40`; revisar score live, resumenes, listado, PDF y texto compartible.
- Confirmar matchup, scores, `Puntos {Plantel}`, `Defensas {Plantel}` y vacios con el nombre correcto.
- Revisar en telefono que el nombre ajusta dentro del header y que `Punto nuestro` mantiene el layout.
- Abrir un partido historico sin `teamPoolName` y confirmar fallback `Equipo`.

Validacion:

- `npm test`: 17 archivos y 210 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.

## 2026-06-20 - Field fixes: cambios fuera de tiempo, categoria PDF y rankings

Se implementaron tres ajustes de campo sin cambiar score, puntos, defensas, errores, mapas, sectores tacticos, modelo persistido ni backup/import.

- `substitutePlayer` y `swapLineupPlayers` usan un guard propio de alineacion y ya no dependen de un periodo live.
- Se permiten cambios en borrador, antes de iniciar un periodo, en entretiempo y durante juego; `finished`/`cancelled` siguen bloqueados.
- Fuera de juego activo el snapshot/evento usa reloj `0`. En entretiempo posterior a un periodo terminado se asocia al proximo periodo; en live conserva periodo y reloj actuales.
- Se preservan validaciones de roster disponible, slots, duplicados, banco y undo basado en evento + snapshot.
- `LiveMatchScreen` muestra `Cambiar jugadores` siempre que exista alineacion y el partido sea modificable, con ayuda pre-tiempo.
- `matchLabel` ahora usa `Uruguay {Plantel} vs {Rival}` y conserva `Uruguay vs {Rival}` como fallback; el resultado ejecutivo usa el mismo nombre de equipo.
- Rendimiento ofensivo y efectividad ordenan por goles, intentos, efectividad, menos errados y fallback estable; `8/11` queda por encima de `1/1`.
- Defensa ordena por defensas/share; errores, puntos en contra y sectores ordenan por conteo descendente.

QA manual recomendado:

- Cambiar un jugador en borrador y antes del primer tiempo; iniciar y confirmar alineacion.
- Finalizar un tiempo, cambiar durante entretiempo, iniciar el siguiente y confirmar alineacion.
- Finalizar partido y confirmar que no admite cambios.
- Exportar PDF y confirmar `Uruguay {Plantel} vs {Rival}` y listas ataque/defensa best-to-worst.

Validacion:

- `npm test`: 16 archivos y 207 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo avisos esperados de normalizacion CRLF.

## 2026-06-20 - Report Export v3.1 visual digest

Se pulio exclusivamente la presentacion HTML/texto del reporte; no cambiaron eventos, score, tracking, mapas, persistencia, backup/import ni pantallas de la app.

- Las barras anteriores usaban capas absolutas y anchos contra el total del equipo, por lo que filas individuales podian quedar visualmente muy cortas o perder contraste al imprimir.
- Ataque ahora usa una pista clara al 100% para los intentos del jugador y una barra fuerte `goles/intentos`, con altura, fondo, ancho y color inline.
- Defensa usa una pista contrastada y barra de contribucion `defensas/defensas del equipo` con ancho inline.
- Se agrego `print-color-adjust: exact`, bordes y alturas de 12 px para mejorar compatibilidad con Expo Print.
- Las filas muestran fallback textual: `goles/intentos`, efectividad, atajados y errados; la formula conserva `goals + rivalDefendedShots + ownPointsAgainst`.
- Rendimiento limita cada tarjeta a 7 jugadores y avisa `+N jugadores mas`; efectividad aplica el mismo limite visual.
- Lecturas tacticas usan cards con titulo y detalle factual. Se eliminan del PDF las frases genericas repetidas de `suggestedAction`.
- Se priorizan 3 claves ejecutivas, 5 por tiempo y 6 finales. `Baja participacion` se omite cuando hay lecturas de mayor valor.
- Sectores tacticos muestran top 5 con barras de conteo y labels `marco · lado · 0°-90°`.
- Resumen ejecutivo, tarjetas, filas, sectores y mapas agregan reglas de corte de pagina.
- El texto compartible queda reducido a score, top ataque, top defensa, efectividad total, zona vulnerable, zona bloqueada y notas.

Validacion automatizada:

- `npm test`: 16 archivos y 200 tests aprobados.
- `npx tsc --noEmit`: aprobado.
- `git diff --check`: aprobado; solo se informan avisos esperados de normalizacion CRLF.

QA manual pendiente:

- Generar partido con varios goleadores, atajadas rivales, punto en contra con jugador, defensas Uruguay, sectores repetidos y errores repetidos.
- Confirmar barras claras/oscuras visibles, errados correctos, lecturas compactas y sectores sin labels genericos ni angulos mayores a 90°.
- Revisar cortes de pagina y fondos en PDF real de Android/iOS.
- Confirmar que el texto compartible permanece corto.

## 2026-06-20 - Field testing: intentos errados y header live responsive

Se cerraron dos correcciones detectadas en cancha sin cambiar eventos, score, mapas, backup/import ni persistencia.

- `punto_en_contra` de Uruguay con `playerId` ahora suma `ownPointsAgainst` y cuenta como intento ofensivo errado.
- La formula pasa a `shotAttempts = goals + rivalDefensesAgainst + ownPointsAgainst`; la efectividad sigue siendo `goals / shotAttempts`.
- Puntos en contra sin jugador, puntos rivales y puntos en contra del rival no se atribuyen como intentos individuales.
- Las barras live, resumenes por tiempo/final y report data usan los intentos corregidos; las filas muestran atajados y errados.
- PDF y texto compartible incluyen una columna/lectura de errados, sin duplicar ni cambiar el conteo de puntos en contra.
- El header live usa tres columnas flexibles, scores en una linea con autoajuste y variante compacta bajo 430 px.
- `Plantel: X` se movio al bloque central junto al rival, con ancho acotado, centrado y elipsis para nombres largos.

Validacion automatizada:

- `npm test -- --run`: 16 archivos, 199 tests aprobados.
- `npx tsc --noEmit`: aprobado.

QA manual pendiente en dispositivo/browser:

- Telefono portrait: `0-0`, `9-9`, `21-15` y `100-99` sin clipping.
- Telefono portrait: nombre de plantel largo centrado y truncado sin solapar scores.
- Tablet landscape: `21-15`, plantel y rival centrados.
- Timer en `Tiempo cumplido`, boton pausa/reanudar y boton fin de tiempo visibles.
- Comparar barras live, resumen de tiempo, resumen final y PDF con un jugador de `8 goles + 2 atajados + 1 errado = 8/11 (73%)`.

Limitacion: el navegador integrado no estuvo disponible para ejecutar la inspeccion visual automatizada; la matriz anterior queda como QA manual obligatorio.

## 2026-06-19 - Report Export v3

Se actualizo el PDF y el texto compartible para acercarlos a `PeriodSummaryScreen` y `FinalSummaryScreen` sin cambiar eventos, scoring, tracking, mapas ni backups.

Auditoria previa:

- v2 ya incluia score, efectividad, mapas e insights;
- faltaba una estructura unificada de rendimiento por jugador con ataque y defensa;
- faltaban top ataque/top defensa y sectores vulnerables dentro de cada tiempo;
- las lecturas tacticas y la jerarquia visual no reflejaban claramente `Lectura del tiempo` y `Lectura final`.

Implementado:

- `MatchReportData` agrega rendimiento por jugador por tiempo y total: goles, tiros atajados, intentos, efectividad, defensas y shares.
- Cada tiempo agrega sectores donde el rival anoto y donde defendio tiros Uruguay.
- Resumen ejecutivo agrega top ataque, top defensa y efectividad ofensiva total.
- PDF agrega `Rendimiento del tiempo`, `Efectividad ofensiva`, `Lectura del tiempo`, sectores tacticos, `Rendimiento total` y `Lectura final`.
- Barras CSS simples muestran tiros generados, puntos convertidos y contribucion defensiva sin dependencias nuevas.
- Texto compartible agrega tops, efectividad y principales sectores tacticos en formato compacto.
- Todas las zonas exportadas usan labels tacticos `marco ... · lado ... · 0°-90°`; no se exportan labels genericos izquierda/derecha/central.
- Defensas rivales legacy con ubicacion siguen en mapas/sectores, pero sin `playerId` quedan fuera de efectividad/rendimiento individual. Eventos sin ubicacion no generan sectores.

QA manual recomendado:

- Crear un partido con puntos de varios jugadores, defensas Uruguay y defensas rivales asociadas a tiradores.
- Registrar puntos rivales repetidos y defensas rivales en sectores tacticos distintos.
- Finalizar un tiempo y comparar sus datos con `Lectura del tiempo`.
- Finalizar el partido y exportar PDF.
- Confirmar encabezado, parciales, secciones por tiempo, rendimiento, efectividad, barras, tops, lecturas y sectores.
- Confirmar que no aparecen `zona derecha/izquierda/central` ni angulos superiores a 90°.
- Compartir el resumen textual y confirmar que sea compacto y util.
- Probar un partido antiguo si esta disponible; confirmar que no crashea y que mantiene ubicaciones legacy.
- Confirmar que los mapas exportados siguen coincidiendo con las ubicaciones registradas.

## 2026-06-19 - Fix de marco vulnerable desde ubicacion de caida

Se corrigio la deteccion de sectores vulnerables para que describa la ubicacion visible donde cae la pelota.

- `CourtMapInput` guarda coordenadas normalizadas sin invertir y `CourtLocationMap` las representa directamente.
- La causa era que los puntos reciben `right-frame` como valor default y el agrupador rival lo priorizaba sobre `landingLocation`, incluso para caidas en el area izquierda.
- Los puntos rivales ahora derivan marco, lado y banda exclusivamente desde `landingLocation`; `frame` deja de ser fuente de verdad para esta lectura.
- Sectores distintos conservan conteos separados y pueden generar varias alertas si cada uno alcanza el umbral.
- Eventos antiguos con ubicacion se recalculan sin migracion. Eventos sin ubicacion siguen excluidos de alertas tacticas.
- No se modificaron coordenadas, modelos, scoring, tracking ni mapas.

QA manual recomendado:

- Iniciar un partido y registrar 3 o mas puntos rivales en el area izquierda del mapa, lado derecho del marco izquierdo.
- Confirmar `marco izquierdo · lado derecho · ...` y no `marco derecho · lado izquierdo · ...`.
- Registrar 3 o mas puntos rivales en otro sector y confirmar que ambas vulnerabilidades pueden aparecer.
- Finalizar el tiempo y revisar `Lectura del tiempo`.
- Finalizar el partido y revisar `Lectura final`, zonas, PDF y texto compartible.
- Confirmar visualmente que los marcadores de los mapas coinciden con las ubicaciones tocadas.

## 2026-06-19 - Modelo tactico bilateral de 0° a 90°

Se corrigio el modelo de sectores tacticos: la lectura anterior de 0° a 180° no representaba el uso tactico del cuerpo tecnico.

- Cada sector ahora combina `marco izquierdo/derecho`, `lado izquierdo/derecho` leido desde el centro y una banda de `0°-30°`, `30°-60°` o `60°-90°`.
- La orientacion de `lado izquierdo/derecho` se invierte entre marcos para conservar esa perspectiva desde el centro.
- La segunda mitad del area se espeja para mantener todos los angulos entre 0° y 90°.
- La clave visible y de agrupacion queda en formato `marco derecho · lado izquierdo · 30°-60°`.
- Todos los consumidores reciben el cambio desde `deriveTacticalCourtSector`: live, resumen del tiempo, resumen final, report data, PDF y texto compartible.
- No se modificaron modelos, coordenadas persistidas, scoring, tracking ni mapas. Eventos antiguos con ubicacion se recalculan; sin ubicacion se omiten de alertas tacticas.

QA manual recomendado:

- Iniciar un partido y registrar puntos rivales cerca de ambos lados de un mismo marco.
- Confirmar que `Lectura en vivo` muestra `marco ... · lado ... · 0°-30°`, `30°-60°` o `60°-90°`.
- Confirmar que ninguna etiqueta supera 90° y que no aparece `zona derecha` ni `zona izquierda` en alertas tacticas.
- Finalizar el tiempo y revisar `Lectura del tiempo`.
- Finalizar el partido y revisar resumen final, PDF y texto compartible.
- Confirmar que los mapas siguen mostrando las ubicaciones registradas.

## 2026-06-19 - Fix de sectores tacticos en recomendaciones live

Se blindo `Lectura en vivo` para que las alertas de puntos y defensas rivales usen exclusivamente sectores derivados de la ubicacion real.

- Los puntos rivales se agrupan desde `landingLocation` mediante `deriveTacticalCourtSector`, usando `frame` cuando existe y el fallback espacial del helper para eventos antiguos sin `frame`.
- Las defensas rivales se agrupan desde `defenseLocation` mediante el mismo criterio tactico.
- Los eventos sin la ubicacion correspondiente se ignoran y no generan un fallback a `zona izquierda`, `zona derecha` o `zona central`.
- Se agregaron regresiones para ambas alertas, eventos legacy, ausencia de ubicacion, texto generico prohibido y ausencia de menciones a asistencias.

QA manual recomendado:

- Iniciar un partido y registrar 3 o mas puntos rivales con mapa en la misma area.
- Confirmar que `Lectura en vivo` muestra `marco ... · ...°-...°` y no muestra `zona derecha` ni `zona izquierda`.
- Registrar 3 o mas defensas rivales con mapa en la misma area y confirmar el mismo formato tactico, sin texto generico.
- Finalizar el tiempo y confirmar que `Lectura del tiempo` mantiene los sectores tacticos.
- Finalizar el partido y confirmar que el resumen final sigue funcionando.
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
- En esa version se usaba SVG con viewBox `640x360` y altura visual aproximada de `260px`; esto quedo reemplazado luego por `report-court-map` HTML/CSS y `COURT_VISUAL_GEOMETRY`.
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

## 2026-06-21 - Practica 3v3 Stage 4 rotation queue

Se implemento la rotacion de mini partidos para `Practica 3v3`.

- `TrainingSession` ahora puede persistir `teamQueue`.
- Sesiones antiguas sin `teamQueue` derivan el orden desde `queueOrder`.
- Se agregaron helpers puros para normalizar cola, sugerir el proximo mini partido y avanzar la cola al finalizar.
- Con `Ganador queda`, el ganador permanece, entra el siguiente equipo esperando y el perdedor va al fondo.
- Si `Ganador queda` esta apagado, los dos equipos que jugaron rotan al fondo.
- Con solo dos equipos, la sugerencia es revancha.
- El detalle de sesion muestra `Cola`, `Proximo sugerido`, `Iniciar proximo` y mantiene `Elegir manualmente`.
- La pantalla live muestra la siguiente sugerencia despues de finalizar el mini partido.
- No hay inicio automatico: el entrenador confirma siempre el proximo cruce.
- No se tocaron partidos formales, scoring formal, PDF formal ni backup/import.

QA manual sugerida:

- Crear sesion con 3 equipos de 3.
- Iniciar Equipo 1 vs Equipo 2.
- Hacer ganar a Equipo 1 y finalizar.
- Confirmar sugerencia Equipo 1 vs Equipo 3.
- Iniciar sugerido.
- Hacer ganar a Equipo 3 y finalizar.
- Confirmar sugerencia Equipo 3 vs Equipo 2.
- Probar `Elegir manualmente` con otro cruce y confirmar que la siguiente sugerencia sale desde ese resultado.
- Crear sesion de 2 equipos y confirmar revancha sugerida.
- Intentar iniciar otro mini partido mientras uno esta en vivo y confirmar bloqueo.
- Confirmar que `Partidos` formales sigue funcionando.

## 2026-06-21 - Practica 3v3 Stage 5 session summary

Se implemento resumen estadistico in-app para `Practica 3v3`.

- `getTrainingSessionStats` ahora deriva resumen de sesion, standings de equipos, rankings de jugadores y alertas.
- Stats por jugador: puntos, intentos, efectividad, tiros defendidos, puntos en contra, errores, defensas, jugados, ganados/perdidos, win rate y plus/minus.
- Stats por equipo: jugados, ganados, perdidos, win rate, puntos a favor, puntos en contra y diferencia.
- El detalle de sesion muestra `Resumen de la practica`, `Tabla de equipos`, `Top ataque`, `Top defensa`, `Alertas`, `Rendimiento jugadores` e historial.
- El ranking de ataque prioriza puntos, luego intentos y luego efectividad.
- Los rankings de eficiencia usan minimo de intentos para reducir ruido.
- Mini partidos cancelados no suman a standings ni rankings.
- No se tocaron partidos formales, scoring formal ni PDF/export formal.

QA manual sugerida:

- Crear sesion con 3 equipos.
- Jugar 3 mini partidos con ganadores distintos.
- Registrar puntos, defensas, errores, puntos en contra y tiros defendidos.
- Volver al detalle de sesion.
- Confirmar tabla de equipos: J, G, P, PF, PC, DIF y porcentaje.
- Confirmar `Top ataque` prioriza al jugador con mas puntos aunque tenga menor efectividad que otro con pocos tiros.
- Confirmar `Top defensa` ordena por defensas.
- Confirmar `Alertas` muestra errores, puntos en contra o baja efectividad con numeros concretos.
- Confirmar historial muestra todos los mini partidos.
- Confirmar que un mini partido en vivo no rompe el resumen.
- Confirmar que `Partidos` formales sigue funcionando.

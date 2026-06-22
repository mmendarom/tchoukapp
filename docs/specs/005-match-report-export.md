# Spec 005 - Exportar reporte de partido

## Estado

Implemented

## Problema

Despues de un partido, el cuerpo tecnico necesita compartir un resumen completo y legible con el equipo o grupo de coaches. Hoy el resumen final existe dentro de la app, pero no hay forma de exportarlo como archivo o contenido compartible.

## Objetivos

- Exportar un reporte post-partido en PDF desde `FinalSummaryScreen`.
- Generar el reporte localmente y mantener la app offline-first.
- Abrir la hoja nativa de compartir cuando el dispositivo lo permita.
- Incluir todas las estadisticas disponibles hoy: resultado, tiempos, goles, defensas, faltas, puntos en contra, puntos en contra del rival, zonas, cambios, formaciones, insights y notas.
- Mantener el armado de datos del reporte fuera de componentes UI.
- Proveer fallback textual compartible si PDF/share falla.
- Mantener visible UI y contenido del reporte en espanol.
- Agregar tests para armado de datos y HTML/texto.

## No objetivos

- No agregar backend, auth, cloud sync ni servicios pagos.
- No persistir archivos exportados como fuente de verdad.
- No cambiar el flujo de partido en vivo.
- No cambiar scoring, timer, defensa/error, sustituciones, undo, cancelacion ni mapa de cancha.
- No implementar imagen/share visual en la primera version si requiere captura de vista o dependencia extra.
- No agregar heatmaps visuales complejos en PDF.

## Usuario / Flujo

1. El usuario finaliza el partido.
2. Se abre `Resumen final del partido`.
3. Toca `Exportar reporte PDF`.
4. La app muestra `Generando reporte...`.
5. La app genera un PDF local.
6. Si `expo-sharing` esta disponible, abre la hoja nativa para WhatsApp, Drive, mail u otras apps.
7. Si PDF/share falla, la app ofrece compartir un resumen textual.

## Datos disponibles para exportar

- `Match`: rival, sede, fecha, estado, notas.
- `MatchEvent`: puntos, errores, defensas, cambios.
- `LineupSnapshot`: formacion inicial, formacion final y cambios.
- `Player`: nombres y numeros para etiquetar estadisticas.
- `periodStats`: scores, goleadores, defensas, errores, cambios, puntos en contra rival e insights por tiempo.
- `court`: agrupacion de zonas desde `landingLocation`.
- `insights`: lecturas tacticas generales.

No existe hoy:

- Competencia/tipo guardado en `Match`.
- Notas por tiempo.
- Export util existente.
- Dependencias de PDF/share instaladas.

## Estructura PDF

### A. Encabezado

- `Reporte del partido`
- `{teamPoolName | Equipo} vs {opponent}`
- Fecha
- Sede si existe
- Resultado final

### B. Resultado

- Resultado final.
- Resultado por tiempos:
  - `1er tiempo`
  - `2do tiempo`
  - `3er tiempo`
- El score incluye `Punto en contra` y `Punto en contra rival`.

### C. Secciones por tiempo

Por cada tiempo:

- Score del tiempo.
- Puntos del equipo propio, con su nombre visible.
- Puntos rival.
- Puntos en contra.
- Puntos en contra del rival.
- Goleadores.
- Defensas.
- Faltas.
- Puntos en contra por jugador.
- Cambios.
- Alertas tacticas del tiempo.
- Nota de falta de notas por tiempo si aplica.

### D. Estadisticas totales

- Goleadores.
- Defensas.
- Faltas.
- Puntos en contra.
- Total errores por jugador.
- Puntos en contra del rival total.
- Cambios realizados.
- Alertas tacticas generales.

### E. Ubicacion / cancha

Primera version:

- Incluir resumen textual por zonas:
  - `Zonas de ataque`
  - `Zonas donde nos anotaron`
  - `Zonas donde nos defendieron`
- Agregar nota: `Mapa visual exportable pendiente para una proxima iteracion.`

No se dibuja mapa visual en PDF en esta version para evitar complejidad y dependencias de captura.

### F. Formaciones

- `Formacion inicial`
- `Formacion final`
- `Cambios realizados`

### G. Notas

- `Notas` con `match.notes` si existe.
- Fallback `Sin notas registradas.`

## Export imagen / visual compartible

Diferido. La alternativa probable seria `react-native-view-shot`, pero no se incorpora en esta version porque agrega una dependencia nueva y requiere validar captura visual en dispositivos reales.

## Impacto en modelo de datos

No hay cambios de modelo persistido.

El reporte se deriva desde `Match`, `Player[]`, eventos y snapshots. No se guardan totales derivados.

## Impacto en UI

`FinalSummaryScreen` reemplaza el placeholder `Exportar` por:

- `Exportar reporte PDF`
- `Compartir resumen`
- Estados visibles:
  - `Generando reporte...`
  - `Reporte generado`
  - `No se pudo generar el reporte`

## Impacto en persistencia

- No se modifica Zustand ni AsyncStorage.
- El PDF generado queda como archivo temporal/local del sistema Expo.
- El contenido compartido se genera on demand.

## Dependencias consideradas

- `expo-print`: genera PDF desde HTML. Es Expo-compatible e incluido en Expo Go segun documentacion oficial.
- `expo-sharing`: abre hoja nativa para compartir archivos. Es Expo-compatible e incluido en Expo Go segun documentacion oficial; en web tiene limitaciones.
- `react-native-view-shot`: diferido para imagen porque agrega captura visual y mayor riesgo.

## Testing plan

Tests puros:

- El reporte incluye resultado final.
- El reporte incluye resultado por tiempos.
- `Punto en contra` suma al rival.
- `Punto en contra rival` suma a Uruguay.
- Incluye goleadores.
- Incluye defensas.
- Incluye defensas del rival por total y zonas cuando existen.
- Incluye faltas.
- Incluye puntos en contra.
- Incluye puntos en contra del rival.
- Incluye cambios.
- Incluye formacion inicial/final.
- Eventos viejos o incompletos no crashean.
- Datos faltantes usan fallbacks seguros.
- HTML/texto no exponen valores raw como `opponent_own_point` o `punto_en_contra`.

PDF/share:

- No se testea el modulo nativo en unit tests; se testea el HTML y data builder.

## Riesgos

- PDF HTML puede verse distinto entre iOS/Android.
- `expo-sharing` tiene limitaciones en web y puede no estar disponible en algunos entornos.
- El reporte textual de zonas no reemplaza un mapa visual.
- Si se agregan dependencias, hay que validar version compatible con Expo SDK 54.

## Preguntas abiertas

- Agregar campo `competition` a `Match` en una spec futura.
- Agregar notas por tiempo.
- Agregar mapa visual exportable o imagen/share card.
- Definir branding visual oficial de Uruguay Tchoukball para reportes.

## Checklist de aceptacion

- [x] Existe boton `Exportar reporte PDF` en resumen final.
- [x] Existe fallback `Compartir resumen`.
- [x] PDF se genera localmente.
- [x] Si sharing esta disponible, se abre hoja nativa.
- [x] El reporte incluye resultado final y por tiempos.
- [x] Incluye estadisticas por periodo y totales.
- [x] Incluye zonas de ataque y zonas donde nos anotaron como resumen textual.
- [x] Incluye formacion inicial/final y cambios.
- [x] Incluye notas o fallback.
- [x] No rompe resumen final ni flujos existentes.
- [x] `npm test` pasa.
- [x] `npx tsc --noEmit` pasa.

## Report Export v2

Estado: Implemented.

## Report Export v3

Estado: Implemented.

## Report Export v3.2 - Mapas PDF alineados con cancha app

Estado: Implemented.

### Problema

El renderer HTML/CSS print-safe de mapas PDF resolvio la visibilidad en Expo Print, pero definia una geometria propia para la cancha y aplicaba offsets a los marcadores. Eso podia hacer que una ubicacion normalizada se viera en un sector distinto al que el usuario habia tocado en `CourtMapInput`.

### Resultado implementado

- La geometria visual de cancha se centraliza en `src/domain/courtVisual.ts`.
- `CourtField` y `reportHtml` consumen los mismos valores para carriles, areas de marco, semicirculos/areas prohibidas y guias horizontales.
- Los mapas PDF siguen usando HTML/CSS print-safe, pero ya no tienen una forma independiente.
- Los marcadores del PDF usan directamente `x * 100` y `y * 100` sobre la misma superficie normalizada que usa la app.
- Se mantienen `data-normalized-x/y` para test/debug.
- No se agregan etiquetas de grados dentro del mapa PDF.

### No cambia

- Eventos, scoring, tracking, backups ni import/export de datos.
- `landingLocation`, `defenseLocation` ni coordenadas normalizadas persistidas.
- Matematica de sectores tacticos.
- `CourtMapInput`, `CourtMapSummary` y mapas de la app, salvo que ahora comparten constantes visuales.
- Dependencias nativas o librerias de graficos.

## Report Export v3.3 - Estabilizacion post-merge de mapas PDF

Estado: Implemented.

### Problema

Tras mergear cambios de dos computadoras, los mapas PDF seguian renderizando pero se veian poco confiables: los porcentajes de areas estaban compartidos, pero el contenedor PDF mantenia un alto fijo independiente que aplastaba la cancha frente a `CourtMapInput`.

### Resultado implementado

- `COURT_VISUAL_GEOMETRY` tambien define:
  - proporcion visual usada por `CourtMapInput`;
  - ancho/alto objetivo de mapas PDF.
- `CourtMapInput` deja de hardcodear el ratio `0.62`.
- `reportHtml` deja de hardcodear la cancha PDF en `260px` de alto.
- El PDF mantiene HTML/CSS print-safe, pero centra una cancha con proporcion consistente con la experiencia de carga.
- Los mapas PDF no muestran leyendas o guias de grados; esas referencias son exclusivas del input tactil.
- Se agregan tests de regresion para detectar drift si `CourtField` o `reportHtml` vuelven a hardcodear geometria.

## Report Export v3.4 - Geometria unificada en input, app y PDF

Estado: Implemented.

### Problema

El arreglo PDF anterior redujo el drift entre `CourtField` y `reportHtml`, pero seguian existiendo calculos visuales independientes en mapas live y resumenes in-app. En QA de campo, un mismo punto normalizado podia verse confiable en una pantalla y ambiguo en otra.

### Resultado implementado

- `src/domain/courtVisual.ts` es la fuente unica para:
  - carriles, areas laterales y semicirculos;
  - proporcion/altura tactil de `CourtMapInput`;
  - alturas default de `CourtLocationMap` y resumenes;
  - altura de `LiveMapPanel`;
  - ancho/alto objetivo del mapa PDF.
- `CourtField`, `CourtMapInput`, `CourtLocationMap`, `CourtMapSummary`, `LiveMapPanel` y `reportHtml` derivan de esa fuente.
- `CourtMapSummary` ya no calcula una altura propia, evitando drift con otros mapas in-app.
- Los mapas PDF siguen usando HTML/CSS print-safe, no SVG.
- Las guias de grados quedan solo en `CourtMapInput`; resumenes, live y PDF permanecen limpios.
- `landingLocation` y `defenseLocation` siguen posicionandose por coordenadas normalizadas directas.

### No cambia

- Coordenadas normalizadas persistidas.
- `landingLocation`, `defenseLocation`, eventos legacy ni sectores tacticos.
- Score, tracking, undo, resumenes o datos exportados.
- Dependencias.

### No cambia

- Coordenadas normalizadas persistidas.
- `landingLocation`, `defenseLocation`, eventos legacy ni sectores tacticos.
- Score, tracking, resumenes o export data.
- Dependencias.

### Problema

El reporte v2 incluye score, mapas, efectividad e insights, pero no refleja de forma completa la lectura post-periodo/post-partido: falta rendimiento unificado por jugador, comparacion visual entre tiros generados y puntos convertidos, top ataque/defensa y sectores vulnerables por tiempo.

### Alcance

- Agregar rendimiento por jugador por tiempo y total: puntos, tiros defendidos, intentos, efectividad y defensas Uruguay.
- Agregar top ataque y top defensa derivados de las mismas reglas que usa la UI.
- Incluir `Lectura del tiempo` y `Lectura final` con recomendaciones reales.
- Incluir por tiempo sectores donde el rival anoto y donde defendio tiros Uruguay.
- Renderizar barras HTML/CSS simples, sin dependencias nuevas.
- Ampliar el texto compartible con top ataque, top defensa, efectividad y sectores tacticos principales.
- Mantener eventos legacy seguros: defensas rivales sin jugador quedan en sectores/mapas pero no en efectividad individual; eventos sin ubicacion no generan sectores.

### No cambia

- Modelos persistidos, scoring, tracking, mapas, backups ni flujo live.
- Las coordenadas y eventos existentes se recalculan on demand; no hay migracion.

### Resultado implementado

- Encabezado y resumen ejecutivo con resultado, plantel, tops y efectividad total.
- Secciones por tiempo con score, tarjetas, rendimiento, efectividad, lectura real y sectores tacticos.
- Totales con rendimiento, efectividad, lectura final, errores, puntos regalados y sectores principales.
- Barras CSS: fondo para tiros generados, frente para puntos convertidos y barra de share defensivo.
- Texto compartible compacto con top ataque, top defensa, efectividad y sectores principales.

### Contexto

La primera version exporta PDF y texto compartible correctamente, pero el reporte no es todavia suficientemente util para coaching post-partido. Hoy incluye muchos datos como texto/listas, pero le falta una narrativa clara, mejor separacion por tiempo, mapas visuales exportables y un resumen ejecutivo que ayude a entender el partido rapido.

### Auditoria de implementacion actual

Archivos actuales:

- `src/domain/reportData.ts`: arma `MatchReportData` desde `Match` y `Player[]`. Incluye score final, score por tiempo, secciones por tiempo, totales, zonas textuales, formacion inicial/final, cambios, intercambios e insights.
- `src/export/reportHtml.ts`: genera HTML de PDF y fallback textual. Usa listas y grids simples. No renderiza mapas visuales; muestra resumen textual de zonas y nota de mapa pendiente.
- `src/export/exportMatchReport.ts`: integra `expo-print` y `expo-sharing`.
- `src/screens/FinalSummaryScreen.tsx`: llama `buildMatchReportData`, `exportMatchReportPdf` y `buildMatchReportText`.
- `src/domain/court.ts`: deriva zonas y filtra eventos con `landingLocation` o `defenseLocation`.
- `src/components/CourtMapSummary.tsx`: muestra mapas en app con puntos/densidad, pero no se reutiliza en PDF.

Incluido hoy:

- Resultado final.
- Resultado por tiempos.
- Stats por tiempo para puntos, puntos en contra, puntos en contra rival, goleadores, defensas Uruguay, defensas rival, faltas, errores, cambios e insights.
- Totales de goleadores, defensas Uruguay, defensas rival, faltas, puntos en contra, errores, puntos en contra rival, cambios, formacion inicial/final, insights y notas.
- Resumen textual de zonas: ataque, puntos recibidos y defensas rivales.
- Fallback textual compartible.

Limitaciones actuales:

- No hay portada/resumen ejecutivo fuerte.
- No hay mapas/heatmaps visuales en PDF.
- Las zonas del PDF son listas textuales, menos utiles que un mapa.
- Las secciones por tiempo existen, pero no tienen una jerarquia visual suficientemente clara.
- No hay mapas por tiempo.
- El texto compartible es largo y no prioriza top stats/insights para WhatsApp.
- `competitionLabel` usa fallback porque `Match` no guarda competencia/tipo.
- No conviene incluir timeline crudo como cuerpo principal porque puede meter ruido.

### Datos disponibles hoy

Match:

- `opponent`, `venue`, `startsAt`, `notes`, `status`, `currentPeriod`, `periods`, `clock`.
- No existe `competition` o `matchType` en `Match`.

Eventos:

- Puntos Uruguay: `PointEvent` con `scoringTeam: 'uruguay'`, `pointSource: 'attack'`, jugador opcional y `landingLocation` cuando fue registrado con mapa.
- Puntos rival: `PointEvent` con `scoringTeam: 'opponent'` y `landingLocation`.
- Punto en contra: `ErrorEvent` Uruguay con `errorType: 'punto_en_contra'`, suma al rival y no tiene mapa.
- Punto en contra rival: `PointEvent` Uruguay con `pointSource: 'opponent_own_point'`, suma a Uruguay, sin jugador ni mapa.
- Defensas Uruguay: `DefenseEvent` con jugador Uruguay.
- Defensas rival: `OpponentDefenseEvent` con `defenseLocation`.
- Faltas: `ErrorEvent` Uruguay con `errorType: 'falta'`.
- Sustituciones: `SubstitutionEvent`.
- Intercambios en cancha: `LineupSwapEvent`.

Location data:

- `landingLocation` para puntos Uruguay y puntos rival cuando fueron registrados con mapa.
- `defenseLocation` para defensas rivales.
- No hay ubicacion para defensas Uruguay, punto en contra ni punto en contra rival, y no debe inferirse.

Derived stats:

- Scores por eventos.
- Goleadores por periodo y total.
- Defensas Uruguay por jugador.
- Defensas rival por total y zonas.
- Faltas, puntos en contra y errores por jugador.
- Puntos en contra rival por periodo y total.
- Zonas frecuentes e insights tacticos.
- Lineup inicial/final, sustituciones e intercambios.

### Estructura objetivo v2

#### A. Header / portada

- `Reporte del partido`.
- `{teamPoolName | Equipo} vs {rival}`.
- Fecha.
- Sede.
- Competencia/tipo si existe; fallback `Sin competencia registrada`.
- Resultado final.
- Resultado por tiempos.

#### B. Resumen ejecutivo

Seccion corta, arriba del PDF:

- Resultado final.
- Mejor goleador.
- Jugador con mas defensas.
- Total de errores.
- Puntos en contra.
- Puntos en contra del rival.
- Zona mas efectiva.
- Zona mas vulnerable.
- Zona donde mas nos defendieron.
- 2 o 3 insights generales priorizados.

#### C. Seccion por tiempo

Para `1er tiempo`, `2do tiempo`, `3er tiempo`:

- Score del tiempo.
- Puntos del equipo propio, con su nombre visible.
- Puntos rival.
- Puntos en contra.
- Puntos en contra rival.
- Goleadores del tiempo.
- Defensas propias del tiempo, con nombre visible cuando corresponde.
- Defensas rival del tiempo.
- Faltas del tiempo.
- Puntos en contra por jugador.
- Cambios del tiempo.
- Intercambios en cancha del tiempo.
- Insights del tiempo.
- Mapas del tiempo:
  - `Donde hicimos los puntos`.
  - `Donde nos hicieron puntos`.
  - `Donde nos defendieron`.

#### D. Totales del partido

- Resultado final.
- Resultado por tiempos.
- Goleadores totales.
- Defensas propias totales, con nombre visible cuando corresponde.
- Defensas rival totales.
- Faltas totales.
- Puntos en contra totales.
- Puntos en contra rival total.
- Total de errores por jugador.
- Cambios totales.
- Intercambios en cancha totales.
- Formacion inicial.
- Formacion final.
- Insights generales.
- Mapas totales:
  - `Donde hicimos los puntos`.
  - `Donde nos hicieron puntos`.
  - `Donde nos defendieron`.

#### E. Apendice opcional

Incluir solo si no vuelve ruidoso el PDF:

- Timeline compacto de eventos importantes.
- Snapshots de alineacion detallados.

No incluir una lista cruda completa como seccion principal en v2.

### Mapas/heatmaps en PDF

Enfoque actual: cancha HTML/CSS print-safe dentro del HTML del PDF.

Motivos:

- Evita depender del soporte de SVG de `expo-print`, que puede renderizar mapas invisibles o recortados en algunos PDFs.
- No depende de componentes React Native.
- No requiere dependencias nuevas.
- Permite dibujar cancha, marcos y puntos desde coordenadas normalizadas con contenedores HTML de alto fijo.
- Es testeable como string HTML.

Reglas:

- Usar `landingLocation` para puntos Uruguay y puntos rival.
- Usar `defenseLocation` para defensas rivales.
- No inferir ubicaciones.
- Ignorar eventos sin ubicacion.
- Excluir `Punto en contra` y `Punto en contra rival` de mapas.
- Renderizar mapas por tiempo y mapas totales.
- Usar puntos con tamano/opacidad por densidad cercana como primer heatmap liviano.

Implementado en `src/export/reportHtml.ts` con HTML/CSS:

- Mapa `Donde hicimos los puntos`.
- Mapa `Donde nos hicieron puntos`.
- Mapa `Donde nos defendieron`.
- Mapas por tiempo y mapas totales.
- Fallback visible `Sin ubicaciones registradas`.
- Contenedor `report-court-map` con alto derivado de `COURT_VISUAL_GEOMETRY`, fondo, borde, linea central, areas laterales y frames.
- Marcadores `report-map-point` con `data-normalized-x/y`, posicionados por porcentaje y diferenciados por color.
- Sin dependencias nuevas.
- El HTML declara `UTF-8` y el fallback textual usa strings UTF-8 normales para evitar mojibake en acentos.

Refinamiento de legibilidad PDF:

- Los mapas del PDF se renderizan como bloques grandes de ancho completo, uno por fila.
- Se reemplazo el layout anterior de tres mapas pequenos en una fila.
- Cada cancha usa altura fija derivada de `COURT_VISUAL_GEOMETRY.reportMapHeightPx` para evitar contenedores colapsados en PDF sin divergir de la geometria compartida.
- Los marcadores son mas visibles, mantienen forma circular y usan colores por tipo:
  - azul para puntos de Uruguay;
  - rojo para puntos del rival;
  - violeta para defensas del rival.
- Las secciones `Mapas del tiempo` y `Mapas totales` usan reglas CSS para evitar titulos huerfanos y cortes internos de tarjetas.
- El modelo de coordenadas normalizadas no cambia.
- Los mapas de la app (`CourtMapInput`, `CourtMapSummary`, `CourtLocationMap`, `LiveMapPanel`) comparten la misma fuente de geometria visual que el PDF.

Limitaciones:

- No es un heatmap continuo real.
- La fidelidad visual puede variar levemente entre plataformas PDF.
- Si hay demasiados puntos, puede requerir clustering mejorado en una iteracion futura.

### Arquitectura v2

Mantener responsabilidades:

- `src/domain/reportData.ts`: builder puro.
- `src/export/reportHtml.ts`: HTML/texto solamente.
- `src/export/exportMatchReport.ts`: print/share solamente.
- `FinalSummaryScreen`: acciones de export/share solamente.

Funciones a agregar o evolucionar:

- `buildPeriodReportData`.
- `buildTotalReportData`.
- `getPlayerPointsByPeriod`.
- `getPlayerPointsTotal`.
- `getReportLocationMapsByPeriod`.
- `getReportTotalLocationMaps`.
- `getReportExecutiveSummary`.
- `renderReportCourtMap`.
- `renderReportStatTable`.
- `buildMatchReportTextV2` o evolucionar `buildMatchReportText`.

### Fallback textual v2

El resumen para WhatsApp debe ser mas corto que el PDF:

- Resultado final.
- Resultado por tiempos.
- Top 3 goleadores.
- Top defensas.
- Errores principales.
- Puntos en contra.
- Puntos en contra rival.
- Zonas principales:
  - donde hicimos puntos.
  - donde nos hicieron puntos.
  - donde nos defendieron.
- 2 o 3 insights tacticos.

### Testing v2

- [x] Reporte incluye los 3 tiempos separados.
- [x] Reporte incluye totales del partido.
- [x] Score final y por tiempo son correctos.
- [x] `Punto en contra` suma al rival.
- [x] `Punto en contra rival` suma a Uruguay.
- [x] Puntos por jugador por tiempo y total son correctos.
- [x] `Punto en contra rival` no cuenta como gol de jugador.
- [x] Mapas de puntos Uruguay incluyen solo ubicaciones de puntos Uruguay.
- [x] Mapas de puntos rival incluyen solo ubicaciones de puntos rival.
- [x] Mapas de defensas rival incluyen solo `defenseLocation`.
- [x] Eventos sin ubicacion no crashean.
- [x] Formacion inicial/final, sustituciones e intercambios aparecen.
- [x] Defensas, faltas y puntos en contra aparecen.
- [x] HTML incluye secciones de mapas.
- [x] Mapas PDF usan bloques grandes de ancho completo.
- [x] Mapas PDF ya no usan el viejo layout de tres columnas.
- [x] Coordenadas normalizadas siguen renderizando marcadores sin `NaN` ni `undefined`.
- [x] Texto fallback incluye stats clave.
- [x] HTML/texto no muestran enums crudos.
- [x] HTML/texto no contienen mojibake como `Ã`, `Â` o `�`.
- [x] HTML/texto renderizan palabras acentuadas como `formación`, `está`, `tácticas` y `ubicación`.

### QA manual v2

- Finalizar un partido con datos en los 3 tiempos.
- Incluir puntos de varios jugadores, puntos rival, punto en contra, punto en contra rival, defensas Uruguay, defensas rival, faltas, sustituciones e intercambios.
- Exportar PDF.
- Verificar datos por tiempo y totales.
- Verificar mapas por tiempo y totales.
- Verificar que cada mapa del PDF ocupa una fila grande y no aparece como mini tarjeta de tres columnas.
- Verificar que los puntos del mapa coinciden razonablemente con las ubicaciones registradas.
- Verificar que los titulos de mapas no quedan huerfanos al final de una pagina.
- Verificar goleadores y defensas.
- Verificar que no hay enums crudos.
- Verificar que el PDF se lee bien en telefono.
- Compartir por WhatsApp/Drive/email si esta disponible.
- Probar partido con pocos datos y confirmar que no crashea.

## QA manual

- Finalizar un partido.
- Tocar `Exportar reporte PDF`.
- Confirmar que aparece `Generando reporte...`.
- Confirmar que abre share sheet o muestra fallback seguro.
- Confirmar resultado final.
- Confirmar resultado por tiempos.
- Confirmar goleadores, defensas, faltas, puntos en contra y puntos en contra rival.
- Confirmar cambios y formaciones.
- Confirmar que el PDF es legible en telefono.
- Probar compartir por WhatsApp/mail/Drive si esta disponible.
- Probar un partido con pocos datos y confirmar que no crashea.

## Ajuste de efectividad ofensiva - 2026-06-20

- Las filas de rendimiento y efectividad exportadas incluyen `ownPointsAgainst`.
- Los tiros totales suman goles, tiros atajados por el rival y puntos en contra Uruguay con jugador.
- HTML y texto muestran los intentos errados/en contra sin alterar el score ni duplicar el conteo existente de `Puntos en contra`.
- Ese ajuste de formula no incluyo por si solo el posterior rediseño visual Report Export v3.1.

## Report Export v3.1 - Visual digest polish

Estado: implementado el 2026-06-20; QA de PDF nativo pendiente.

### Objetivo

Convertir el PDF data-rich de v3 en un digest tactico escaneable, preservando la misma informacion derivada y sin cambiar eventos, score, tracking, mapas, backup/import ni pantallas de la app.

### Reglas visuales

- `Rendimiento del tiempo` y `Rendimiento total` usan dos tarjetas compactas: `Ataque` y `Defensa`.
- Ataque muestra hasta 7 jugadores, `goles/intentos`, efectividad, atajados y errados; la pista clara representa todos los intentos del jugador y la barra fuerte representa goles/intentos.
- Defensa muestra hasta 7 jugadores, defensas y una barra de contribucion sobre defensas totales.
- Las barras usan `div`, alturas explicitas, colores print-safe, anchos inline y `print-color-adjust: exact` para Expo Print.
- Si existen mas filas se informa `+N jugadores mas`; no se elimina el dato del modelo.
- Las lecturas tacticas se renderizan como tarjetas con titulo y detalle factual, sin `suggestedAction` generico repetido.
- Limites PDF: 3 highlights ejecutivos, 5 por tiempo y 6 finales. `Baja participacion` queda relegada si existen alertas de mayor valor.
- Sectores muestran hasta 5 filas con barra de conteo y conservan labels tacticos de marco, lado y bandas `0°-30°`, `30°-60°`, `60°-90°`.
- Se agregan reglas `break-inside/page-break-inside` a tarjetas, filas, mapas y bloques tacticos.

### Formula preservada

- `attempts = goals + rivalDefendedShots + ownPointsAgainst`.
- `effectiveness = goals / attempts`.
- `ownPointsAgainst` se presenta como `errados`; no cambia scoring ni se duplica el conteo de puntos en contra.

### Texto compartible

- Incluye score final, top ataque, top defensa, efectividad total, principal zona vulnerable y principal zona bloqueada.
- No incluye prosa generica de recomendaciones.

### QA manual v3.1

- Generar un partido con varios goleadores, tiros atajados, puntos en contra con jugador, defensas Uruguay, sectores rivales repetidos y errores repetidos.
- Confirmar barras de intentos/convertidos y defensa visibles en Android/iOS.
- Confirmar errados en filas de ataque y formula correcta.
- Confirmar lecturas compactas, sectores sin labels genericos ni angulos mayores a 90° y cortes de pagina aceptables.
- Confirmar que el texto compartible sigue compacto.

## Field fix - categoria y ranking del reporte

Estado: implementado el 2026-06-20; QA manual de PDF pendiente.

- `matchLabel` usa `{teamPoolName} vs {opponent}` cuando existe plantel y `Equipo vs {opponent}` como fallback.
- El label se reutiliza en header PDF y texto compartible; el resumen ejecutivo repite el nombre visible del equipo.
- Ataque ordena por goles, intentos, efectividad, menos errados y fallback estable.
- Efectividad usa goles antes que volumen/porcentaje para que `8/11` quede por encima de `1/1`.
- Defensa ordena por defensas, share y nombre/orden estable.
- Errores, puntos en contra y sectores quedan descendentes por conteo.
- No cambia ningun dato derivado, scoring, tracking ni compatibilidad historica.

## Field fix - nombre visible del equipo propio

Estado: implementado el 2026-06-20; QA manual de PDF nativo pendiente.

- El reporte recibe `ownTeamName` derivado desde `match.teamPoolName` y usa `Equipo` como fallback seguro.
- Matchup, score final/parcial, cards `Puntos/Defensas`, vacios y texto compartible dejan de hardcodear `Uruguay`.
- Ejemplos: `Mayores vs Etsy`, `+40 0 - 0 Etsy`, `Puntos Bohemios`.
- `team: 'uruguay'` y `scoringTeam: 'uruguay'` permanecen como identificadores internos compatibles.
- No se modifica el modelo persistido, eventos, scoring, tracking ni backup/import.

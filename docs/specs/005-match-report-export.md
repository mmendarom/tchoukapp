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
- `Uruguay vs {opponent}`
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
- Puntos Uruguay.
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
- `Uruguay vs {rival}`.
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
- Puntos Uruguay.
- Puntos rival.
- Puntos en contra.
- Puntos en contra rival.
- Goleadores del tiempo.
- Defensas Uruguay del tiempo.
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
- Defensas Uruguay totales.
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

Enfoque elegido: inline SVG dentro del HTML del PDF.

Motivos:

- Funciona dentro de HTML generado para `expo-print`.
- No depende de componentes React Native.
- No requiere dependencias nuevas.
- Permite dibujar cancha, marcos y puntos desde coordenadas normalizadas.
- Es testeable como string HTML.

Reglas:

- Usar `landingLocation` para puntos Uruguay y puntos rival.
- Usar `defenseLocation` para defensas rivales.
- No inferir ubicaciones.
- Ignorar eventos sin ubicacion.
- Excluir `Punto en contra` y `Punto en contra rival` de mapas.
- Renderizar mapas por tiempo y mapas totales.
- Usar puntos con tamano/opacidad por densidad cercana como primer heatmap liviano.

Implementado en `src/export/reportHtml.ts` con SVG inline:

- Mapa `Donde hicimos los puntos`.
- Mapa `Donde nos hicieron puntos`.
- Mapa `Donde nos defendieron`.
- Mapas por tiempo y mapas totales.
- Fallback visible `Sin ubicaciones registradas`.
- Sin dependencias nuevas.
- El HTML declara `UTF-8` y el fallback textual usa strings UTF-8 normales para evitar mojibake en acentos.

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
- Verificar que los puntos del mapa coinciden razonablemente con las ubicaciones registradas.
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

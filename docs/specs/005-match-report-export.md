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

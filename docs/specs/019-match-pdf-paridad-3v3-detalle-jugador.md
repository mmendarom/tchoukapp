# Spec: PDF del partido vs rival - paridad con 3v3 y detalle por jugador

## Estado

Implemented

> Ajuste 2026-07-06 (pedido de Mauro): se devolvió la barra celeste de "aporte posible" que esta spec había quitado de los PDF. La barra fuerte sigue midiendo `attackShare`/`pointShare` (las barras suman el total de goles del equipo) y la barra celeste (`potentialShare` = tiros generados / goles del equipo, recortada a 100%) muestra hasta dónde llegaba el jugador si también convertía los tiros atajados/errados. Aplica al PDF formal (`reportHtml.ts`, filas y detalle por jugador, colores #9dcff0/#075ca8) y al PDF 3v3 (`trainingReportHtml.ts`, #8bd3ff/#0b6bcb). Las barras in-app no cambian.

## Contexto

Pedido explícito de Mauro: comparar el export PDF del 3v3 (spec 017/012) con el del partido vs rival y portar todas las mejoras del 3v3 al modo formal, más un desglose individual por jugador participante.

## Problema

1. Las barras de ataque del PDF formal (y de las barras in-app `PlayerPerformanceBars`) muestran efectividad individual (goles/tiros del propio jugador): no permiten comparar cuánto aportó cada uno al total de goles.
2. El PDF formal fuerza bloques atómicos enormes (`.report-map-section` con los 3 mapas juntos, `.performance-grid`, `.executive-section`, `.tactical-sectors`): cuando no entran en la página quedan hojas con huecos grandes, el mismo defecto corregido en el 3v3 (spec 017).
3. No existe un desglose individual: el entrenador no puede ver de un vistazo las estadísticas y los mapas de un jugador concreto.

## Objetivos

- Barras de ataque por participación en el total de goles (`attackShare`, ya presente en los datos) con el texto "NN% de los goles", en el PDF y en las barras in-app del partido formal.
- Paginación fluida: solo los bloques chicos (tarjetas, filas, mapas individuales) son atómicos.
- Nueva sección "Detalle por jugador" al final del PDF: una página por jugador que participó, con métricas, barras de ataque/defensa y mapas individuales (dónde convirtió, dónde le atajaron).

## No objetivos

- Tocar el PDF del 3v3 ni el de Estadística 7v7.
- Cambiar el modelo de eventos o los cálculos de rendimiento existentes.

## Usuarios / Casos de uso

- Entrenador repasando el PDF post-partido: identifica el aporte relativo de cada jugador y baja al detalle individual con mapas.

## Flujo esperado

Sin cambios de flujo: "Exportar PDF" genera el reporte con las mejoras.

## Requisitos funcionales

- `MatchReportData.playerDetails`: una fila por jugador participante (estuvo en cancha o registró eventos), ordenada por aporte ofensivo, con goles, tiros, atajados, errados, efectividad, `attackShare`, defensas, `defenseShare`, errores, faltas y ubicaciones individuales (puntos convertidos y tiros que le atajaron).
- El ancho de la barra de ataque = `attackShare` (goles del jugador / goles del equipo), en PDF e in-app.

## Impacto en modelo de datos

- Solo derivado: `ReportPlayerDetail` en `reportData.ts`. Nada persistido.

## Impacto en UI

- `reportHtml.ts`: barras, paginación y sección nueva.
- `PlayerPerformanceBars.tsx`: barra de ataque por share de goles + texto (afecta Rendimiento en vivo, del tiempo y total).

## Testing plan

- `reportData`: `playerDetails` con shares, errores/faltas y ubicaciones individuales correctas.
- `reportHtml`: sin `break-inside: avoid` en los contenedores grandes; barra por share; sección "Detalle por jugador" presente con mapas.

## Riesgos

- La barra ya no muestra efectividad de forma gráfica; se compensa con el texto "goles/tiros · efectividad" que ya existe en cada fila.

## Plan de implementación

Ver `docs/plans/019-match-pdf-paridad-3v3-detalle-jugador-plan.md`.

## Checklist de aceptación

- [x] Barras por % de goles en PDF e in-app.
- [x] Mapas y secciones grandes fluyen sin hojas casi vacías.
- [x] Detalle por jugador con métricas y mapas individuales.
- [x] `npx tsc --noEmit` y `npm test` en verde.

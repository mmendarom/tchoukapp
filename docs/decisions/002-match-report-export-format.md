# Decision: Match report export format

## Date

2026-05-31

## Status

Accepted

## Context

El cuerpo tecnico necesita compartir reportes post-partido con estadisticas disponibles en la app. La app es Expo SDK 54, offline-first, sin backend ni servicios pagos. Actualmente no hay dependencias de PDF, sharing ni captura de imagen.

## Decision

Implementar primera version como PDF generado desde HTML con `expo-print`, y compartir el archivo con `expo-sharing` cuando este disponible.

Versiones instaladas por `npx expo install` para Expo SDK 54:

- `expo-print` `~15.0.8`
- `expo-sharing` `~14.0.8`

Agregar tambien un resumen textual compartible con `Share` de React Native como fallback y como accion liviana.

Dejar imagen/share visual diferido.

## Consequences

Beneficios:

- El reporte se genera localmente y funciona offline.
- HTML permite construir un PDF legible sin motor visual complejo.
- `expo-print` y `expo-sharing` son paquetes Expo compatibles con Expo Go.
- La logica del reporte puede testearse como funciones puras.
- No se cambia el modelo persistido.

Costos:

- El PDF no incluye un mapa visual exacto en esta version.
- La apariencia del PDF puede variar entre plataformas.
- `expo-sharing` tiene limitaciones en web y puede no estar disponible en algunos entornos.
- La imagen compartible requiere una decision futura.

## Alternatives considered

- Solo texto compartible: muy liviano, pero menos util como reporte formal.
- `react-native-view-shot`: util para imagen, pero agrega dependencia y riesgo de captura/layout.
- Backend para generar PDFs: rechazado por romper offline-first y agregar infraestructura.
- Persistir reportes generados: rechazado porque los datos derivados deben recalcularse desde eventos.

## V2 extension - visual maps in PDF

## Date

2026-06-04

## Status

Implemented

## Context

El Report Export v2 necesita mapas visuales para datos con ubicacion: puntos Uruguay, puntos rival y defensas rivales. La app ya guarda coordenadas normalizadas en `landingLocation` y `defenseLocation`, y ya muestra mapas en React Native con `CourtMapSummary`. El PDF se genera desde HTML con `expo-print`, por lo que no conviene depender de componentes React Native para renderizar mapas dentro del PDF.

## Decision

Renderizar mapas del reporte v2 como SVG inline dentro del HTML generado.

Reglas:

- Usar coordenadas normalizadas existentes.
- No inferir ubicaciones.
- Ignorar eventos sin ubicacion.
- Excluir `Punto en contra` y `Punto en contra rival`.
- Generar mapas por tiempo y totales.
- Usar puntos con tamano/opacidad por densidad cercana como heatmap liviano.
- No agregar dependencias nuevas para v2.

Implementacion:

- `src/domain/reportData.ts` expone datasets de ubicaciones por tiempo y totales.
- `src/export/reportHtml.ts` renderiza mapas SVG inline para puntos Uruguay, puntos rival y defensas rivales.
- El PDF mantiene `expo-print` y `expo-sharing`.
- No se agregaron dependencias nuevas.

## Consequences

Beneficios:

- Mantiene el export offline-first.
- Es compatible con el enfoque HTML/PDF actual.
- Permite tests simples sobre HTML generado.
- Evita depender de captura visual o librerias pesadas.

Costos:

- No es un heatmap continuo real.
- La fidelidad visual debe validarse en PDF real en Expo Go.
- Si hay muchos puntos, puede requerir clustering mejorado en una iteracion futura.

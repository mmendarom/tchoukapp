# Plan: Court Map Landscape, Accuracy and Animations

Spec relacionada: `docs/specs/001-court-map-landscape-accuracy-animations.md`

## Objetivo

Implementar mejoras del mapa de cancha en pasos pequenos sin romper el flujo actual de registro de puntos.

## Pasos

1. Inspect current component and isolate coordinate math
   - Revisar `CourtMapInput`.
   - Identificar exactamente que rectangulo se usa para medir.
   - Evitar aplicar animaciones o transforms al mismo contenedor usado para medir.

2. Create pure coordinate helper functions
   - Crear helpers en `src/domain` o `src/utils`:
     - `tapToNormalizedLocation`
     - `normalizedLocationToPercentPosition`
     - `isValidCourtLayout`
   - Reusar `clampLocation` si alcanza.

3. Add tests for coordinate conversion
   - Cubrir esquinas y centro.
   - Cubrir coordenadas fuera de rango.
   - Cubrir layout invalido.
   - Cubrir precision despues de cambios de layout simulados.

4. Improve map layout and orientation responsiveness
   - Revisar `app.json` y decidir si cambiar `"orientation": "portrait"`.
   - Preferir no agregar dependencias.
   - Usar `useWindowDimensions`, `aspectRatio`, min/max height y layout responsive.
   - En landscape, dar prioridad visual al mapa.
   - En portrait, asegurar una altura minima comoda.

5. Fix tap handling
   - Intentar primero un solo `Pressable` con captura local confiable.
   - Si `locationX/locationY` no alcanza, medir rectangulo con `measureInWindow` y calcular desde `pageX/pageY`.
   - Ignorar taps hasta tener width/height validos.
   - Confirmar que el marcador renderiza usando el mismo rectangulo que captura.

6. Add minimal marker animations
   - Usar `Animated` de React Native o `LayoutAnimation`.
   - Animar escala/opacidad del marcador al seleccionar.
   - Agregar feedback breve de tap en el mapa si no afecta medicion.
   - No agregar Reanimated salvo nueva justificacion.

7. Update point recording flow only if needed
   - Mantener `Punto Uruguay` y `Punto rival` igual de rapidos.
   - No agregar nuevos campos obligatorios.
   - Mantener cancelacion sin guardar.

8. Update manual testing checklist
   - Agregar QA portrait/landscape.
   - Agregar QA de esquinas/centro.
   - Agregar QA de rotacion.
   - Agregar QA de resumenes.

9. Run validation commands
   - `npx tsc --noEmit`
   - `npm test`

## Riesgos / detenerse si

- Cambiar orientacion rompe navegacion o layout global.
- El mapa requiere dependencia nueva.
- El fix de coordenadas exige reestructurar el flujo de LiveMatch.
- Las animaciones afectan la precision del tap.

## Validacion manual minima

- Registrar punto Uruguay en centro.
- Registrar punto rival en cada esquina.
- Rotar dispositivo y repetir.
- Confirmar que el marcador queda donde se toca.
- Confirmar que undo y resumenes siguen correctos.

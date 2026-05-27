# Spec: Court Map Accuracy, Landscape Mode and Smooth Interactions

## Estado

Implemented

## Contexto

La app permite registrar puntos durante un partido en vivo y exige marcar la ubicacion donde cayo la pelota. El flujo actual usa `CourtMapInput` dentro de `LiveMatchScreen`.

Implementacion actual observada:

- `src/components/CourtMapInput.tsx` renderiza el mapa interactivo.
- `src/components/CourtMapSummary.tsx` renderiza mapas de resumen con puntos guardados.
- `src/screens/LiveMatchScreen.tsx` abre `CourtMapInput` cuando el usuario toca `Punto Uruguay` o `Punto rival`.
- El punto se confirma en `confirmPointLocation` y se guarda llamando a `recordEvent` con `landingLocation`.
- `landingLocation` usa coordenadas normalizadas `{ x: 0..1, y: 0..1 }`.
- `CourtMapInput` mide el mapa con `onLayout` y guarda `size`.
- El tap usa `event.nativeEvent.locationX` y `locationY`.
- El calculo actual es `x = locationX / size.width`, `y = locationY / size.height`, con clamp entre `0` y `1`.
- El marcador se renderiza con `left: "${x * 100}%"` y `top: "${y * 100}%"`.
- `CourtMapInput` esta dentro de `Screen`, y `Screen` usa `ScrollView` por defecto.
- El mapa actual tiene altura fija `220`.
- `app.json` tiene `"orientation": "portrait"`.
- No hay `expo-screen-orientation`, Reanimated ni libreria de charts instalada.
- Eventos viejos sin `landingLocation` se manejan en `CourtMapSummary` y `src/domain/court.ts` sin romper.

## Problema

El mapa de cancha funciona, pero tiene problemas de uso:

1. En telefono vertical queda chico para marcar con precision.
2. La precision del tap no siempre es confiable: el marcador puede aparecer desplazado o en una posicion inesperada.
3. La interaccion se siente brusca porque no hay animaciones ni feedback suave.

Posibles causas tecnicas de la imprecision:

- `locationX/locationY` se capturan en un `Pressable` que contiene hijos absolutos. En React Native, si el evento se origina sobre un hijo, `locationX/locationY` puede ser relativo al target nativo del evento y no necesariamente al contenedor esperado en todas las plataformas.
- El mapa esta dentro de un `ScrollView`; aunque `locationX/locationY` deberia ser local, el scroll puede afectar gestos, responder tarde o cancelar/transferir responders.
- El tamano inicial del mapa es `{ width: 1, height: 1 }`; un tap antes de que `onLayout` tenga medidas reales produciria coordenadas casi siempre clamped a `1`.
- La altura del mapa es fija (`220`), sin `aspectRatio` ni adaptacion a landscape.
- El borde del mapa (`borderWidth: 2`) y el area visual/touchable pueden generar una pequena diferencia entre el punto visual y el area medida.
- El marcador usa porcentajes sobre el contenedor y margenes negativos; si el contenedor medido no coincide exactamente con el contenedor visual, el marcador queda desplazado.
- Al rotar el dispositivo, `onLayout` debe recalcular medidas; hoy no hay logica explicita para ignorar taps durante cambios de layout.
- No hay helpers puros testeados para convertir `tap -> coordenada normalizada -> posicion visual`.
- No hay visualizacion debug para verificar esquinas/centro.

No se detecto:

- Uso de `pageX/pageY`.
- Uso de SVG o `viewBox`.
- Transformaciones sobre el contenedor principal del mapa, salvo el texto rotado dentro de las areas de marco.
- Escalado explicito del mapa por transform.

## Objetivos

- Hacer el mapa mas comodo en telefonos, especialmente en horizontal/landscape.
- Garantizar que el marcador aparezca exactamente donde el usuario toca.
- Mantener `{ x: 0..1, y: 0..1 }` como dato persistido.
- Usar un unico sistema de coordenadas para captura y render.
- Ignorar taps si las medidas del mapa no son validas.
- Recalcular medidas cuando cambie layout/orientacion.
- Agregar animaciones minimas para que la interaccion sea mas suave.
- Mantener el flujo de punto rapido.
- Mantener la app offline-first y sin nuevas dependencias salvo justificacion.

## No objetivos

- No redisenar todo el flujo de partido.
- No cambiar el modelo de scoring.
- No agregar backend, autenticacion, cloud sync ni servicios externos.
- No introducir heatmaps reales complejos en esta spec.
- No agregar una libreria pesada de graficos.
- No cambiar los resumenes tacticos mas alla de lo necesario para preservar compatibilidad.
- No implementar exportacion.

## Usuarios / Casos de uso

- Cuerpo tecnico de Uruguay registrando puntos durante un partido en vivo.
- Registro rapido de punto propio con jugador y ubicacion exacta de caida.
- Registro rapido de punto rival con ubicacion exacta de caida.
- Uso en telefono vertical cuando no hay tablet disponible.
- Uso en telefono horizontal cuando se necesita mas precision.
- Revision posterior en resumen de tiempo y resumen final.

## Flujo esperado

### Punto Uruguay

1. Tocar `Punto Uruguay`.
2. Seleccionar jugador si no esta seleccionado.
3. Abrir mapa de cancha.
4. Tocar la ubicacion exacta donde cayo la pelota.
5. Ver el marcador exactamente en ese punto.
6. Confirmar ubicacion.

### Punto rival

1. Tocar `Punto rival`.
2. Abrir mapa de cancha.
3. Tocar la ubicacion exacta donde cayo la pelota.
4. Ver el marcador exactamente en ese punto.
5. Confirmar ubicacion.

En ambos casos:

- `Cancelar` vuelve al partido sin guardar.
- La ubicacion sigue siendo obligatoria.
- Si no hay ubicacion, mostrar `Marca primero donde cayo la pelota.`

## Requisitos funcionales

### A. Landscape / horizontal usage

- El mapa debe ser usable en telefono vertical y mas comodo en horizontal.
- El layout del mapa debe responder a cambios de ancho/alto.
- No es obligatorio forzar toda la app a landscape.
- Preferir permitir rotacion y hacer el mapa responsive.
- Si se cambia `app.json` de `"orientation": "portrait"` a otra configuracion, documentar el cambio.
- Si se agrega `expo-screen-orientation`, justificarlo antes de implementar.
- Evitar dependencias nuevas si React Native/Expo config alcanza.

### B. Tap accuracy

- El marcador debe aparecer donde se toca.
- La captura y render deben usar el mismo rectangulo de referencia.
- Guardar coordenadas normalizadas `{ x: 0..1, y: 0..1 }`.
- Clamp de coordenadas entre `0` y `1`.
- Ignorar taps hasta tener medidas validas del mapa.
- Recalcular medidas en cada `onLayout`.
- Usar helpers puros para conversiones de coordenadas.
- Considerar `measureInWindow` o `onPressIn` con `pageX/pageY` menos el rectangulo medido si `locationX/locationY` sigue siendo inestable.
- Agregar modo debug opcional durante desarrollo si ayuda a verificar esquinas y centro.

### C. Minimal animations

- El marcador debe animar sutilmente al aparecer o cambiar.
- El boton de confirmar puede tener una transicion pequena de estado deshabilitado/habilitado.
- El mapa puede resaltar brevemente al tocar.
- Evitar dependencias pesadas.
- Preferir `Animated` o `LayoutAnimation` de React Native si alcanza.
- Si Reanimated estuviera instalado en el futuro, podria usarse, pero actualmente no esta instalado.

### D. UX flow

- Mantener el flujo rapido durante partido.
- No agregar campos obligatorios extra.
- Mantener textos visibles en espanol.
- Mantener cancelacion sin guardar.
- Mantener ubicacion obligatoria para puntos.

## Requisitos no funcionales

- TypeScript estricto.
- No romper tests existentes.
- No romper undo, cancelacion, timer, resumen de tiempo ni resumen final.
- Offline-first.
- Sin servicios externos.
- Performance fluida en telefono.
- UI usable con dedos, no solo con precision de mouse.

## Impacto en modelo de datos

No se espera cambiar el modelo persistido principal.

Se mantiene:

```ts
landingLocation?: { x: number; y: number }
```

Notas:

- Eventos viejos pueden no tener `landingLocation`.
- El dato persistido debe seguir siendo normalizado.
- No inferir ubicacion desde zona default del jugador.

## Impacto en UI

- `CourtMapInput` probablemente necesite layout responsive.
- Puede requerir un modo de pantalla mas ancho o fullscreen-like para seleccionar ubicacion.
- En portrait debe tener altura suficiente y no sentirse diminuto.
- En landscape debe usar ancho disponible y reducir texto/controles para dar prioridad al mapa.
- Botones `Confirmar ubicacion` y `Cancelar` deben seguir accesibles.
- El marcador debe tener feedback visual suave.

## Impacto en estado/persistencia

- No se esperan cambios de persistencia.
- `selectedLandingLocation` sigue siendo estado temporal de UI.
- `landingLocation` confirmado se guarda en el evento de punto.
- Cancelar no debe guardar evento.
- Undo debe seguir removiendo el evento completo.

## Testing plan

Tests unitarios:

- Helper `clampLocation`.
- Conversion `tapToNormalizedLocation`.
- Conversion `normalizedLocationToPercentPosition`.
- Ignorar taps cuando `width <= 0` o `height <= 0`.
- Esquinas:
  - top-left => `{ x: 0, y: 0 }`
  - top-right => `{ x: 1, y: 0 }`
  - bottom-left => `{ x: 0, y: 1 }`
  - bottom-right => `{ x: 1, y: 1 }`
  - center => `{ x: 0.5, y: 0.5 }`
- Eventos viejos sin `landingLocation` siguen sin romper resumenes.

Tests/manual QA:

- En telefono portrait, el mapa no queda diminuto.
- En telefono landscape, el mapa usa el ancho disponible.
- Tocar esquinas y centro coloca marcador correctamente.
- Rotar telefono y volver a tocar mantiene precision.
- Punto Uruguay guarda `landingLocation` exacta seleccionada.
- Punto rival guarda `landingLocation` exacta seleccionada.
- Undo remueve el punto y actualiza resumenes.
- Resumen de tiempo y resumen final siguen renderizando puntos viejos y nuevos.

## Riesgos

- Cambiar orientacion en Expo puede afectar toda la app si se modifica `app.json`.
- Usar `locationX/locationY` puede seguir siendo inconsistente segun plataforma si el target nativo es un hijo.
- Usar `measureInWindow` agrega complejidad y debe contemplar cambios de layout/orientacion.
- Animaciones pueden interferir con taps si se aplican al contenedor medido.
- Un mapa demasiado grande puede empujar acciones importantes muy abajo en portrait.

## Preguntas abiertas

- ¿Queremos permitir landscape en toda la app o solo mejorar el layout del mapa cuando el dispositivo ya este en horizontal?
- ¿Es aceptable cambiar `app.json` de `portrait` a una orientacion desbloqueada?
- ¿Se prefiere que el mapa se abra como panel inline actual o como pantalla/modal dedicada para mayor precision?
- ¿Hace falta un modo debug visible solo en desarrollo?
- ¿El staff necesita distinguir mitad ofensiva/defensiva o solo ubicacion de caida?

## Plan de implementación

Ver `docs/plans/001-court-map-landscape-accuracy-animations-plan.md`.

## Implementacion realizada

- `app.json` permite rotacion con `"orientation": "default"`.
- `CourtMapInput` usa un modal enfocado a pantalla completa para seleccionar la ubicacion.
- La captura del tap usa `pageX/pageY` menos el rectangulo medido de la cancha con `measureInWindow`.
- La ubicacion persistida sigue siendo normalizada `{ x: 0..1, y: 0..1 }`.
- El marcador se dibuja desde la ubicacion normalizada usando las mismas medidas reales de la cancha.
- Los taps se ignoran hasta tener medidas validas.
- Se agregaron animaciones sutiles para marcador, feedback de tap y boton de confirmacion.
- Se agrego overlay debug opcional detras de `__DEV__` y una constante local apagada por defecto.
- No se agregaron dependencias nuevas.

## Checklist de aceptación

- [x] En telefono portrait, el mapa es usable y no queda diminuto.
- [x] En telefono landscape, el mapa usa el ancho disponible y es comodo.
- [x] Tocar top-left coloca el marcador en top-left.
- [x] Tocar top-right coloca el marcador en top-right.
- [x] Tocar bottom-left coloca el marcador en bottom-left.
- [x] Tocar bottom-right coloca el marcador en bottom-right.
- [x] Tocar centro coloca el marcador en centro.
- [x] El marcador sigue correcto despues de rotar el telefono.
- [x] `landingLocation` grabada coincide con el marcador seleccionado.
- [x] `Punto Uruguay` mantiene jugador + ubicacion.
- [x] `Punto rival` mantiene ubicacion.
- [x] Cancelar vuelve sin guardar.
- [x] Sin ubicacion no permite confirmar.
- [x] Summary maps renderizan eventos nuevos y viejos sin crash.
- [x] No hay regresion en point recording, undo, period summary ni final summary.
- [x] `npm test` pasa.
- [x] `npx tsc --noEmit` pasa.

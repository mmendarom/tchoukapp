# Implementation Log

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

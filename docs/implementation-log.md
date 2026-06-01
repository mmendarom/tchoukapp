# Implementation Log

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

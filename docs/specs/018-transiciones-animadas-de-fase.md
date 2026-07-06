# Spec: Transiciones animadas de fase (3v3 y partido vs rival)

## Estado

Implemented

## Contexto

Pedido explícito de Mauro tras testeo en vivo: los cambios de fase (fin de mini partido en 3v3, fin de tiempo y arranque de un nuevo tiempo en el partido formal) hoy son cortes secos entre pantallas. Se quiere una transición animada, atractiva y fluida que marque el momento.

## Problema

1. En 3v3, al finalizar un mini partido hay que tocar "Iniciar próximo" a mano; el pasaje al siguiente cruce es seco y con fricción.
2. En el partido vs rival, al terminar un tiempo se salta al resumen sin ninguna marca visual del momento.
3. Al arrancar un nuevo tiempo tampoco hay marca visual: se vuelve al registro de golpe.

## Objetivos

- Overlay animado de fase, reutilizable, que anuncie el momento con marca visual (fondo navy, acento celeste) y luego dispare la acción.
- 3v3: "Finalizar mini partido" muestra la animación (ganador + próximo cruce) y **auto-inicia** el próximo mini partido sugerido, sin tocar "Iniciar próximo".
- Partido formal: fin de tiempo → animación (nombre del tiempo + marcador) → resumen del tiempo.
- Partido formal: inicio de nuevo tiempo → animación (nombre del tiempo nuevo) → registro en vivo. Aplica desde el resumen y desde el panel de entretiempo.

## No objetivos

- Cambiar reglas de partido, rotación de cola 3v3 ni scoring.
- Animaciones en otras pantallas (portada, listas, 7v7): fuera de alcance.
- Dependencias nuevas de animación (reanimated, lottie): se usa la API `Animated` incluida en React Native.

## Usuarios / Casos de uso

- Entrenador en vivo: termina el mini partido y la app anuncia ganador y próximo cruce mientras encadena sola el siguiente.
- Entrenador en partido real: cierra el tiempo y la app marca el momento antes del resumen; al volver, el nuevo tiempo arranca con su anuncio.

## Flujo esperado

1. **3v3**: tocar "Finalizar mini partido" → overlay ("Ganador: X" / "Ahora: A vs B") → al terminar la animación se auto-inicia el sugerido y se navega al nuevo mini partido. Si no hay sugerido (sesión sin cola posible), la animación muestra solo el ganador y se queda en la pantalla actual con la tarjeta de rotación como hasta ahora.
2. **Fin de tiempo**: tocar "Finalizar tiempo" → overlay ("Fin del 1er tiempo" + marcador) → resumen del tiempo.
3. **Nuevo tiempo**: tocar "Iniciar 2do tiempo" (resumen) o "Iniciar siguiente tiempo" (entretiempo) → overlay ("2do tiempo" / "¡A jugar!") → registro en vivo.
4. Tocar el overlay lo saltea (la acción se dispara igual, al instante).

## Requisitos funcionales

- Overlay a pantalla completa (Modal transparente) con secuencia entrada → pausa → salida (~2 s total) y callback `onFinished` exactamente una vez.
- Contenido tipado (`PhaseTransitionContent`: kicker, título, subtítulo, detalle) construido por funciones puras de dominio.
- El tap adelanta la salida sin duplicar el callback.

## Requisitos no funcionales

- Texto visible en español. Sin dependencias nuevas. 60 fps: solo `opacity`/`transform` con `useNativeDriver`.

## Impacto en modelo de datos

- Ninguno. No se persiste nada nuevo.

## Impacto en UI

- Nuevo `src/components/PhaseTransitionOverlay.tsx`.
- `LiveTrainingMiniMatchScreen`: overlay + auto-inicio del sugerido al finalizar.
- `LiveMatchScreen`: overlay en fin de tiempo y en "Iniciar siguiente tiempo" del entretiempo.
- `PeriodSummaryScreen`: overlay al iniciar el siguiente tiempo.

## Impacto en estado/persistencia

- Solo estado local de pantalla (contenido pendiente del overlay + acción diferida). Stores intactos.

## Testing plan

- Dominio: builders de contenido (ganador y cruce en 3v3, con y sin sugerido; fin de tiempo con marcador; inicio de tiempo 2/3).
- Source-check (patrón existente en `trainingLive.test.ts`): las pantallas usan el overlay y el 3v3 ya no exige tocar "Iniciar próximo" tras finalizar.

## Riesgos

- Duración fija puede sentirse larga en uso repetido: mitigado con tap para saltear.
- El auto-inicio en 3v3 cambia un hábito; la tarjeta "Rotación" sigue existiendo para los casos sin sugerido.

## Preguntas abiertas

- Ninguna.

## Plan de implementación

Ver `docs/plans/018-transiciones-animadas-de-fase-plan.md`.

## Checklist de aceptación

- [x] Overlay reutilizable con entrada/pausa/salida y tap para saltear.
- [x] 3v3 encadena el próximo mini partido automáticamente tras la animación.
- [x] Fin de tiempo y nuevo tiempo animados en el partido formal.
- [x] `npx tsc --noEmit` y `npm test` en verde.

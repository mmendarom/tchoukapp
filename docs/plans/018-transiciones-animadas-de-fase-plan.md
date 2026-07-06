# Plan 018 - Transiciones animadas de fase

Derivado de `docs/specs/018-transiciones-animadas-de-fase.md`.

## Stage 1 - Dominio

- `src/domain/phaseTransition.ts`: tipo `PhaseTransitionContent` y builders puros:
  - `buildMiniMatchEndTransition(winnerName, nextMatchupLabel?)`;
  - `buildPeriodEndTransition(periodNumber, ownTeamName, ownScore, opponentName, opponentScore)`;
  - `buildPeriodStartTransition(periodNumber)`.
- Tests en `src/domain/phaseTransition.test.ts`.

## Stage 2 - Componente

- `src/components/PhaseTransitionOverlay.tsx`: Modal transparente + `Animated` nativo (`useNativeDriver`). Secuencia: fade/scale de entrada con spring + barrido del acento, pausa, salida; `onFinished` una sola vez; tap adelanta la salida. Paleta desde `src/utils/theme.ts`.

## Stage 3 - Cableado

- `LiveTrainingMiniMatchScreen`: `handleFinishMiniMatch` finaliza, arma el contenido (ganador + sugerido) y muestra el overlay; `onFinished` llama `startSuggestedNextMiniMatch` y navega al nuevo mini partido (o queda en pantalla si no hay sugerido).
- `LiveMatchScreen`: `finishPeriod` muestra overlay de fin de tiempo y navega al resumen en `onFinished`; el botón de entretiempo "Iniciar siguiente tiempo" avanza el período y muestra el overlay de inicio.
- `PeriodSummaryScreen`: "Iniciar siguiente tiempo" avanza, muestra overlay y navega a `LiveMatch` en `onFinished`.

## Stage 4 - Tests y docs

- Tests de dominio + source-checks del cableado.
- `docs/implementation-log.md`.
- `npx tsc --noEmit` + `npm test`.

## Riesgos

- Doble disparo del callback si el usuario tocá justo al terminar: el componente usa un flag interno para garantizar un solo `onFinished`.

# Spec: Defense and Error Tracking

## Estado

Implemented

## Contexto

Field testing during a real tchoukball practice showed that the current MVP needs better live defensive and error tracking.

Current implementation observed:

- Match events are modeled in `src/domain/types.ts` as `PointEvent | ErrorEvent | SubstitutionEvent`.
- Points require explicit `landingLocation` from the court map.
- Errors currently use a broad legacy `ErrorType` union: `missed-frame`, `forbidden-zone`, `bad-rebound`, `dropped-ball`, `third-pass`, `turnover`, `defensive-block`, `other`.
- `LiveMatchScreen` has a single fast `Error propio` button that records `type: 'fault'`.
- `recordEvent` maps live action types into point or error events.
- Period and final summaries count total errors by player through domain functions in `src/domain/periodStats.ts`.
- Dashboard stats count errors by player through `src/domain/stats.ts`.
- Undo removes the latest event from the event stream.
- Old events may exist in local persisted storage and must not break summaries.

## Problema

The coaching staff needs to track two field-tested needs:

1. Defensive actions by Uruguay players.
2. More specific error categories.

The current app does not have a `Defensa` event. Error tracking is too generic and can show old labels that are not useful during practice review.

## Objetivos

- Add a new trackable event: `Defensa`.
- Track which Uruguay player made each defense.
- Do not track court location for defenses.
- Keep defense recording quick during live matches.
- Count defenses by player.
- Show defense stats in period summaries and final summaries.
- Restrict new error type choices to exactly:
  - `Falta`
  - `Punto en contra`
- Track who made the error.
- Track error type.
- Count faltas by player.
- Count puntos en contra by player.
- Count total errors by player.
- Show error breakdowns in period summaries and final summaries.
- Avoid old or generic error labels in new UI flows.
- Handle old error events safely if they exist.
- `Punto en contra` must automatically add one point to the rival.
- `Punto en contra` must not require or store `landingLocation`; keeping that location does not add long-term coaching value for this event.
- Defense and error events must only be recorded for Uruguay players currently on court.
- Preserve undo, cancel, timer, summaries, and point/court-map flow.

## No objetivos

- No backend, auth, cloud sync, paid services, or new external services.
- No changes to normal point scoring or point `landingLocation`.
- No court location capture for defenses.
- No redesign of the whole live match screen.
- No restriction based on player preferred position.
- No migration that deletes old local data.

## Usuarios / Casos de uso

- Uruguay coaching staff recording a live match.
- A coach taps `Defensa`, selects the player, and saves the event quickly.
- A coach taps `Error`, selects the player, selects `Falta` or `Punto en contra`, and saves the event.
- During period break, staff reviews defense and error counts by player.
- After the match, staff reviews total defenses, faltas, puntos en contra, and total errors.

## Flujo esperado

### Defensa

1. Tap `Defensa`.
2. Select player.
3. Save event.

Rules:

- Player is required.
- Player must be currently on court.
- Location is not requested.
- Event is recorded only during a live period.
- Undo removes the defense event.

### Error

1. Tap `Error`.
2. Select player.
3. Select error type:
   - `Falta`
   - `Punto en contra`
4. Save event.

Rules:

- Player is required.
- Player must be currently on court.
- Error type is required.
- Location is not requested.
- Event is recorded only during a live period.
- `Punto en contra` automatically adds one point to the rival.
- `Punto en contra` does not require court-map location.
- Undo removes the error event.

## Requisitos funcionales

- Add a defense event kind or equivalent event model that can represent a defense by player.
- Add domain stats for defenses by player.
- Add domain stats for errors by player and type.
- Preserve total errors by player for existing summary cards.
- New error UI must expose only `Falta` and `Punto en contra`.
- New error labels must not show old labels such as `No toca el marco`, `Rebote invalido`, `Perdida`, or `Error propio` for newly recorded errors.
- Period summary must show:
  - Defensas by player.
  - Faltas by player.
  - Puntos en contra by player.
  - Total errors by player.
- Final summary must show the same totals for the whole match.
- Dashboard/latest actions should label `Defensa`, `Falta`, and `Punto en contra` clearly.
- Legacy error events must not crash stats or labels.
- Legacy error events may be grouped under a safe fallback label such as `Error anterior` in compatibility-only contexts.
- `Punto en contra` error events must set score semantics explicitly so the rival gets one point and score is not double counted.
- `Falta` does not automatically add a point unless a future approved spec changes that rule.
- Defenses and errors should use the current on-court lineup as the eligible player list.

## Requisitos no funcionales

- Offline-first.
- TypeScript strict.
- Keep visible UI text in Spanish.
- Preserve local persistence.
- Keep recording fast on phone and tablet.
- Avoid unnecessary dependencies.
- Keep domain calculations in `src/domain`.
- Keep state changes in `src/store`.

## Impacto en modelo de datos

Expected model changes:

- Add a defense event, likely:

```ts
type DefenseEvent = BaseMatchEvent & {
  kind: 'defense';
  team: 'uruguay';
  playerId: string;
};
```

- Update `MatchEvent` to include the defense event.
- Replace or narrow new error recording to:

```ts
type NewErrorType = 'falta' | 'punto_en_contra';
```

- Decide whether to keep legacy `ErrorType` values in the type as a compatibility union or represent them separately.
- Persisted old error events must remain readable.
- Defenses do not use `landingLocation`.
- `Punto en contra` does not use `landingLocation` and should award the point through event score semantics, likely `pointAwardedTo: 'opponent'`.
- `Falta` should not set `pointAwardedTo` by default.
- Point `landingLocation` remains the source of truth for point location.

## Impacto en UI

- `LiveMatchScreen` needs a fast `Defensa` action.
- `LiveMatchScreen` needs an error flow that requires player plus one of `Falta` or `Punto en contra`.
- Defense is now a one-tap action that uses the selected on-court player and shows short in-app feedback.
- Error recording now uses the selected on-court player and opens a focused modal only to choose `Falta` or `Punto en contra`.
- `Punto en contra` in the modal shows helper text explaining that it adds `+1` to the rival.
- Duplicated player selection was removed from the Defense/Error quick flows.
- Player selection for `Defensa` and `Error` must be limited to current on-court players.
- The flow should avoid adding slow steps for point recording.
- Latest actions should display:
  - `Defensa - [jugador]`
  - `Falta - [jugador]`
  - `Punto en contra - [jugador]`
- Period summary and final summary need compact, readable sections for defenses and error breakdown.
- Empty states should remain clear in Spanish.

## Impacto en estado/persistencia

- Events remain the source of truth for derived stats.
- Store action signatures likely need to support recording defense and typed errors.
- Undo should work by removing the latest event.
- Cancel match behavior should remain unchanged.
- Persisted matches with old error events should normalize safely.
- No derived defense/error totals should be persisted as independent source of truth.

## Testing plan

Unit/domain tests:

- Defense events are counted by player.
- Defense stats can be filtered by period.
- Error stats count `falta` by player.
- Error stats count `punto_en_contra` by player.
- Total errors by player includes both new error types.
- Legacy error events do not crash and are handled with safe fallback behavior.
- Score calculation includes `punto_en_contra` as exactly one point for the rival and that rule is tested.

Store tests:

- `recordDefense` or equivalent records a defense only during a live period.
- Defense requires player.
- Defense rejects or prevents bench players.
- Typed error recording requires player and type.
- Typed error recording rejects or prevents bench players.
- Undo after defense removes defense stats.
- Undo after typed error removes error stats.
- `Punto en contra` increments rival score and undo removes that rival point.
- `Punto en contra` can be saved without `landingLocation`.
- Old event normalization remains safe.

Manual QA:

- Start match and period.
- Record `Defensa`.
- Record `Falta`.
- Record `Punto en contra`.
- Undo each new event type.
- Finish period and verify period summary.
- Finish match and verify final summary.
- Confirm point recording and court map still work.
- Confirm timer, cancel, and substitutions still work.

## Riesgos

- Adding an event kind touches shared unions and labels.
- Changing error types can break old persisted events if compatibility is not explicit.
- `Punto en contra` may be double counted if score semantics are not centralized and tested.
- Adding buttons or modals can slow live recording if the flow is too heavy.
- Summary screens can become crowded on phone.

## Preguntas abiertas

- Should period/final summaries show top 3 players or all players with nonzero totals?
- How should legacy errors be displayed in final summaries: hidden, grouped as `Error anterior`, or mapped to one of the new types?

## Plan de implementacion

See `docs/plans/002-defense-and-error-tracking-plan.md`.

## Checklist de aceptacion

- [x] `Defensa` can be recorded during a live period.
- [x] `Defensa` requires a player.
- [x] `Defensa` only allows players currently on court.
- [x] Defenses do not request or store court location.
- [x] Defenses are counted by player.
- [x] `Error` requires player and type.
- [x] `Error` only allows players currently on court.
- [x] New error type choices are exactly `Falta` and `Punto en contra`.
- [x] `Punto en contra` automatically adds one point to the rival.
- [x] `Punto en contra` does not require or store `landingLocation`.
- [x] Undo after `Punto en contra` removes the rival point.
- [x] Faltas are counted by player.
- [x] Puntos en contra are counted by player.
- [x] Total errors are counted by player.
- [x] Period summaries show defense and error breakdown stats.
- [x] Final summaries show defense and error breakdown stats.
- [x] Latest actions show clear Spanish labels.
- [x] Undo works for defense and new error events.
- [x] Old error events do not crash stats or summaries.
- [x] Point recording, `landingLocation`, court map, timer, cancel, substitutions, period summaries, and final summaries still work.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.

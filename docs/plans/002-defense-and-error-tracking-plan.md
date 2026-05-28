# Plan: Defense and Error Tracking

Spec relacionada: `docs/specs/002-defense-and-error-tracking.md`

## Objetivo

Implement defense tracking and clearer typed error tracking in small, safe steps while preserving the stable live match flow.

## Stage 0 - Lock scoring and eligibility rules

- Implement `Punto en contra` as an error event that automatically awards one point to the rival.
- Do not ask for or store `landingLocation` for `Punto en contra`.
- Limit `Defensa` and `Error` player selection to current on-court Uruguay players.
- Keep preferred position as metadata only.

## Stage 1 - Update event types

- Add a `DefenseEvent` to `src/domain/types.ts`.
- Add or narrow new error types to `falta` and `punto_en_contra`.
- Ensure `punto_en_contra` can represent score impact, likely with `pointAwardedTo: 'opponent'`.
- Ensure `falta` does not award a point by default.
- Keep legacy error values readable for old persisted events.
- Update event labels in `src/utils/labels.ts`.
- Ensure new visible labels are Spanish.

## Stage 2 - Add domain/stat functions

- Add pure functions in `src/domain/stats.ts` and `src/domain/periodStats.ts`:
  - defenses by player.
  - defenses by player by period.
  - errors by player and type.
  - errors by player and type by period.
  - total errors by player using new and legacy-safe events.
- Keep event stream as source of truth.
- Avoid derived persisted totals.

## Stage 3 - Update store actions

- Extend `useMatchStore` with focused actions or a safer `recordEvent` input:
  - record defense.
  - record typed error.
- Keep validation inside store:
  - live period required.
  - player required for defense/error.
  - selected player must be in the current Uruguay lineup for defense/error.
  - error type required for error.
  - `punto_en_contra` awards one point to the rival.
  - no `landingLocation` required for defense/error.
- Preserve undo behavior.
- Preserve cancel/reset behavior.

## Stage 4 - Update live match UI

- Add a fast `Defensa` action.
- Replace generic `Error propio` with an `Error` flow:
  - select on-court player.
  - select `Falta` or `Punto en contra`.
  - save event.
- Keep point recording untouched.
- Keep the court map flow untouched.
- Make the UI fit phone and tablet.

## Stage 5 - Update latest actions and dashboard

- Update latest action descriptions for defense and typed errors.
- Add defense stats where useful.
- Replace generic old error displays with the new Spanish labels for new events.
- Use safe fallback labels for legacy error events.

## Stage 6 - Update period summary

- Add defenses by player for the period.
- Add faltas by player for the period.
- Add puntos en contra by player for the period.
- Keep total errors by player.
- Keep existing scoring, zones, maps, insights, and substitutions.

## Stage 7 - Update final summary

- Add total defenses by player.
- Add total faltas by player.
- Add total puntos en contra by player.
- Keep total errors by player.
- Keep maps, scoring, notes, and export placeholder.

## Stage 8 - Update insights if useful

- Consider whether typed errors should improve existing error insights.
- Do not add noisy tactical insights unless they help coaching decisions.
- Keep old insight behavior stable if no clear value is added.

## Stage 9 - Add/update tests

- Add domain tests for defense stats and typed error stats.
- Add score tests proving `Punto en contra` increments the rival score.
- Add undo tests proving undo removes the rival point from `Punto en contra`.
- Add tests proving `Defensa` and `Error` cannot be recorded for bench players.
- Add legacy error safety tests.
- Add store tests for record defense, record typed error, and undo.
- Update summary-related tests if helper output changes.
- Keep timer and point-location tests passing.

## Stage 10 - Update docs

- Update the spec to `Implemented` after validation.
- Update `docs/implementation-log.md`.
- Add a decision record if the scoring semantics need more future context than the spec provides.

## Validation

- `npm test`
- `npx tsc --noEmit`

## Riesgos / detenerse si

- `Punto en contra` risks double counting score.
- On-court eligibility is hard to validate safely from the current lineup.
- Legacy error events become unrenderable.
- Live match UI becomes slower than the current one-tap error flow.
- Summary cards become too crowded on phone.

# Plan: Visual Lineup Substitutions

Spec relacionada: `docs/specs/003-visual-lineup-substitutions.md`

## Objetivo

Improve substitutions with a visual lineup while preserving the current event model, lineup snapshots, undo, and live match speed.

## Recommendation

Stage 1 shipped first. Drag/drop was attempted, but real-phone Expo Go testing showed unreliable taps and dragging. For the field-test MVP, use reliable change mode: select one court player, select one bench player, then confirm.

## Stage 1 - Visual court lineup and tap-to-swap

### 1. Confirm slot assumptions

- Treat the current lineup `playerIds` array as 7 visual slots because existing initial lineups use 7 players.
- Keep slots neutral and unnamed for now.
- Do not introduce tactical restrictions.
- Do not infer or enforce preferred position.
- Do not add tactical slot names in Stage 1.

### 2. Create visual lineup UI

- Add a reusable component in `src/components`, likely `LineupCourt`.
- Render a small court with 7 stable slot positions.
- Render slots as neutral court positions, not named roles.
- Render player avatar cards with:
  - initials.
  - jersey number if useful.
  - first/last name.
- Keep touch targets comfortable.
- Keep UI text in Spanish.

### 3. Add bench list UI

- Keep bench players separate from court players.
- Render compact player cards.
- Show selected bench player clearly.
- Preferred position may be shown as metadata only if space allows.

### 4. Implement tap-to-swap flow

- Tap on-court player/slot to select outgoing player.
- Tap bench player to select incoming player.
- Tap `Cambio` to record the swap, or use a clearly approved immediate-swap flow.
- Reuse current `substitutePlayer({ playerOutId, playerInId })` if no data model change is needed.
- Keep old list flow available only if useful during transition.

### 5. Preserve event and summary compatibility

- Continue creating `SubstitutionEvent` with `playerOutId`, `playerInId`, and `lineupSnapshotId`.
- Continue creating a new `LineupSnapshot`.
- Keep `getCurrentLineup`, plus/minus, period summary, final summary, and dashboard compatible.

### 6. Add tests

- Store test: substitution creates event and lineup snapshot.
- Store test: undo after substitution removes event and snapshot.
- Helper/component-adjacent test if slot derivation is extracted:
  - 7 slots from lineup.
  - replacement preserves lineup length.
  - any player can enter any slot.
- Regression test that `usualPlayingZone` does not restrict substitutions.

### 7. Manual QA

- Start match and period.
- Verify visual court and bench list on phone portrait.
- Verify visual court and bench list on phone landscape.
- Verify tablet layout.
- Record a substitution.
- Undo substitution.
- Confirm point recording and court map still work.
- Confirm timer and cancel match still work.

### 8. Docs

- Update spec to `Implemented` after validation.
- Update `docs/implementation-log.md`.
- Add a decision record only if explicit slot metadata is introduced.

## Stage 2 - Reliable change mode

Status: implemented as a stability fix.

- Disable drag/drop for now because it was unreliable during real phone testing.
- Keep Cancha/Banco as the lower substitution workspace.
- Add `Cambiar jugadores` / `Cancelar cambio` / `Confirmar cambio` controls near Cancha/Banco.
- Require explicit selection of one player in cancha and one player from banco.
- Keep confirmation button disabled until both selections exist.
- Reuse current `substitutePlayer` behavior and existing substitution event/snapshot compatibility.
- Use a neutral left-to-right 3 - 1 - 3 visual layout for the 7 slots:
  - 3 players on the left side.
  - 1 player in the center.
  - 3 players on the right side.
- Avoid nested bench scrolling that can swallow taps in Expo Go/Android; let the live screen scroll.
- Clear quick-action selected player if that player is substituted out.
- Keep drag/drop as future Stage 3 only after a safer real-device gesture approach is validated.

## Future Stage 3 - Drag/drop, animations, and optional photos

- Re-evaluate gestures only after the reliable button flow is field-tested.
- Avoid new dependencies unless justified in an approved spec/decision.
- Keep button-based mode as fallback.
- Consider optional player photos later; do not require them now.

## Validation

- `npm test`
- `npx tsc --noEmit`

## Riesgos / detenerse si

- Slot mapping implies unvalidated tactical meaning.
- Adding tactical slot names too early implies unvalidated tactical meaning.
- Visual lineup makes the live match screen too crowded.
- Tap targets become too small on phone.
- Drag/drop requires a dependency or conflicts with scroll/safe areas.
- Undo or lineup snapshot compatibility becomes unclear.

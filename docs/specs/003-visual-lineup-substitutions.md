# Spec: Visual Lineup Substitutions

## Estado

Reliable change mode implemented

## Implementacion Stage 1

- Se implemento una cancha visual de cambios con 7 slots neutrales derivados del orden de `playerIds`.
- Se agrego una lista separada de banco/suplentes con iniciales, nombre y numero.
- El flujo inicial fue tap-to-swap con popup/modal; luego se reemplazo por Cancha/Banco directo.
- Cada cambio sigue creando un evento de sustitucion y un nuevo `LineupSnapshot`.
- Drag/drop fue probado en Stage 2 y luego diferido por confiabilidad en telefono.
- Las fotos de jugadores, upload de imagenes y slots tacticos quedan fuera de Stage 1.
- La posicion habitual del jugador sigue siendo metadata solamente y no restringe la ubicacion en cancha.

## Implementacion Stage 2 UX refinement

- Se compacto el layout de `LineupCourt` para evitar solapamiento de tarjetas en telefono.
- `Cambio` dejo de vivir en el grid superior de acciones rapidas.
- La zona `Cancha` / `Banco` es ahora el espacio principal para cambios.
- Se elimino el flujo popup/modal para registrar cambios.
- Se agrego drag/drop desde `Banco` hacia un slot neutral de `Cancha` usando `PanResponder` y `Animated` de React Native, sin dependencia nueva.
- Se mantiene fallback tap-to-swap: tocar suplente, luego tocar slot en cancha.
- Al soltar sobre un slot, entra el suplente, sale el jugador actual, se registra el evento de sustitucion y se crea un nuevo `LineupSnapshot`.
- Si el jugador seleccionado para acciones rapidas sale de cancha, la seleccion pasa al jugador entrante para evitar estado obsoleto.

## Implementacion stability fix

- El drag/drop se desactivo para el MVP de campo porque no fue confiable en pruebas reales con Expo Go en telefono.
- El cambio se realiza con un flujo explicito: `Cambiar jugadores`, seleccionar jugador en cancha, seleccionar jugador del banco y `Confirmar cambio`.
- El banco vuelve a usar taps simples y scroll normal, sin `PanResponder`.
- La cancha mantiene 7 slots neutrales y ahora se distribuye visualmente como 3 izquierda - 1 centro - 3 derecha.
- No hay cambio de modelo de datos: se conserva `LineupSnapshot.playerIds` como fuente de orden/slots.
- Si el jugador seleccionado para acciones rapidas sale de cancha, se limpia la seleccion para evitar Defensa/Error sobre un jugador suplente.

## Implementacion bench selection + 3-1-3 correction

- Se corrigio la seleccion del banco removiendo el `ScrollView` anidado de `BenchList`; el scroll queda a cargo de la pantalla principal para no interferir con taps en Expo Go/Android.
- `Confirmar cambio` se habilita cuando hay un slot de cancha seleccionado y un suplente seleccionado.
- La distribucion 3 - 1 - 3 se corrigio como lectura izquierda-centro-derecha:
  - slots 1, 2 y 3 en el tercio izquierdo.
  - slot 4 en el centro.
  - slots 5, 6 y 7 en el tercio derecho.
- No se reintrodujo drag/drop ni `PanResponder`.

## Implementacion court swap refinement

- En modo `Cambiar jugadores`, ahora se puede seleccionar dos jugadores que ya estan en cancha e intercambiar sus slots.
- El intercambio no mueve jugadores al banco ni trae suplentes.
- Se registra un evento explicito `lineup_swap` con `playerAId`, `playerBId`, `fromSlotIndex`, `toSlotIndex` y `lineupSnapshotId`.
- El intercambio crea un nuevo `LineupSnapshot`.
- Deshacer remueve el evento `lineup_swap` y el snapshot creado, restaurando la formacion anterior.
- El flujo existente cancha + banco sigue registrando `substitution`.
- No se agregaron restricciones tacticas ni drag/drop.

## Implementacion tablet field refinement

- En pantalla live, el banco queda oculto por defecto para limpiar el viewport de seguimiento normal.
- `Cambiar jugadores` sigue viviendo junto a la cancha y activa el modo cambio.
- Al activar modo cambio se muestra `Banco`, se selecciona jugador en cancha + suplente o dos jugadores en cancha, y se confirma igual que antes.
- Al cancelar o confirmar, el modo cambio se cierra y el banco vuelve a colapsar.
- En tablet landscape la columna de acciones recibe mas ancho relativo para que resultado, acciones y cancha convivan mejor.
- No se cambio el modelo de datos, eventos, undo ni reglas de sustitucion.

## Contexto

Field testing showed that the current substitution flow works but is not visual enough for live match use.

Current implementation observed:

- `LineupSnapshot` stores `playerIds: string[]` with no explicit court position slots.
- Initial lineups use 7 Uruguay players in `src/domain/mockData.ts` and `createDemoMatch`.
- `getCurrentLineup` returns the latest lineup snapshot for Uruguay.
- `LiveMatchScreen` derives:
  - `onCourtPlayers` from current lineup `playerIds`.
  - `benchPlayers` from players not in the current lineup.
- Current substitution flow:
  - Tap an on-court player to set `subOutId`.
  - Tap a bench player to set `subInId`.
  - Tap `Cambio`.
- `substitutePlayer` replaces `playerOutId` with `playerInId` inside the current `playerIds` array.
- A substitution event logs `playerOutId`, `playerInId`, and the new `lineupSnapshotId`.
- Undo after substitution removes the substitution event and the created lineup snapshot.
- Player `usualPlayingZone` exists as metadata only and must not restrict where players can play.

## Problema

During practice, staff needs to understand the current lineup visually. The current list-based substitution flow does not show players positioned on a court and makes it harder to reason about who is occupying each area.

Drag and drop could feel natural, but it may add gesture risk on phones, interact poorly with scroll/tap layers, and slow live recording if introduced too early.

## Objetivos

- Show a small court with current Uruguay players positioned on it.
- Represent each player with a small avatar/card using initials and player name.
- Show bench players separately.
- Implement Stage 1 as tap-to-swap.
- Record the existing substitution event when a swap is confirmed.
- Keep all players eligible for any position.
- Keep preferred position as metadata only.
- Preserve undo, cancel, timer, point recording, court map, period summaries, and final summaries.
- Keep the UI usable on phone and tablet.

## No objetivos

- No heavy gesture dependency for drag/drop.
- No real player photos now.
- No backend, auth, cloud sync, paid services, or remote roster storage.
- No restrictions based on preferred position.
- No complete tactical formation engine.
- No changes to point `landingLocation`.

## Usuarios / Casos de uso

- Uruguay coaching staff checking the current lineup during live play.
- Staff taps a player on the visual court, taps a bench player, and records a substitution.
- Staff reviews the current lineup without reading a dense list.
- Staff can place any bench player into any current slot regardless of preferred position.

## Flujo esperado

### Stage 1: tap-to-swap

1. See current players on a small court.
2. See bench players in a separate list.
3. Tap an on-court player/slot.
4. Tap a bench player.
5. Tap `Cambio` or confirm the swap.
6. Store a substitution event using current compatibility fields.

Rules:

- Selected on-court slot is required.
- Selected bench player is required.
- Player preferred position does not block selection.
- The player entering replaces the player currently in that slot.
- Undo restores the previous lineup by removing the latest lineup snapshot.

### Stage 2: reliable change mode

1. Tap `Cambiar jugadores`.
2. Select one player currently in cancha.
3. Select one bench player.
4. Tap `Confirmar cambio`.
5. Automatically swap the selected bench player into the selected court slot.

Drag/drop returns to future work only after a safer gesture approach is validated on real devices.

## Requisitos funcionales

- Add a visual lineup court component or section.
- Show 7 current court slots based on the current app assumption that lineups contain 7 player IDs.
- Keep the 7 slots neutral for now; do not name them as tactical positions.
- Use initials plus first/last name for player avatar cards.
- Show bench list separately.
- Implement explicit change mode with selection and confirmation.
- Keep drag/drop deferred until it is reliable on real phones.
- Continue recording substitution events with `playerOutId`, `playerInId`, and `lineupSnapshotId`.
- Preserve current substitution compatibility for summaries and plus/minus.
- Keep all players available for all slots.
- Preferred position can be displayed as metadata if useful, but cannot restrict substitutions.
- Empty or legacy lineups without slot metadata must still render safely.

## Requisitos no funcionales

- Offline-first.
- TypeScript strict.
- No unnecessary dependencies in Stage 1.
- Keep touch targets comfortable on phone and tablet.
- Respect safe areas and native system bars.
- Keep visible UI text in Spanish.
- Keep substitution recording fast during a live match.

## Impacto en modelo de datos

Current lineup model:

```ts
type LineupSnapshot = {
  id: string;
  matchId: string;
  team: TeamSide;
  playerIds: string[];
  capturedAt: string;
  clock: MatchClock;
};
```

There are no explicit court position slots today.

Stage 1 options:

- Preferred safe option: keep `playerIds` as the persisted source of lineup order and derive 7 visual slots from array index.
- Optional future enhancement: add explicit slot metadata only if field testing proves the app needs named tactical positions.

Because current lineups store 7 players, Stage 1 should represent 7 slots. These slots must be neutral visual positions, not named tactical roles and not restrictions.

Compatibility:

- Existing `SubstitutionEvent` can remain compatible.
- Existing lineup snapshots without slot metadata can render from `playerIds`.
- If slot metadata is introduced later, old snapshots must still render.

## Impacto en UI

- Replace or augment the current `Jugador en cancha` list with a small court lineup.
- Court should show 7 stable player cards with initials and name.
- Bench list remains separate.
- Selection state should clearly show:
  - selected court player/slot.
  - selected bench player.
  - pending swap.
- `Cambio` should be associated with the lower Cancha/Banco workspace, not the top quick action grid.
- Substitution should not require a modal when Cancha/Banco is already visible.
- Layout must work on phone portrait, phone landscape, and tablet.
- Visual layers must not break tap accuracy for the point court map.

## Impacto en estado/persistencia

- The refinement reuses current `substitutePlayer` behavior.
- No need to persist derived UI selection state.
- Event stream and lineup snapshots remain the source of truth.
- Undo behavior should remain unchanged.
- Cancel/reset behavior should remain unchanged.
- If future explicit slots are introduced, migration/normalization must preserve old snapshots.

## Testing plan

Unit/domain tests:

- `getCurrentLineup` still returns the latest snapshot.
- Tap-to-swap helper, if extracted, replaces the selected slot/player and preserves lineup length.
- Any player can enter any slot regardless of `usualPlayingZone`.
- Legacy lineup snapshots with only `playerIds` render or derive slots safely.

Store tests:

- Substitution creates a new lineup snapshot.
- Substitution event references the new snapshot.
- Undo after substitution removes the event and snapshot.
- Substitution cannot happen outside a live period.

Manual QA:

- Start match and period.
- Verify 7 current players on the visual court.
- Verify bench list.
- Tap `Cambiar jugadores`.
- Select one player in cancha.
- Select one player from banco.
- Verify the bench player highlight appears and `Confirmar cambio` becomes enabled.
- Tap `Confirmar cambio`.
- Verify the players swap visually.
- Start change mode and cancel; verify no lineup change.
- Undo and verify previous lineup returns.
- Rotate phone and verify touch targets and layout.
- Confirm point recording/court map still works.
- Confirm Android navigation bars do not block the lower substitution area.

## Riesgos

- Introducing named slots too early may imply tactical restrictions the product does not yet validate.
- Drag/drop can conflict with scrolling and safe areas, so it is deferred for now.
- Drag/drop can be hard to use under field pressure and needs real-device QA.
- Visual lineup can crowd the live match screen on small phones.
- If lineup order is treated as tactical truth without validation, summaries may mislead staff.

## Preguntas abiertas

- Is the current `playerIds` order meaningful enough to map to visual slots?
- Should the user be able to reorder two on-court players without recording a substitution?
- Should substitutions require confirmation, or should tapping a bench player after selecting a court slot immediately record the swap?
- Should the bench show jersey number, initials, full name, and preferred zone metadata?

## Plan de implementacion

See `docs/plans/003-visual-lineup-substitutions-plan.md`.

## Checklist de aceptacion

- [x] Current lineup is shown on a small court.
- [x] 7 current players are represented from the current app lineup assumption.
- [x] Slots are neutral and unnamed for now.
- [x] Player cards show initials and name.
- [x] Bench players are shown separately.
- [x] Tap-to-swap works in Stage 1.
- [x] Substitution event is recorded.
- [x] New lineup snapshot is created.
- [x] Undo after substitution restores the previous lineup.
- [x] All players can play any position.
- [x] Preferred position remains metadata only.
- [x] No real photos are required.
- [x] Drag/drop is deferred after unreliable phone testing.
- [x] Reliable button-based change mode is available.
- [x] Court layout uses a neutral left-to-right 3 - 1 - 3 distribution.
- [x] Existing summaries and plus/minus remain compatible.
- [x] Point recording, court map, timer, undo, cancel, period summaries, and final summaries still work.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.

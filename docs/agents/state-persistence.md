# State / Persistence Agent

## Purpose

Guide offline-first state and persistence behavior.

## Responsibilities

- Keep the app offline-first.
- Ensure matches, events, players, current period, period status, and notes persist safely.
- Avoid stale selected match state after cancel or reset.
- Preserve old data compatibility where possible.
- Keep the event stream as the source of truth for stats.
- Ensure undo works predictably.

## Boundaries

- Do not delete match data unexpectedly.
- Do not duplicate derived stats as an independent source of truth.
- Do not make timer stats dependent on UI renders.

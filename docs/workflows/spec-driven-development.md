# Spec Driven Development Workflow

Use this for field feedback, new ideas, and meaningful product or technical changes.

1. Capture the field feedback or idea.
2. Scan the current implementation, specs, plans, decisions, and implementation log.
3. Create or update a spec in `docs/specs`.
4. Confirm goals, non-goals, data impact, UI impact, persistence impact, tests, and risks.
5. Create or update an implementation plan in `docs/plans`.
6. Implement in small safe steps only after the spec and plan are clear.
7. Add or update tests.
8. Run `npm test` and `npx tsc --noEmit`.
9. Update `docs/implementation-log.md`.
10. Update `docs/decisions` if an important product or technical decision changed.

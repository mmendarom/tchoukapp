# Codex Working Rules

- Read `docs/constitution.md` before architectural or feature work.
- Use `docs/agents/*` when a task relates to a product, domain, architecture, UX, state, QA, or release role.
- Use `docs/workflows/*` for the task type: spec-driven development, feature work, bugfixes, or field-testing feedback.
- Before meaningful feature implementation, create or update a spec in `docs/specs` and an implementation plan in `docs/plans`.
- After meaningful changes, update `docs/implementation-log.md`; add or update `docs/decisions` for important product or technical decisions.
- Keep visible UI text in Spanish for Uruguay coaching staff.
- Keep the app offline-first and preserve local persistence.
- Preserve the stable match flow: periods, timer, points, errors, substitutions, undo, cancel, summaries, and court locations.
- Do not add backend, authentication, cloud sync, paid services, or unnecessary dependencies unless explicitly requested.
- Keep `landingLocation` as the source of truth for point location.
- Never infer point landing location from player position.
- For Expo-specific changes, verify against the installed Expo SDK version in `package.json`.
- Before finishing, run `npm test` and `npx tsc --noEmit` when practical.
- Final responses must summarize changed files, validation results, known limitations, and assumptions.

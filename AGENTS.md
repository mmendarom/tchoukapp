# Codex Working Rules

- Read `docs/constitution.md` before architectural or feature changes.
- For every meaningful feature, create or update a spec before implementation.
- Do not add backend, authentication, paid services, cloud sync, or unnecessary dependencies unless explicitly requested.
- Keep the app offline-first and preserve local persistence.
- Keep all visible UI text in Spanish for the Uruguay coaching staff.
- Keep screens usable on both phone and tablet.
- Preserve the current working match flow: periods, timer, points, errors, substitutions, undo, cancel, summaries, and court locations.
- For Expo-specific changes, verify against the installed Expo SDK version in `package.json`.
- Run validation before finishing: `npx tsc --noEmit` and `npm test`.
- After each task, summarize changed files, validation results, and known limitations.

# Bugfix Workflow

Use this for broken behavior, regressions, or field-reported defects.

1. Reproduce or clearly understand the bug.
2. Identify the source: domain, UI, state, persistence, navigation, timer, or Expo behavior.
3. Add a focused fix.
4. Add a regression test when practical.
5. Avoid unrelated refactors.
6. Validate with `npm test` and `npx tsc --noEmit`.
7. Document meaningful fixes in `docs/implementation-log.md`.
8. Update specs or decisions if the bug reveals a changed rule or product decision.

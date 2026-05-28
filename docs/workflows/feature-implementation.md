# Feature Implementation Workflow

Use this when implementing an approved spec or small planned feature slice.

1. Read `docs/constitution.md`.
2. Read the relevant spec in `docs/specs`.
3. Read the relevant plan in `docs/plans`.
4. Consult relevant agent role guides in `docs/agents`.
5. Implement the smallest safe slice.
6. Add or update tests for domain, state, persistence, and UI risk areas.
7. Run `npm test` and `npx tsc --noEmit`.
8. Update the spec, plan, implementation log, and decisions if the work changed them.
9. Summarize changed files, validation, limitations, and assumptions.

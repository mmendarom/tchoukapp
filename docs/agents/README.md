# Agent Role Guides

These files are role guides for Codex, not separate apps or automated services.

Use them to keep future work consistent with the project constitution, current specs, plans, decisions, and implementation log.

- A task can consult more than one role.
- The user can explicitly request a role.
- Codex should choose the relevant roles when the task clearly touches their area.
- Agent roles must follow `docs/constitution.md` and existing specs.
- If a role conflicts with an approved spec or decision record, update the spec or decision before implementation.

Available roles:

- `product-domain.md`: tchoukball product and field-use decisions.
- `architecture.md`: technical structure and dependency boundaries.
- `mobile-ux.md`: phone/tablet UX and live-match interaction quality.
- `state-persistence.md`: offline-first state, event stream, persistence, undo, and reset behavior.
- `qa-testing.md`: tests, validation, and field QA.
- `release-git.md`: Git, release hygiene, and field-test prototype workflow.

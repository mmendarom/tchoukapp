# Architecture Agent

## Purpose

Guide technical structure so the app stays simple, local-first, testable, and maintainable by a solo developer working with Codex.

## Responsibilities

- Keep domain calculations in `src/domain`.
- Keep reusable UI components in `src/components`.
- Keep screens in `src/screens`.
- Keep state management in `src/store`.
- Keep storage and persistence isolated from UI concerns.
- Prefer pure functions for stats, insights, coordinate logic, and tactical calculations.
- Avoid mixing tactical calculations into UI components.
- Avoid unnecessary dependencies.
- Preserve TypeScript strictness.

## Boundaries

- Do not introduce backend, authentication, or cloud sync without explicit request.
- Do not make large refactors during feature work unless planned.
- Do not duplicate business logic across screens.

# Release / Git Agent

## Purpose

Guide GitHub, commits, and field-test prototype workflow.

## Responsibilities

- Keep `main` stable.
- Use small descriptive commits.
- Prefer conventional commit style:
  - `feat:`
  - `fix:`
  - `docs:`
  - `refactor:`
  - `test:`
- Before pushing, run tests and TypeScript.
- Keep `.gitignore` and generated files clean.
- Document how to run the app on another machine.
- Support field-test prototype workflow with Expo Go.

## Boundaries

- Do not commit `node_modules`.
- Do not commit secrets or env files.
- Do not push broken TypeScript or tests knowingly.

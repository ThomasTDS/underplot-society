# ADR-002: Monorepo

**Status:** Accepted
**Date:** 2026-11-10

## Context

The project has a backend, a frontend and documentation, maintained by one person. Changes to the API often require matching changes in the frontend.

## Decision

Keep everything in a single repository with `backend/`, `frontend/` and `docs/` at the root. CI uses path filters to run only the relevant jobs.

## Consequences

- A change that spans the API and the frontend lands in one pull request, tested together.
- One place for CI configuration, issues, history and documentation.
- No monorepo tooling is needed for now; path filters in CI are enough for two applications.
- If the applications ever need independent release cycles or owners, this decision should be revisited.

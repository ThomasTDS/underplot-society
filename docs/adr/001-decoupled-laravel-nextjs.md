# ADR-001: Decoupled Laravel API and Next.js frontend

**Status:** Accepted
**Date:** 2026-11-10

## Context

The site is a trilingual publication, a portfolio, and a study ground for API testing and application security. Content is written by a single administrator and read by anonymous visitors. Hosting must run on free tiers, where backends may sleep when idle.

## Decision

Build a Laravel application that exposes a versioned JSON API and hosts the admin panel, backed by PostgreSQL. Build the public site separately in Next.js with TypeScript, consuming that API. Public pages are pre-rendered and revalidated on publish.

## Consequences

- The API has a real boundary that can be tested on its own (API tests, contract tests against an OpenAPI spec, rate limiting).
- Pre-rendered public pages stay fast and keep serving even if the API is asleep, and expose a smaller attack surface.
- Two applications in two languages must be built, configured, tested and deployed.
- The API contract becomes a dependency between both sides and must be kept in sync.

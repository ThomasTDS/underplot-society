# ADR-004: Zero operating cost

**Status:** Accepted
**Date:** 2026-11-10

## Context

The project is personal and has no revenue (no ads, no paid tiers). It must be sustainable indefinitely without recurring costs.

## Decision

Apart from the domain, every service used to build, run and monitor the site (hosting, database, CI, CDN, analytics, monitoring) must have a free plan that covers the project's needs.

## Consequences

- Free plans change without notice, sleep when idle or restrict commercial use. The environment is fully reproducible with Docker Compose so the site can move between providers without rewriting the application.
- Backups are the project's own responsibility and must be stored outside the hosting provider and tested by restoring them.
- Hosting is chosen in a separate ADR, recording the limits and risks of the selected provider.
- Services that require a paid plan for an essential feature are out of scope.

# Underplot Society

*Beneath the Surface.*

Underplot Society is a weekly, trilingual (English, Brazilian Portuguese and Latin American Spanish) publication about how games really work: the development, product, design, QA, marketing, sales and management decisions behind them, explained for curious non-specialists. Written by T.T.Ravenstone.

This repository holds the website. It is also a portfolio and a study ground for automated testing (Playwright first) and application security, built in public.

## Principles

- **No ads, no comments, no reader accounts.** The only login is the administrator's.
- **Three languages from day one.** Every article is published in EN, PT-BR and ES.
- **Accessible by default.** WCAG 2.2 AA is a release requirement, not a later improvement.
- **Zero operating cost.** Free tiers only, with a fully reproducible environment.
- **Every change is tested and gated.** Lint, tests and security checks run in CI before anything reaches `main`.

## Structure

| Path | Contents |
|---|---|
| `backend/` | Laravel API and admin panel (PostgreSQL) |
| `frontend/` | Next.js (TypeScript) public site |
| `docs/` | Architecture Decision Records and project documentation |

## Architecture decisions

Decisions are recorded as ADRs in [`docs/adr/`](docs/adr/).

| ADR | Decision |
|---|---|
| [001](docs/adr/001-decoupled-laravel-nextjs.md) | Decoupled Laravel API and Next.js frontend |
| [002](docs/adr/002-monorepo.md) | Monorepo |
| [003](docs/adr/003-identity-and-name.md) | Identity and name |
| [004](docs/adr/004-zero-operating-cost.md) | Zero operating cost |

## Status

Early development. Nothing to run yet.

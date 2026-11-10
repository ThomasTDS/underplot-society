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

## Workflow

### Branches

Trunk-based, simplified. `main` is the trunk and must always be in a releasable state. All work happens on short-lived branches created from `main`, merged back within a day or two and then deleted. There are no long-lived `develop` or `release` branches.

Branch names follow `<type>/<short-description>`, in lowercase kebab-case, using the same types as commits:

```
feat/health-check
fix/language-fallback
docs/commit-and-branch-conventions
```

### Pull requests

Every change reaches `main` through a pull request, even with a single maintainer. The pull request is where the diff is read before merging, where CI runs its gates, and where the reason for a change is recorded.

- Pull requests are **squash merged**, so each one becomes a single commit on `main`.
- The pull request title becomes that commit message, so it must follow the commit convention below.
- Once CI is in place, a pull request is merged only with all checks green.

### Commits

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

| Type | Use for |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `test` | Adding or changing tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `style` | Formatting only, no change in behaviour |
| `build` | Build system, Docker or dependencies |
| `ci` | CI configuration |
| `chore` | Maintenance that fits no other type |
| `revert` | Reverting a previous commit |

Scopes are optional and name the part of the repository affected: `backend`, `frontend`, `docs`, `ci`, `deps`.

- The description is in English, in the imperative mood ("add", not "added"), lowercase, with no final period, and the whole first line stays within 72 characters.
- The body, when needed, explains *why* the change was made, not *what* the diff already shows.
- A breaking change adds `!` after the type or scope and a `BREAKING CHANGE:` footer describing it.

Examples:

```
feat(backend): add health check endpoint
fix(frontend): fall back to English when a translation is missing
docs: add commit and branch conventions
ci: run Playwright smoke tests on pull requests
feat(backend)!: rename article slug field

BREAKING CHANGE: the API now returns `slug` instead of `path`.
```

## Status

Early development. The backend API runs locally with a health check; see [`backend/README.md`](backend/README.md).

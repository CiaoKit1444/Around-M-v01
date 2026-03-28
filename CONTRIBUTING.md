# Contributing to Peppr Around Admin

This document describes the branching strategy, development workflow, and quality gates for this project.

---

## Branch Strategy

The repository uses a three-tier branching model:

| Branch | Purpose | Protected |
|---|---|---|
| `main` | Production-ready code only. Deployed to `bo.peppr.vip`. | Yes — requires PR + CI pass |
| `develop` | Integration branch. All feature branches merge here first. | No |
| `feature/<name>` | Short-lived work branches, one per feature or fix. | No |

The flow is always **`feature/*` → `develop` → `main`**. Direct commits to `main` are blocked by branch protection.

---

## Starting a New Feature

```bash
# Always branch from develop, never from main
git checkout develop
git pull origin develop
git checkout -b feature/my-feature-name

# ... make changes ...

git add .
git commit -m "feat: describe what this does"
git push origin feature/my-feature-name
```

Then open a Pull Request from `feature/my-feature-name` → `develop` on GitHub.

---

## Commit Message Convention

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix | When to use |
|---|---|
| `feat:` | New feature or user-visible behaviour |
| `fix:` | Bug fix |
| `refactor:` | Code change with no behaviour change |
| `test:` | Adding or updating tests |
| `chore:` | Build scripts, CI, dependencies |
| `docs:` | Documentation only |

Example: `feat: add property filter dropdown to Inbox`

---

## CI Quality Gate

Every push and pull request triggers `.github/workflows/ci.yml`, which runs:

1. `pnpm install` — install dependencies
2. `pnpm check` — TypeScript type check (`tsc --noEmit`)
3. `pnpm test:ci` — full Vitest suite with JUnit reporter

All three steps must pass before a PR can be merged into `main`. The test results are uploaded as a GitHub Actions artifact (`test-results/junit.xml`) and retained for 30 days.

To run the same checks locally before pushing:

```bash
pnpm check          # TypeScript
pnpm test           # Full test suite
pnpm test:restore   # Reset DB fixtures to seed state (run before full suite)
```

---

## Merging to Main

Once a feature is stable on `develop` and has been tested:

1. Open a Pull Request from `develop` → `main`.
2. Ensure the CI workflow passes on `develop`.
3. Request a review from `@CiaoKit1444` (auto-requested via CODEOWNERS).
4. Merge using **Squash and merge** to keep `main` history clean.

---

## Database Changes

Schema changes follow a strict workflow:

1. Edit `drizzle/schema.ts`.
2. Run `pnpm db:push` to generate and apply the migration.
3. Verify the migration in `drizzle/migrations/`.
4. Commit both the schema change and the migration file together.

Never modify migration files after they have been applied to a shared environment.

---

## Seed Fixture Restore

Before running the full test suite in a shared environment, reset the database fixtures:

```bash
pnpm test:restore
```

This script (`scripts/restore-seed-fixtures.mjs`) idempotently resets known test fixtures (room templates, QR codes, stay tokens) to their canonical seed state, preventing test-order contamination between runs.

---

## Environment Variables

All environment variables are managed through the Manus platform Secrets panel and injected at runtime. Never commit `.env` files or hardcode secret values in source code. The full list of required variables is documented in `server/_core/env.ts`.

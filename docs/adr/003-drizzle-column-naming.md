# ADR-003: Normalise Drizzle Schema Column Naming to camelCase TypeScript / snake_case SQL

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-03-27 |
| **Deciders** | Peppr Around Engineering |
| **Supersedes** | — |
| **Superseded by** | — |
| **Related** | ADR-001 (tRPC migration), ADR-002 (guest tRPC migration) |

---

## Context

The Drizzle schema in `drizzle/schema.ts` defines 22 tables. The majority of these tables follow the correct Drizzle convention: the TypeScript property name is `camelCase` and the SQL column name (the string argument to the column type helper) is `snake_case`. For example:

```ts
// ✅ Correct pattern
passwordHash: text("password_hash").notNull(),
fullName: varchar("full_name", { length: 255 }).notNull(),
```

However, two legacy tables — `peppr_users` and `peppr_user_roles` — contain a small number of columns where the TypeScript property name and the SQL column name are inconsistent or where the TypeScript name does not follow camelCase. The most notable cases are the `twofa_*` columns in `peppr_users`:

```ts
// ⚠️ Inconsistent — TypeScript property is not camelCase
twofaEnabled: boolean("twofa_enabled").default(false).notNull(),
twofaSecret: text("twofa_secret"),
twofaMethod: varchar("twofa_method", { length: 20 }),
twofaBackupCodes: json("twofa_backup_codes"),
```

The TypeScript property `twofaEnabled` is a contraction of "two-factor authentication enabled" but does not follow the standard camelCase expansion `twoFaEnabled`. This inconsistency is minor but creates friction when reading query results, because `row.twofaEnabled` does not match the mental model of `row.twoFaEnabled` that a developer would expect from the SQL column `twofa_enabled`.

A secondary issue is the `users` table (the Manus OAuth identity table, not the Peppr-specific `peppr_users`). This table uses a mix of `varchar` and `text` column types for what are semantically equivalent string fields, and its TypeScript property names are already correct camelCase. No action is required for this table.

---

## Decision

The `twofa_*` columns in `peppr_users` will be renamed in TypeScript only — the SQL column names remain unchanged to avoid a database migration. Drizzle's column type helpers accept a SQL column name as the first argument independently of the TypeScript property name, so this is a non-breaking change at the database level.

The rename will be applied as a single commit to `drizzle/schema.ts`, followed by a global search-and-replace across all server files that reference these properties. No `drizzle-kit generate` or `drizzle-kit migrate` is required because the SQL column names are unchanged.

| Current TypeScript property | Proposed TypeScript property | SQL column (unchanged) |
|-----------------------------|------------------------------|------------------------|
| `twofaEnabled` | `twoFaEnabled` | `twofa_enabled` |
| `twofaSecret` | `twoFaSecret` | `twofa_secret` |
| `twofaMethod` | `twoFaMethod` | `twofa_method` |
| `twofaBackupCodes` | `twoFaBackupCodes` | `twofa_backup_codes` |
| `requires2fa` | `requires2Fa` | `requires_2fa` |

The `requires2fa` → `requires2Fa` rename follows the same logic: `2fa` is an abbreviation, and the camelCase expansion places the capital after the digit, giving `2Fa`.

---

## Scope

This ADR covers only the five columns listed above. All other columns in `drizzle/schema.ts` already follow the correct convention and are out of scope.

The following files are expected to reference the renamed properties and will require updates:

| File | References |
|------|------------|
| `server/routes/auth.ts` | `twofa_enabled`, `requires_2fa` checks in login handler |
| `server/crudRouter.ts` | User update mutation that sets `twofaEnabled` |
| `server/db.ts` | `getUserByEmail` and `getUserById` helpers |
| `client/src/pages/TwoFactorPage.tsx` | Reads `user.twofaEnabled` from API response |
| `client/src/contexts/AuthContext.tsx` | Maps `pepprUser.twofaEnabled` to the `User` interface |
| `shared/types.ts` | `PepprUserPublic` type that exposes `twofaEnabled` |

---

## Consequences

### Positive

The TypeScript property names in `drizzle/schema.ts` will be fully consistent with camelCase conventions across all 22 tables. IDE autocomplete will suggest `twoFaEnabled` rather than `twofaEnabled`, matching the mental model. The change is zero-risk at the database level because SQL column names are unchanged.

### Negative / Trade-offs

The rename touches six files. Although the change is mechanical (search-and-replace), it must be applied atomically — a partial rename will cause TypeScript errors. The migration should be done in a dedicated commit with a TypeScript check (`npx tsc --noEmit`) run immediately after to confirm zero errors before merging.

---

## Implementation Steps

1. Update `drizzle/schema.ts`: rename the five TypeScript properties as listed in the table above.
2. Run `grep -rn "twofaEnabled\|twofaSecret\|twofaMethod\|twofaBackupCodes\|requires2fa" server/ client/ shared/` to find all references.
3. Apply search-and-replace across all found files.
4. Run `npx tsc --noEmit` to confirm zero errors.
5. Run `pnpm test` to confirm all tests pass.
6. Commit with message: `refactor(schema): normalise twofa column TypeScript names to camelCase`.

This ADR should be implemented **before** ADR-002 (guest microsite tRPC migration) to avoid a second round of type changes in the new guest procedures that may indirectly reference user objects.

---

## Related Decisions

- **ADR-001:** tRPC as the primary API layer — the type-safety benefits of tRPC are maximised when the underlying schema types are consistent
- **ADR-002:** Guest microsite tRPC migration — depends on a clean schema baseline

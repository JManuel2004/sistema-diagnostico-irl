# 0004 — One migration script while no environment holds real data

**Status:** accepted

## Context

The schema was built with 25 incremental migrations while the design changed. No environment holds real data: every database is rebuilt from scratch with `db:migration:run` + `db:seed`.

## Decision

- The schema is a single migration, `20260518001-InitialSchema.ts`. Changing the schema means editing that file and rebuilding the database; `single-migration.spec.ts` fails if a second file appears.
- Migrations remain the only way to change the schema (`synchronize` is never enabled).

## Consequences

- The day an environment with real data exists, this flips: every change becomes a new incremental migration and the initial one is frozen. Deciding when that day has come is a product decision.
- Tables reserved for `reporting` (`notification`, `report_download`, `audit_event`) have no code yet.

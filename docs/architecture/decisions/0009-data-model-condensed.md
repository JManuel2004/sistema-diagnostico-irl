# 0009 — Tables and columns without a reader or a writer are removed

**Status:** accepted — updates the note of [0004](./0004-single-migration-until-real-data.md) on the tables reserved for `reporting`.

## Context

Comparing the schema with the data model of the design documents showed tables and columns that nothing read or wrote: tables reserved for a `reporting` module that is not designed yet, a catalog of roadmap texts that was never seeded, a consent flag that is always true, an initiative column no form collected, and a `published_` prefix left over from the configuration versioning that was removed.

## Decision

- Removed: `irl_catalog.roadmap_text`, the reserved `irl_diagnostic.notification`, `report_download` and `audit_event`, and `consent.accepted` (a consent row is the acceptance).
- The initiative column no form collected is removed with no rule left reading it. With `team_size` and `id_stage`, every initiative column is `NOT NULL`.
- The engine's tables drop the `published_` prefix: `ordinal_profile`, `ordinal_intensity`, `eligibility_rule`, `exception_rule`.
- Kept on purpose: the two ordinal tables stay separate (a correct normalized 1:6 shape), and the dates and `is_active` flags nothing reads yet keep their audit and catalog-retirement value.

## Consequences

- Every development database is rebuilt from the single migration ([0004](./0004-single-migration-until-real-data.md)).
- `reporting` designs its own tables when it is designed, instead of inheriting a shape that did not match its plan.

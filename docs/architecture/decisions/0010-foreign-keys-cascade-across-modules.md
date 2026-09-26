# 0010 — Foreign keys cascade on delete, also across modules

**Status:** accepted.

## Context

Every result table of a diagnostic points to `irl_diagnostic.diagnostic` with `ON DELETE CASCADE`, although the rows belong to different modules (`diagnosis`, `initiative`, `routing`, `roadmap`). The same holds for an initiative's consent history and profiles. "Modules communicate by id" suggests either removing the foreign keys between modules or orchestrating deletion through events, with each module deleting its own rows.

## Decision

- The foreign keys stay, and so does the cascade. Deleting a diagnostic deletes its answers, profile, imbalances, initiative profile, recommendation (with its ranking) and roadmap in one statement; deleting an initiative deletes its consent history and profiles.
- Catalog references (`irl_catalog`) never cascade: a catalog row that is referenced cannot be deleted.
- It is a deliberate simplification while the system is a single deployment over a single database. The rule "modules communicate by id" governs the code — no module reads or writes another's tables — not the database's referential integrity.

## Consequences

- No orphan rows and no deletion events to keep in sync.
- Nothing deletes diagnostics or initiatives yet. When a data-deletion path is built (the right to erasure of Law 1581), it relies on this cascade and must be reviewed against it.
- Splitting a module into its own deployment or database requires replacing its cascading keys with deletion by events; that change supersedes this ADR.

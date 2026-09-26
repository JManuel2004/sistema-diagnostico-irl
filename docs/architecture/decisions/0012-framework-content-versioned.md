# 0012 — The IRL framework's content is versioned

**Status:** accepted — revisits, for the framework's content only, the removal of versioning recorded in backlog 5.6 (which is about the routing configuration and stays as it is).

## Context

The statements and the conversion table were rewritten in place by the seed. Changing a statement's text changed, retroactively, what every historical diagnostic appears to have answered, and nothing guaranteed that the conversion ranges covered every possible average exactly once.

## Decision

- `irl_catalog.framework_version (id, code, published_at)`. The statements and the conversion ranges belong to a version; `diagnostic.id_framework_version` records the version the diagnostic is answered with. The current version is the latest published; starting a diagnostic without one fails.
- A published version that a diagnostic already uses cannot change: the seed compares it and refuses, asking for a new version. A new version adds rows; it never rewrites.
- The questionnaire is served per version (`GET /catalog/questionnaire?version=<code>`, the current one without the parameter), and the frontend asks for the diagnostic's own version (`Diagnostic.frameworkVersion`). Submitting an answer to a statement of another version is rejected (422).
- The conversion table of a version cannot overlap (`EXCLUDE USING gist` over `numrange(avg_min, avg_max, '[]')`, extension `btree_gist`), and the seed checks that every attainable average (k/8) falls in exactly one range.
- The dimensions and the six imbalance pairs are not versioned: they are the framework's identity, not its content.

## Consequences

- Historical diagnostics keep the text they were answered with.
- Changing a statement means publishing `KTH-IRL-1.x` through the seed; diagnostics in progress keep their version.

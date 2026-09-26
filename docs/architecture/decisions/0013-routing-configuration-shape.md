# 0013 — The routing configuration: natural keys, one row per fact, a uniform ranking

**Status:** accepted — complements backlog 5.6 (one configuration, no versions).

## Context

The routing engine's catalog had a parameters table held to one row by an index and used as the seed's sentinel, a service profile and a layer trace split into 1:1 tables, the relevant stages as a comma-separated list, ordinal labels matched by text, eligibility rules without a stable key, and a recommendation whose primary service lived in its own columns while the alternatives lived in another table.

## Decision

- `scoring_parameters` is an explicit single row (`id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1)`); the seed upserts it (`ON CONFLICT (id) DO UPDATE`). Every configuration table is upserted by its natural key, so re-seeding applies a calibration change instead of skipping it.
- The service profile merges into `portfolio_service` (`min_level`, `max_level`); the layer trace merges into `portfolio_recommendation` as typed `jsonb` columns.
- The relevant stages are a join table, `portfolio_service_stage (id_service, id_stage)`; the seed fails on an unknown stage.
- `ordinal_intensity` references the calibration scale by id (`id_calibration_label`) and is unique per service and dimension; the seed requires the six dimensions.
- `eligibility_rule` has a unique `code` (as `exception_rule` already had), and the trace records the rule's `code`, not its surrogate id.
- The ranking is uniform: `recommendation_rank (id_recommendation, position, id_service, service_snapshot, score)`, with the recommended service in position 1. `score` is `numeric(8,3)`, wide enough for the theoretical maximum, and `criterion_justification` is `varchar(1100)`, wide enough for the longest composed text.

## Consequences

- A recalibration is a seed run; the configuration never needs to be dropped to change.
- Reading a recommendation rebuilds the primary and the alternatives from one table, ordered by position.

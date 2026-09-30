# 0014 — Adjustment-only services enter the ranking only through an adjustment

**Status:** accepted — extends [0013](./0013-routing-configuration-shape.md).

## Context

INNLAB's official portfolio includes services that the engine cannot score. Three have no maturity band («No aplica», «Según el proyecto que le asignes»): Chispa, Academia a la Medida and Práctica de Innovación. A fourth, Alianza Residente, covers the whole scale (IRL 1–9), so its band discriminates nothing. They are still part of what INNLAB offers, and the center may want to recommend them in specific situations.

## Decision

- **The flag.** `portfolio_service.adjustment_only` marks these services explicitly. It is not inferred from a missing band, because Alianza Residente has one. A scored service must have a band (`ck_portfolio_service_scored_band`); an adjustment-only one may have none.
- **Kept out of layers 1 and 2.** Adjustment-only services take no part in the exclusions or in the score: the configuration is loaded in two lists, and the first two layers only receive the scored one.
- **`INCLUDE`.** A new layer-3 action, and the only way these services enter the ranking.
  - It puts the service at the position the rule sets (`positions`, 1 = first; past the end, it goes last), without a score.
  - From then on it is one more place of the ranking. Later adjustments can move or veto it like any other; one on an adjustment-only service that no earlier rule included is discarded, and the seed rejects it.
  - Including a service already in the ranking is discarded.
- **Exempt from the threshold.** An included service has no score, so the minimum threshold does not apply to it: the center decided it belongs there, and its position alone makes it the recommendation or an alternative. It can also avoid a «sin recomendación» when no scored service reaches the threshold.
- **Database guarantees.** Composite foreign keys to `portfolio_service (id, adjustment_only)` carry the target's flag into `eligibility_rule` and `exception_rule`. An exclusion only targets a scored service, and `INCLUDE` only an adjustment-only one (`ck_exception_rule_include_target`), with a position (`ck_exception_rule_positions`). The seed validates the same before writing.
- **Storage and exposure.**
  - A place of `recommendation_rank` has either a score or the rule that included it (`ck_recommendation_rank_origin`).
  - The API exposes the included place with `score: null`: in the recommendation with the adjustment's `adjustmentReason`, and in the trace ranking with `includedBy`.
  - The screen shows it without a number and, as an alternative, with the reason of the adjustment.

## Consequences

- Whether an adjustment-only service is recommended is entirely the center's decision, expressed as `INCLUDE` rules and their positions; the calculation never proposes one.
- An included service in position 1 becomes the recommendation, and the trace then says the result comes from an adjustment (`adjustedByException`).
- Turning a service from adjustment-only into scored (or the reverse) is a seed change; the seed rewrites the rules, so no rule of the old kind is left pointing at it.

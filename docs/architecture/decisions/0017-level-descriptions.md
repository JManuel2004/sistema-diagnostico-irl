# 0017 — Every score is shown with what its level means

**Status:** accepted — extends [0012](./0012-framework-content-versioned.md).

## Context

A «3,5 de 9» or a «4 de 9» says nothing to someone who does not know the framework. The program's document (`irl-di-v4.pdf`, section 3) describes in one sentence what each level of each dimension means (6 × 9). No source describes the global level: the KTH framework assesses each dimension on its own, and the global level is the system's average.

## Decision

- Two catalog tables tied to the framework version: `dimension_level_description` (54 texts, official, from the program's document) and `global_level_description` (9 texts, provisional and simulated until INNLAB delivers its own).
- They explain the levels; they are not what the user answered. That is why the seed updates them even on a version already in use, unlike the statements and the conversion table.
- The profile response carries each dimension's `levelDescription`, the `globalLevel` with its text, and `levelScale` (the nine texts of each dimension), so the roadmap can explain its targets without a second request.
- The global average (to one decimal, as shown) is rounded half up to choose its text: 3.5 → 4.

## Consequences

- The results show every score with its meaning: a list of the six dimensions, the radar tooltip, the global level and each target of the roadmap.
- Replacing the provisional global texts is a seed change, with no new framework version.

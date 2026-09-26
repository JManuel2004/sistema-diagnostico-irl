# 0011 — An initiative has its own identity; its consent is a history

**Status:** accepted — supersedes the consent parts of [0007](./0007-initiative-draft-before-consent.md) (the draft before the consent is kept) and the consent notes of [0009](./0009-data-model-condensed.md).

## Context

The initiative was modelled as a child of one diagnostic: each diagnostic stored its own copy of the profile and its own consent, one row that a new acceptance overwrote. A user diagnosing the same initiative twice created two unrelated initiatives, accepted the consent again for each, and lost the evidence of the earlier acceptance. The consent text lived in the frontend code, so a stored `terms_version` pointed to no stored text.

## Decision

- `irl_diagnostic.initiative` is its own entity: an id and its owner (`cognito_user_id`). The user chooses one of their initiatives, or creates a new one, in wizard step 1.
- The profile is a snapshot per diagnostic (`initiative_profile`, unique per diagnostic, pointing to the initiative), so each diagnostic keeps the data it was computed with. The link between initiative and diagnostic lives in that snapshot, not in `diagnostic`, so `diagnosis` does not depend on `initiative`.
- The consent belongs to the initiative and is a history: every acceptance is a new row (`consent`), none is overwritten. The current one is the latest. A composite foreign key `(id_initiative, cognito_user_id)` guarantees that whoever accepts owns the initiative.
- The consent texts are a catalog: `irl_catalog.consent_terms (version, title, sections, checkbox_label, published_at)`, written by the seed, served by `GET /consent-terms/current`, and referenced by `consent.terms_version`. The current text is the latest published; the seed refuses to change a version that already has acceptances.
- An initiative is created together with its first acceptance (`POST /initiatives`), in one transaction. A later acceptance is `POST /initiatives/:id/consent`.
- Registering a profile requires the initiative's latest acceptance to be of the current text (409 otherwise). An initiative that already accepted the current text skips the consent step; a new one, or one that accepted an older text, goes through it.
- `ConsentRecordedEvent` is removed: registering the profile (`InitiativeRegisteredEvent`) moves a `STARTED` diagnostic through `WITH_CONSENT` to `WITH_INITIATIVE`, because a profile is only registered with a current consent.

## Consequences

- The browser draft of [0007](./0007-initiative-draft-before-consent.md) now also holds the chosen initiative (`initiativeId`, `null` for a new one); once step 2 creates a new initiative its id is kept in the draft, so a retry does not create another.
- Publishing a new consent text is a seed change with a new version; every initiative is asked to accept it on its next diagnostic.
- When INNLAB Core exposes the company, the initiative is where its identifier belongs.

# 0015 — The wizard asks for the consent before the initiative

**Status:** accepted — supersedes [0007](./0007-initiative-draft-before-consent.md).

## Context

[ADR 0007](./0007-initiative-draft-before-consent.md) asked for the initiative first and kept it as a browser draft until the consent, and it anticipated that the consent would go first if a local draft before it were not admissible. INNLAB asked for the consent at the start of the form: the user authorizes the processing of their data before typing any of it (RF-03, RNF-06, Law 1581).

The consent still belongs to the initiative ([ADR 0011](./0011-initiative-identity-and-consent-per-initiative.md)), and on the consent step the user has not chosen one yet.

## Decision

- The wizard order is consent → initiative → questionnaire → summary.
- Step 1 shows the current text served by the backend. Accepting keeps **only the accepted text version** in the browser draft (`useInitiativeDraftStore`, `sessionStorage`); nothing about the initiative exists yet.
- Step 2 records that acceptance on the chosen initiative (creating it with its first acceptance, or recording a new acceptance of an existing one) and then registers the profile. An initiative that already accepted the current text only registers the profile.
- If the text changed between both steps, the backend answers 409, the draft forgets the version and the user goes back to step 1.
- The backend is unchanged: a profile is registered only when the initiative's latest acceptance is of the current text.

## Consequences

- No initiative data is typed before the consent, so the question 0007 left to legal no longer applies.
- The acceptance is stored one step later than it is given. Closing the tab in between loses it, and the user accepts again on return.
- Resuming decides the step from the server and from that draft: without a registered profile, the wizard opens on the consent unless the current text was already accepted in this tab.

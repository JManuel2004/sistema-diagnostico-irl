# 0007 — The wizard keeps the initiative in the browser until the consent

**Status:** accepted — pending confirmation from legal that a browser-only draft before the consent is admissible.

## Context

The product asks for the initiative first and the consent second (a guided flow in the order the user thinks about it), but Law 1581 (RF-03, RNF-06) forbids the system from storing the initiative's data before the consent is accepted.

## Decision

- Wizard step 1 keeps the initiative form as a browser draft (`useInitiativeDraftStore`, Zustand persisted in `sessionStorage`), never sent to the server.
- Step 2 records the consent and only then registers the initiative from the draft; a retry after a failure repeats only what is missing.
- The backend enforces it on its own: registering an initiative without a consent answers 409.

## Consequences

- The draft dies with the tab and is emptied once the initiative is registered.
- If legal rules that even a local draft is not admissible, the consent step goes first and this ADR is superseded.

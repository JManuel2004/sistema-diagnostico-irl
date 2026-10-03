# `features/questionnaire`

The IRL questionnaire in the browser: the 48 statements grouped by dimension, the Likert answer and the optional justification of each one, the progress, and the summary table shown before processing. It talks to `diagnosis` (`GET catalog/questionnaire?version=`, the diagnostic's framework version, which every hook and `QuestionnaireView` receive); sending the answers is `finalize-initial`, in `shared/` because the wizard's summary step owns it.

## What it holds

| Folder        | Contents                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `api/`        | `questionnaire-catalog.api.ts` — the questionnaire structure, parsed with `@innlab/contracts`              |
| `components/` | `QuestionnaireView` (tabs, panel, navigation, progress), `StatementCard`, `LikertScale`, `AnswersSummary` |
| `hooks/`      | `useQuestionnaireStructure`, `useQuestionnaireCompletion`, `useAnswerForStatement`                         |
| `store/`      | `questionnaire-draft.store.ts` — the Zustand draft, persisted to `sessionStorage`                          |
| `lib/`        | `likert-options.ts` — the five Likert labels shown to the user                                            |

Public surface (`index.ts`): `QuestionnaireView`, `AnswersSummary`, `useQuestionnaireDraftStore` and its selectors, `useQuestionnaireCompletion`, `useQuestionnaireStructure`.

## Rules

- **A statement is complete with its Likert value** (`isStatementComplete`, RF-06); the justification is optional, and a blank one is sent as `null`. The summary step cannot be reached while any of the 48 is unanswered. The backend validates the answers again before storing anything.
- The draft belongs to one diagnostic: `initialize(diagnosticId)` wipes it when it belongs to another. Its shape and lifetime are in [`STATE_MANAGEMENT.md`](../../../docs/STATE_MANAGEMENT.md#zustand).
- Dimension names and descriptions come from the catalog response; only colors and icons are local (`shared/lib/dimensions.ts`).
- `DimensionTabs` scrolls to the top of its panel only when the dimension changes, never on mount.
- Like every feature, it imports no other feature; pages compose it (`QuestionnaireStep`, `SummaryStep`).

## Out of scope

Server-side drafts: closing the tab discards the answers not yet processed, by design.

# `questionnaire` module

Bounded context for the **48-answer questionnaire**: persisting the
`AnswerSheet` aggregate and enforcing RF-06 (server-side completeness
revalidation) before the diagnostic transitions to `CUESTIONARIO_COMPLETO`.

## Stage 1 — what exists

- `questionnaire.module.ts` — empty `@Module({})` registered into `ApiV1Module`.
- `respuesta` table created by the initial migration with the unique
  constraint `(id_diagnostico, id_afirmacion)` and a CHECK on Likert range.

## Stage 2 — what arrives with HU-08 / HU-09

Within the three target stories the **backend work is minimal**:

- **HU-08 — "Responder afirmaciones con escala Likert"** is frontend-only
  (the user manipulates a Zustand draft store; no backend round-trip per
  answer).
- **HU-09 — "Conservar respuestas mientras se diligencia el cuestionario"**
  is also frontend-only — `sessionStorage` persistence per
  `apps/web/docs/STATE_MANAGEMENT.md`.

The backend submission endpoint (and the autosave variant) belongs to
HU-10 which is **not** in the three target stories. If the team later
expands the scope, the planned files are:

| Layer             | File                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `domain/`         | `AnswerSheet` aggregate, `Answer`, `CompletenessChecker`, `AnswerSheetRepositoryPort` |
| `application/`    | `SubmitQuestionnaireUseCase`, `GetQuestionnaireProgressUseCase`                       |
| `infrastructure/` | `RespuestaOrm`, `TypeOrmAnswerSheetRepository`                                        |
| `interfaces/`     | `QuestionnaireController` — `POST /api/v1/diagnosticos/:id/cuestionario`              |

## Deferred (explicitly)

- The `SaveDraftAnswersUseCase` (server-side autosave) — only required if
  the project later mandates per-keystroke persistence. The three target
  stories do not.
- Domain events (`AnswersSubmittedEvent`) — wired in when the orchestrator
  needs to trigger the maturity-profile calculation (E-04, deferred).

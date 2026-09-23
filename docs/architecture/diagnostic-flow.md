# The diagnostic, from start to results

How a diagnostic moves through the product: the screens the user goes through, what each one sends, the state the backend keeps and the events between modules. The detail of each endpoint is in Swagger (`/api/docs`); the rules of each module are in its `README.md`.

## Screens

```
/  (landing, public)
 └─ «Iniciar diagnóstico» → /diagnosticos/nuevo   (protected: without a session, INNLAB sign-in first)
      └─ POST /diagnostics  (starts or resumes)  → /diagnosticos/:id/asistente/:step
           1 iniciativa      the initiative profile (browser draft)
           2 consentimiento  the data-processing consent; then the initiative is saved
           3 cuestionario    48 statements, each with a Likert value and a justification (browser draft)
           4 resumen         review; «Procesar diagnóstico» sends the answers
      └─ /diagnosticos/:id/resultados   maturity profile; invitation to the deep analysis
           └─ «Solicitar análisis profundo» → imbalances, critical state, roadmap, recommendation
/panel   the initiative of the latest diagnostic with results; «Continuar diagnóstico» if one is unfinished
/diagnosticos/:id/iniciativa   correct an already registered initiative
```

- **The wizard has no main navigation.** It decides the step from what the server already has (initiative registered? consent recorded?), never from a local flag: resuming lands on the first missing step, and a later step cannot be opened by URL. A diagnostic that already has results is never resumed; its results open.
- **Starting is idempotent per user.** `POST /diagnostics` returns the user's last diagnostic while it is unfinished (`completed` false) and creates a new one only when there is none or the last one has its profile. Two simultaneous requests from two tabs can still create two (known limit).
- **Nothing about the initiative is stored before the consent** ([ADR 0007](./decisions/0007-initiative-draft-before-consent.md)). Step 1 keeps the form in `sessionStorage`; step 2 records the consent and then the initiative. The backend refuses an initiative without a consent (409).
- **The questionnaire is a browser draft** (`useQuestionnaireDraftStore`, `sessionStorage`) until «Procesar diagnóstico». A statement is complete only with its Likert value and a non-blank justification; step 4 cannot be reached with anything missing.
- **The deep analysis is a user action**, never an effect of opening the results page. Until it is accepted, the results show the maturity profile only; the recommendation and the roadmap are not even requested.
- **Outcomes of actions** (consent recorded, initiative saved, diagnostic processed, deep analysis ready, and their failures) are announced with toasts (`notify`, Sonner).

## State of a diagnostic (backend, `diagnosis`)

```
STARTED ──ConsentRecordedEvent──▶ WITH_CONSENT ──InitiativeRegisteredEvent──▶ WITH_INITIATIVE
   ──POST finalize-initial──▶ QUESTIONNAIRE_IN_PROGRESS ▶ QUESTIONNAIRE_COMPLETE ▶ PROFILE_GENERATED
   ──POST deep-analysis──▶ DEEP_ANALYSIS_IN_PROGRESS
```

- Transitions are linear; none is skipped or undone. Re-registering the initiative or re-sending a consent does not move a diagnostic backwards (the listeners are idempotent).
- `completed` (the profile exists: `PROFILE_GENERATED` or later) and `deepAnalysisAccepted` are derived by the backend and exposed on `GET /diagnostics/:id`; the frontend decides what to show from them and infers nothing from the state.
- `DEEP_ANALYSIS_DECLINED` and `DEEP_ANALYSIS_COMPLETE` exist in the state machine but nothing moves a diagnostic into them yet: «Por ahora no» only takes the user to the panel.

## Who does what (backend modules)

| Step | Endpoint | Module | Publishes | Reacts |
| --- | --- | --- | --- | --- |
| Start | `POST /diagnostics` | `diagnosis` | — | — |
| Consent | `POST /diagnostics/:id/consent` | `initiative` | `ConsentRecordedEvent` | `diagnosis` → `WITH_CONSENT` |
| Initiative | `POST /diagnostics/:id/initiative` | `initiative` | `InitiativeRegisteredEvent` | `diagnosis` → `WITH_INITIATIVE` |
| Process | `POST /diagnostics/:id/finalize-initial` | `diagnosis` | — | — |
| Deep analysis | `POST /diagnostics/:id/deep-analysis` | `diagnosis` | `DeepAnalysisRequestedEvent` | `routing` saves the recommendation, `roadmap` saves the roadmap; each then publishes its "calculated" event |

- Consent and initiative writes first check that the diagnostic exists and belongs to the caller (`DiagnosticOwnershipPort`, answered through `diagnosis`'s exported `FindDiagnosisOwnerQuery`).
- `finalize-initial` validates the 48 answers and their justifications in the domain before storing anything, then stores them and computes the profile.
- The deep analysis is idempotent in the state: repeating it re-publishes the event, which retries a calculation that failed (the results page offers «Intentar de nuevo» when the diagnostic says accepted but a result is missing).

## The panel

`/panel` is where the institutional descriptor leads once the user has navigation. It lists nothing by itself: it reads the user's diagnostics (`GET /diagnostics`, most recent first), shows the initiative of the latest one with results, links to correct it and to its results, and offers «Continuar diagnóstico» when the latest one is still in the wizard (a single primary button per screen: «Continuar» wins when both exist). The history of past diagnostics has its place reserved; it is a future user story.

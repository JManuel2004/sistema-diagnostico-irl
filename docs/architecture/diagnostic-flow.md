# The diagnostic, from start to results

How a diagnostic moves through the product: the screens the user goes through, what each one sends, the state the backend keeps and the events between modules. The detail of each endpoint is in Swagger (`/api/docs`); the rules of each module are in its `README.md`.

## Screens

```
/  (landing, public)
 └─ «Iniciar diagnóstico» → /diagnosticos/nuevo   (protected: without a session, INNLAB sign-in first)
      └─ POST /diagnostics  (starts or resumes)  → /diagnosticos/:id/asistente/:step
           1 iniciativa      choose one of the user's initiatives (its latest profile fills the form)
                             or «Nueva iniciativa»; the profile, academic linkage included (browser draft)
           2 consentimiento  the current consent text, accepted for that initiative; then the profile
                             is saved (skipped when the initiative already accepted the current text)
           3 cuestionario    48 statements, each with a Likert value and a justification (browser draft)
           4 resumen         review; «Procesar diagnóstico» sends the answers
      └─ /diagnosticos/:id/resultados   maturity profile; invitation to the deep analysis
           └─ «Solicitar análisis profundo» → imbalances, critical state, roadmap, recommendation
/panel   the initiative of the latest diagnostic with results; «Continuar diagnóstico» if one is unfinished
/diagnosticos/:id/iniciativa   correct an already registered initiative profile (not after the deep analysis)
```

- **The wizard has no main navigation.** It decides the step from what the server already has (is the diagnostic's initiative profile registered?), never from a local flag: resuming lands on the first missing step, and a later step cannot be opened by URL. A diagnostic that already has results is never resumed; its results open.
- **Starting is idempotent per user.** `POST /diagnostics` returns the user's last diagnostic while it is unfinished (`completed` false) and creates a new one only when there is none or the last one has its profile. Two simultaneous requests from two tabs can still create two (known limit).
- **An initiative has its own identity and its consent is a history** ([ADR 0011](./decisions/0011-initiative-identity-and-consent-per-initiative.md)). The user diagnoses one of their initiatives again or creates a new one; each diagnostic keeps a snapshot of the profile it was computed with. Every acceptance is a new row; the text accepted is the current one of the `consent_terms` catalog, served by `GET /consent-terms/current`.
- **Nothing about the initiative is stored before the consent** ([ADR 0007](./decisions/0007-initiative-draft-before-consent.md)). Step 1 keeps the chosen initiative and the form in `sessionStorage`, unless the chosen initiative already accepted the current text, in which case the profile is registered right away. Step 2 creates the new initiative with its first acceptance (`POST /initiatives`) or records a new acceptance for an existing one (`POST /initiatives/:id/consent`), and then registers the profile. The backend refuses a profile whose initiative has not accepted the current text (409).
- **The questionnaire is answered with the diagnostic's framework version** ([ADR 0012](./decisions/0012-framework-content-versioned.md)): the wizard asks for `GET /catalog/questionnaire?version=<frameworkVersion>`, and the backend rejects answers to statements of another version.
- **The questionnaire is a browser draft** (`useQuestionnaireDraftStore`, `sessionStorage`) until «Procesar diagnóstico». A statement is complete only with its Likert value and a non-blank justification; step 4 cannot be reached with anything missing.
- **The deep analysis is a user action**, never an effect of opening the results page. Until it is accepted, the results show the maturity profile only; the recommendation and the roadmap are not even requested.
- **Outcomes of actions** (consent recorded, initiative saved, diagnostic processed, deep analysis ready, and their failures) are announced with toasts (`notify`, Sonner).

## State of a diagnostic (backend, `diagnosis`)

```
STARTED ──InitiativeRegisteredEvent──▶ (WITH_CONSENT ▶) WITH_INITIATIVE
   ──POST finalize-initial──▶ QUESTIONNAIRE_IN_PROGRESS ▶ QUESTIONNAIRE_COMPLETE ▶ PROFILE_GENERATED
   ──POST deep-analysis──▶ DEEP_ANALYSIS_IN_PROGRESS
   ──PortfolioRecommendationCalculatedEvent + ScalingRoadmapCalculatedEvent──▶ DEEP_ANALYSIS_COMPLETE
```

- Transitions are linear; none is skipped or undone. A profile is only registered with a current consent, so its event takes a `STARTED` diagnostic through `WITH_CONSENT` to `WITH_INITIATIVE`. Re-registering the profile does not move a diagnostic backwards (the listener is idempotent).
- **The inputs freeze with the results** (MD-04): the answers are accepted only up to `QUESTIONNAIRE_COMPLETE` (processing again from `PROFILE_GENERATED` answers 409), and the initiative profile cannot be corrected once the deep analysis is accepted (409; the frontend hides «Editar iniciativa»).
- `completed` (the profile exists: `PROFILE_GENERATED` or later) and `deepAnalysisAccepted` are derived by the backend and exposed on `GET /diagnostics/:id`; the frontend decides what to show from them and infers nothing from the state.
- The deep analysis is complete once both of its results are saved: `diagnosis` records when each "calculated" event arrives (`recommendation_calculated_at`, `roadmap_calculated_at`) and, with both, moves the diagnostic to `DEEP_ANALYSIS_COMPLETE` ([ADR 0008](./decisions/0008-deep-analysis-completes-from-its-results.md)).
- `DEEP_ANALYSIS_DECLINED` exists in the state machine but nothing moves a diagnostic into it yet: «Por ahora no» only takes the user to the panel.

## Who does what (backend modules)

| Step | Endpoint | Module | Publishes | Reacts |
| --- | --- | --- | --- | --- |
| Start | `POST /diagnostics` | `diagnosis` | — | — |
| Initiative and consent | `POST /initiatives`, `POST /initiatives/:id/consent` | `initiative` | — | — |
| Initiative profile | `POST /diagnostics/:id/initiative` | `initiative` | `InitiativeRegisteredEvent` | `diagnosis` → `WITH_INITIATIVE` |
| Process | `POST /diagnostics/:id/finalize-initial` | `diagnosis` | — | — |
| Deep analysis | `POST /diagnostics/:id/deep-analysis` | `diagnosis` | `DeepAnalysisRequestedEvent` | `routing` saves the recommendation, `roadmap` saves the roadmap; each then publishes its "calculated" event |
| Results saved | — | `routing`, `roadmap` | `PortfolioRecommendationCalculatedEvent`, `ScalingRoadmapCalculatedEvent` | `diagnosis` → `DEEP_ANALYSIS_COMPLETE` once both arrived |

- Every endpoint that names a diagnostic first checks that it exists and belongs to the caller (RNF-04). `diagnosis`, `routing` and `roadmap` answer someone else's diagnostic as missing (404), so its id is not revealed; the initiative endpoints answer 404 for a missing diagnostic or initiative and 403 for someone else's (`initiative`'s `DiagnosticOwnershipPort` and the initiative's owner). The other modules reach the owner through `diagnosis`'s exported `FindDiagnosisOwnerQuery`.
- `finalize-initial` validates the 48 answers and their justifications in the domain before storing anything, then stores them and computes the profile.
- The deep analysis is idempotent in the state: repeating it re-publishes the event, which retries a calculation that failed (the results page offers «Intentar de nuevo» when the diagnostic says accepted but a result is missing).

## The panel

`/panel` is where the institutional descriptor leads once the user has navigation. It lists nothing by itself: it reads the user's diagnostics (`GET /diagnostics`, most recent first), shows the initiative of the latest one with results, links to correct it (while the deep analysis is not accepted) and to its results, and offers «Continuar diagnóstico» when the latest one is still in the wizard (a single primary button per screen: «Continuar» wins when both exist). The history of past diagnostics has its place reserved; it is a future user story.

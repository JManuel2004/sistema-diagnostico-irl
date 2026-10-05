# The diagnostic, from start to results

How a diagnostic moves through the product: the screens the user goes through, what each one sends, the state the backend keeps and the events between modules. The detail of each endpoint is in Swagger (`/api/docs`); the rules of each module are in its `README.md`.

## Screens

```
/  (landing, public)
 └─ «Iniciar diagnóstico» → /diagnosticos/nuevo   (protected: without a session, INNLAB sign-in first)
      └─ POST /diagnostics  (starts a new one)  → /diagnosticos/:id/asistente/:step
           1 consentimiento  the current consent text; accepting keeps the accepted version in the
                             browser (nothing about the initiative is typed yet)
           2 iniciativa      choose one of the user's initiatives (its latest profile fills the form)
                             or «Nueva iniciativa»; continuing records the acceptance on it and then
                             saves the profile (no new acceptance when it already accepted the current text)
           3 cuestionario    48 statements, each with a Likert value and an optional justification (browser draft)
           4 resumen         review; «Procesar diagnóstico» sends the answers
      └─ /diagnosticos/:id/resultados   maturity profile; invitation to the deep analysis
           └─ «Adquirir análisis profundo» → imbalances, critical state, recommendation, then the roadmap:
              balanced phases, each with the service that could be contracted, and «Al terminar la ruta»:
              how the route leaves each dimension and each pair against today
/panel   where the sign-in lands: the completed diagnostics to consult, «Continuar diagnóstico» only for
         one this tab is filling in, and «Iniciar» a new one
/diagnosticos/:id/iniciativa   correct an already registered initiative profile (not after the deep analysis)
```

- **The wizard has no main navigation**, but «Volver al panel» and the institutional descriptor lead to the panel, where a diagnostic this tab is filling in can be continued. It decides the step from what the server already has (is the diagnostic's initiative profile registered?), never from a local flag: resuming lands on the first missing step, and a later step cannot be opened by URL. A diagnostic that already has results is never resumed; its results open.
- **Starting is always from the beginning** (DIAGIRL-26). `POST /diagnostics` deletes the user's unfinished diagnostics and creates a new one; completed ones stay. The answers of a diagnostic in progress live only in the browser tab (`sessionStorage`): within that tab the panel offers to continue it, and once the tab is closed there is nothing to recover, so it is not offered. Two simultaneous starts from two tabs can each create one, and the second deletes the first (known limit).
- **An initiative has its own identity and its consent is a history** ([ADR 0011](./decisions/0011-initiative-identity-and-consent-per-initiative.md)). The user diagnoses one of their initiatives again or creates a new one; each diagnostic keeps a snapshot of the profile it was computed with. Every acceptance is a new row; the text accepted is the current one of the `consent_terms` catalog, served by `GET /consent-terms/current`.
- **The consent comes first** ([ADR 0015](./decisions/0015-consent-before-the-initiative.md)). Step 1 keeps only the accepted text version in `sessionStorage`. Step 2 creates the new initiative with its first acceptance (`POST /initiatives`) or records a new acceptance for an existing one (`POST /initiatives/:id/consent`), and then registers the profile. The backend refuses a profile whose initiative has not accepted the current text (409); the wizard then forgets the version and goes back to step 1.
- **The questionnaire is answered with the diagnostic's framework version** ([ADR 0012](./decisions/0012-framework-content-versioned.md)): the wizard asks for `GET /catalog/questionnaire?version=<frameworkVersion>`, and the backend rejects answers to statements of another version.
- **The questionnaire is a browser draft** (`useQuestionnaireDraftStore`, `sessionStorage`) until «Procesar diagnóstico». A statement is complete with its Likert value; the justification is optional and travels as `null` when blank. Step 4 cannot be reached with an unanswered statement.
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
| Deep analysis | `POST /diagnostics/:id/deep-analysis` | `diagnosis` | `DeepAnalysisRequestedEvent` | `routing` saves the recommendation, `roadmap` saves the roadmap (asking `routing`'s exported `EvaluatePhaseServiceQuery` for each phase's service); each then publishes its "calculated" event |
| Results saved | — | `routing`, `roadmap` | `PortfolioRecommendationCalculatedEvent`, `ScalingRoadmapCalculatedEvent` | `diagnosis` → `DEEP_ANALYSIS_COMPLETE` once both arrived |

- Every endpoint that names a diagnostic first checks that it exists and belongs to the caller (RNF-04). `diagnosis`, `routing` and `roadmap` answer someone else's diagnostic as missing (404), so its id is not revealed; the initiative endpoints answer 404 for a missing diagnostic or initiative and 403 for someone else's (`initiative`'s `DiagnosticOwnershipPort` and the initiative's owner). The other modules reach the owner through `diagnosis`'s exported `FindDiagnosisOwnerQuery`.
- `finalize-initial` validates the 48 answers and their optional justifications in the domain before storing anything, then stores them and computes the profile.
- The deep analysis is idempotent in the state: repeating it re-publishes the event, which retries a calculation that failed (the results page offers «Intentar de nuevo» when the diagnostic says accepted but a result is missing).

## The panel

`/panel` is where the sign-in and the institutional descriptor lead (DIAGIRL-26). It reads the user's completed diagnostics (`GET /diagnostics`, most recent first) and shows the initiative of the latest one, with links to correct it (while the deep analysis is not accepted) and to its results; then «Tus diagnósticos», every completed one with its initiative, profile date, global level and whether the deep analysis was accepted, each opening its saved results, where the deep analysis can still be accepted. «Continuar diagnóstico» appears only for a diagnostic whose draft this tab holds and that is still unfinished. «Iniciar un diagnóstico nuevo» starts from the beginning. With nothing completed and nothing in progress, starting is the only action. A single primary button per screen: «Continuar», else «Ver resultados», else «Iniciar diagnóstico».

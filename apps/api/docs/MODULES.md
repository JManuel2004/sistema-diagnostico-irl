# API Modules

A walk-through of every NestJS module in `apps/api/src/modules/`. For each: its responsibility, its public surface (use cases + endpoints + repository ports), what's in scope for phase 1, and what's deferred.

Phase 1 implements user stories from epics **E-03 (Cuestionario IRL)** and **E-04 (Diagnóstico inicial de madurez)**. The modules supporting earlier epics (identity, consent, initiative) are scaffolded as walking skeletons so the questionnaire is reachable. Later modules (deep analysis, portfolio routing, report) exist as stubs or empty folders.

| Module                                    | Phase 1 status                        | Owns                                                               |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| [`identity`](#identity)                   | Walking skeleton                      | Keycloak guard, InnLab Core client, user context                   |
| [`irl-catalog`](#irl-catalog)             | Full                                  | Dimensions, statements, conversion table, dimension pairs, sectors |
| [`consent`](#consent)                     | Walking skeleton                      | Ley 1581 consent capture                                           |
| [`initiative`](#initiative)               | Walking skeleton                      | Initiative form (nombre, sector, descripción)                      |
| [`questionnaire`](#questionnaire)         | **Full — phase 1 priority**           | Answer sheet aggregate, completeness checking                      |
| [`maturity-profile`](#maturity-profile)   | **Full — phase 1 priority**           | IRL calculator, bottleneck detector, imbalance evaluator           |
| [`diagnostic`](#diagnostic)               | Full (state machine for phase 1 only) | Process manager orchestrating the diagnostic lifecycle             |
| [`audit`](#audit)                         | Walking skeleton                      | `evento_auditoria` writes                                          |
| [`notifications`](#notifications)         | Stub                                  | Email notifications (real in phase 2)                              |
| [`deep-analysis`](#deep-analysis)         | Empty folder                          | E-06 — RF-12, RF-13, RF-14                                         |
| [`portfolio-routing`](#portfolio-routing) | Empty folder                          | E-06 — RF-15                                                       |
| [`report`](#report)                       | Empty folder                          | E-07 — RF-16                                                       |

---

## `identity`

**Responsibility:** authenticate every request via Keycloak JWT, then resolve the user's profile (name, email, identifier) from the InnLab Core API. Cache aggressively — JWKS once at boot, user context once per session.

**SRS coverage:** RF-00, RF-01. RNF-03, RNF-04, RNF-05.

### Domain

- `UserContext` value object — `{ id, name, email }`. Validated on construction.
- `UserContextPort` — interface, declared in `domain/ports/`.

### Application

- `ResolveUserContextUseCase` — given a Keycloak `sub` claim, returns the `UserContext`. Calls the port, caches the result for the session TTL.

### Infrastructure

- `JwksProvider` — downloads Keycloak JWKS at boot via `jwks-rsa`, refreshes on `kid` mismatch.
- `KeycloakStrategy` (passport-jwt) — validates JWT locally, no HTTP per request.
- `KeycloakGuard` — `@UseGuards(KeycloakGuard)` at the controller level.
- `InnlabCoreHttpClient` (implements `UserContextPort`) — calls `GET /users/{id}` with a service token.
- `ServiceTokenProvider` — obtains a token via `client_credentials`, rotates 30s before expiry.
- `UserContextCache` — in-memory LRU keyed by `sub`.

### Interfaces

- `@CurrentUser()` decorator — extracts the resolved `UserContext` from request scope.
- No controllers (identity isn't a user-facing resource; it runs as middleware/interceptor).

### Phase 1 status

Walking skeleton. The guard and user context resolution work end-to-end. No role-based authorization yet — every authenticated user is a "Líder de Iniciativa." Future: `@Roles('innlab-staff')` decorator when the admin role lands in Keycloak.

---

## `irl-catalog`

**Responsibility:** serve the read-only IRL framework data — dimensions, statements, conversion table, dimension pairs, sectors. Catalogs are seeded at deploy time; the app reads only.

**SRS coverage:** RF-05 (questionnaire structure), backing data for RF-07 and RF-12.

### Domain

- `Dimension` — `{ id, code (TRL|CRL|BRL|IPRL|TmRL|FRL), name, order }`.
- `Statement` — `{ id, dimensionCode, sequenceInDimension (1..8), text }`.
- `ConversionRange` — `{ minAverage, maxAverage, irlLevel }`.
- `DimensionPair` — `{ code (e.g. "TRL_CRL"), dimensionA, dimensionB }`.
- `Sector` — `{ id, name }`.
- `IrlCatalogPort` — `getQuestionnaireStructure()`, `getConversionTable()`, `getDimensionPairs()`, `getSectors()`.

### Application

- `GetQuestionnaireStructureQuery.execute()` — returns 6 dimensions × 8 statements, ordered.
- `GetConversionTableQuery.execute()` — returns the 9-row conversion table.

### Infrastructure

- `TypeOrmIrlCatalogRepository` (implements `IrlCatalogPort`) — reads from the `irl_catalog` schema with a read-through in-memory cache (TTL infinite, invalidated only on app restart).
- ORM entities: `DimensionOrm`, `AfirmacionOrm`, `RangoConversionOrm`, `ParDimensionOrm`, `SectorOrm`, `TextoRoadmapOrm`.

### Interfaces

- `GET /api/v1/catalogo/cuestionario` — questionnaire structure for the SPA (HU-07).
- `GET /api/v1/catalogo/sectores` — sectors for the initiative form (RF-04).

### Phase 1 status

Full. Roadmap texts and portfolio routing rules are seeded but not exposed yet (used by phase 2 modules).

### Catalog write rule

Catalogs are read-only at runtime. **Never** write from application code. Changes go through seed files in `src/infrastructure/database/seeds/` and require a migration + seed run.

---

## `consent`

**Responsibility:** capture the user's consent to data processing per **Ley 1581 de 2012** before any other data is stored. RF-03.

### Domain

- `Consentimiento` entity — `{ id, diagnosticoId, aceptado, fechaAceptacion, versionTerminos }`.
- `ConsentVersion` value object — points to the version of terms shown.
- `ConsentRepositoryPort`.

### Application

- `RegisterConsentUseCase` — records the consent with timestamp.

### Interfaces

- `POST /api/v1/diagnosticos/:id/consentimiento`.

### Phase 1 status

Walking skeleton. Only one version of terms; no version history yet. The full UX flow (term version selection, withdrawal of consent) is deferred.

---

## `initiative`

**Responsibility:** capture initiative info (nombre, sector, descripción) before the questionnaire. RF-04.

### Domain

- `Iniciativa` entity — `{ id, diagnosticoId, nombre, sectorId, descripcionBreve }`.
- `InitiativeRepositoryPort`.

### Application

- `RegisterInitiativeUseCase` — validates required fields, saves.

### Interfaces

- `POST /api/v1/diagnosticos/:id/iniciativa`.

### Phase 1 status

Walking skeleton. Single sector list; no taxonomy management.

---

## `questionnaire`

**Responsibility:** receive the 48 Likert answers, verify completeness, persist atomically. RF-05, RF-06.

**Phase 1: highest priority.**

### Domain

- `AnswerSheet` aggregate root — `{ diagnosticId, answers: Answer[] }`. Invariants:
  - Each answer's value is a valid `LikertValue` (1..5).
  - Unique `(diagnosticId, statementId)` (mirrors DB constraint).
  - Dimensional distribution: 8 answers per dimension when complete.
- `Answer` entity — `{ statementId, value: LikertValue }`.
- `CompletenessReport` value object — `{ isComplete: bool, missing: Array<{dimension, sequences}> }`.
- `CompletenessChecker` domain service — pure function: given an `AnswerSheet` and the catalog's statements, produces a `CompletenessReport`.
- `QuestionnaireIncompleteError` — thrown when submit is attempted with gaps. Carries the `CompletenessReport`.
- `AnswerSheetRepositoryPort` — `findByDiagnosticId(id)`, `save(sheet)`. `save()` is atomic: deletes existing answers and inserts new ones in one transaction.

### Application

- `SubmitQuestionnaireUseCase` — validates completeness, persists, emits `AnswersSubmittedEvent`.
- `GetQuestionnaireProgressUseCase` — returns the current state of answers for resume.
- (Optional in phase 1) `SaveDraftAnswersUseCase` — for autosave from the frontend. May or may not ship in phase 1 depending on whether the frontend keeps drafts in `sessionStorage` only.

### Infrastructure

- `TypeOrmAnswerSheetRepository`.
- `RespuestaOrm` (ORM entity for `irl_diagnostic.respuesta`).

### Interfaces

- `POST /api/v1/diagnosticos/:id/cuestionario/envio` (HU-10 submission).
- `GET /api/v1/diagnosticos/:id/cuestionario` (progress/resume).

### Testing focus

- Property-based: any 48 valid Likert values produce a complete sheet.
- Edge cases for `CompletenessChecker`: 0 answers, 47 answers, duplicate `statementId` (rejected), invalid `value`.
- E2E for both HU-10 scenarios (incomplete blocked, complete accepted).

---

## `maturity-profile`

**Responsibility:** compute the IRL maturity profile from a submitted answer sheet. RF-07, RF-08, RF-09 (the calculation half), RF-10.

**Phase 1: highest priority. The IRL calculator is the core IP of the project.**

### Domain

- `MaturityProfile` aggregate root — `{ diagnosticId, computedAt, results: DimensionResult[], bottleneck: DimensionCode[], imbalances: ImbalancePair[] }`.
- `DimensionResult` value object — `{ dimensionCode, averageLikert, irlLevel }`.
- `Bottleneck` value object — list of dimension codes with the minimum IRL level (multiple if tied per RF-08).
- `ImbalancePair` value object — `{ pairCode, dimensionA, dimensionB, difference, classification: 'CRITICAL'|'MODERATE'|'ACCEPTABLE' }`.
- `IrlCalculatorService` — pure domain service. Inputs: `Map<DimensionCode, LikertValue[]>` and a `ConversionTable`. Output: `DimensionResult[]`. RF-07.
- `BottleneckDetectorService` — given six `DimensionResult`, returns the bottleneck dimensions (handles ties).
- `ImbalanceEvaluatorService` — given six `DimensionResult` and the catalog's `DimensionPair[]`, classifies each pair. RF-10.
- `CalculationError` — thrown if the calculation produces an inconsistent result (HU-11 second scenario; no partial results stored).
- `MaturityProfileRepositoryPort`.

### Application

- `ComputeMaturityProfileUseCase` — called by the diagnostic orchestrator. Loads catalogs, runs the three services in sequence, persists `resultado_dimension` + `analisis_desequilibrio` in one transaction. Returns the assembled `MaturityProfile`.
- `GetMaturityProfileUseCase` — read-only; returns the persisted profile (HU-03 resume scenario).

### Infrastructure

- `TypeOrmMaturityProfileRepository`.
- ORM entities: `ResultadoDimensionOrm`, `AnalisisDesequilibrioOrm`.

### Interfaces

- `GET /api/v1/diagnosticos/:id/perfil`.

### Testing focus

- **Property-based testing for `IrlCalculatorService`.** `fast-check` generates arbitrary 48-Likert inputs; for any input, six levels in 1..9 are produced. This is the single highest-ROI test in the project.
- Boundary tests on the conversion table: 1.00, 1.39, 1.40, 2.19, 2.20, 4.39, 4.40, 5.00.
- Tie cases for `BottleneckDetectorService`: 1 minimum, 2 tied, 3 tied, all 6 equal.
- All classifications for `ImbalanceEvaluatorService` over the six pairs.

---

## `diagnostic`

**Responsibility:** orchestrate the diagnostic lifecycle. The other modules don't call each other; the orchestrator composes them.

**SRS coverage:** RF-02 (list diagnostics), plus the state machine of the whole flow.

### Domain

- `Diagnostico` aggregate root — `{ id, userId, initiativeId, consentId, state: DiagnosticState, version, ... }`.
- `DiagnosticState` value object — state machine:

  ```
  INICIADO
    → CON_CONSENTIMIENTO
      → CON_INICIATIVA
        → CUESTIONARIO_EN_CURSO
          → CUESTIONARIO_COMPLETO
            → PERFIL_GENERADO
              → ANALISIS_PROFUNDO_DECLINADO | ANALISIS_PROFUNDO_EN_CURSO → ANALISIS_PROFUNDO_COMPLETO
  ```

  Phase 1 ships the states up to `PERFIL_GENERADO`. Later states are valid in the type system but no use case transitions into them yet.

- `DiagnosticoRepositoryPort`.

### Application

- `StartDiagnosticUseCase` — creates a new diagnostic in `INICIADO`.
- `AdvanceToQuestionnaireUseCase` — checks the diagnostic has consent + initiative, transitions to `CUESTIONARIO_EN_CURSO`.
- `FinalizeInitialDiagnosticUseCase` — **the orchestration**. After the questionnaire is submitted:
  1. Loads the `AnswerSheet` via the questionnaire module's read API.
  2. Calls `ComputeMaturityProfileUseCase`.
  3. Persists the profile.
  4. Transitions the diagnostic to `PERFIL_GENERADO`.
  5. Emits `InitialProfileGeneratedEvent` (consumed by notifications).
- `ListMyDiagnosticsUseCase` — HU-03.
- `GetDiagnosticDetailUseCase` — single diagnostic by ID, with ownership check (RNF-04).

### Infrastructure

- `TypeOrmDiagnosticoRepository`.
- `DiagnosticoOrm`.

### Interfaces

- `POST /api/v1/diagnosticos` — start new.
- `GET /api/v1/diagnosticos` — list user's diagnostics (HU-03).
- `GET /api/v1/diagnosticos/:id` — detail.

### Phase 1 status

Full for phase 1's states (up to `PERFIL_GENERADO`). The orchestrator is the _only_ place where multiple modules are composed; this is the architectural contract from C4 Level 3.

---

## `audit`

**Responsibility:** write `evento_auditoria` rows at every important state transition (consent given, questionnaire submitted, profile generated, report downloaded). Read-only from the application's perspective — the audit log isn't queried by features.

### Domain

- `AuditEvent` — `{ id, diagnosticoId, tipo, timestamp, userId, payload }`.
- `AuditPort`.

### Application

- `RecordAuditEventUseCase` — fire-and-forget. Failure to record an audit event does not interrupt the user flow but does emit an error log.

### Phase 1 status

Walking skeleton. Records the critical events (consent, submit, profile generated) only. Full event taxonomy is phase 2.

---

## `notifications`

**Responsibility:** email the INNLAB team when the user completes phase 1 (RF-17) and phase 2 (RF-18).

### Domain

- `NotificationDeliveryAttempt` — `{ diagnosticoId, type, recipient, status, attemptNumber, timestamp }`.
- `MailerPort`.

### Application

- `SendInitialProfileNotificationUseCase` — subscribes to `InitialProfileGeneratedEvent`.

### Infrastructure

- `NodemailerAdapter` (implements `MailerPort`).
- `NotificacionOrm`.

### Phase 1 status

Stub. The event listener is wired but no email is actually sent in phase 1 (per the backlog priorities, HU-23 is medium and outside the phase 1 scope). The persistence side records attempts even when sending is stubbed.

---

## `deep-analysis`

**Phase 1 status:** empty folder, listed here for future readers. Implements E-06: deep imbalance analysis, roadmap generation, dimension criticality alerts (RF-12, RF-13, RF-14).

The dependencies that are already in place: `ImbalanceEvaluatorService` in `maturity-profile`, plus the `texto_roadmap` catalog data.

---

## `portfolio-routing`

**Phase 1 status:** empty folder. Implements RF-15: select the most appropriate INNLAB service for the user based on their profile. Uses the `regla_enrutamiento` catalog (already seeded).

---

## `report`

**Phase 1 status:** empty folder. Implements RF-16: PDF export of the full diagnostic. Recommended approach (deferred): Puppeteer rendering the same React components the SPA already uses, so the radar chart and layout are identical.

---

## Cross-module rules (recap)

- **The Diagnostic module is the only orchestrator.** No other module calls into another module's use cases. Cross-module communication goes through the orchestrator or through domain events.
- **Modules reference each other by ID only.** Never pass entity objects across module boundaries.
- **Repositories live behind ports.** Application code injects the port (by `Symbol`), infrastructure provides the binding.
- **Catalogs are read-only.** Always. From every module.

If any of these feel inconvenient for the change you're making, you're probably crossing a module boundary that shouldn't be crossed. Pause and rethink.

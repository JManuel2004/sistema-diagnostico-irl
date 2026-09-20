# diagnosis

## Alcance
Ejecuta el cuestionario IRL (48 afirmaciones, escala Likert 1..5) y calcula el perfil de madurez (nivel 1..9 por dimensión, cuello de botella, brechas, desequilibrios). Es dueño de la máquina de estados del diagnóstico. **No cubre** el consentimiento ni el perfil de la iniciativa (`initiative/`), ni la recomendación de portafolio y el roadmap (`routing/`, `roadmap/`) — ver la tabla 1.1 de `convenciones-objetivo.md`.

## Reglas que deben respetarse
- Seis dimensiones (`TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`), ocho afirmaciones por dimensión, 48 en total; la tabla de conversión SA-06 es fija. Un envío con un número de respuestas distinto de 48 es un `InvariantViolationError`.
- Los seis pares de desequilibrio son exactamente TRL–CRL, TRL–BRL, CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL; ante empate, el cuello de botella incluye **todas** las dimensiones empatadas.
- **Estado crítico (RF-13):** solo CRL, BRL y TmRL pueden estar en estado crítico (una brecha en ellas); TRL, IPRL y FRL no reciben esa alerta cualquiera que sea su nivel. Lo dice `dimension.is_critical_dimension` y lo aplica `MaturityProfile.criticalState()`; `dimension_result.in_critical_state` se deriva de ahí.
- Las transiciones de estado son lineales (`diagnosis-state.vo.ts`); nunca se salta ni se retrocede.
- `diagnosis/` no llama a `routing/` ni a `roadmap/`: publica `DeepAnalysisRequestedEvent` y cada uno reacciona por su cuenta. El evento se publica solo **después** de guardar la transición.
- **La justificación de cada respuesta es obligatoria** (`Answer`: no vacía tras `trim`, hasta 1000 caracteres; `answer.justification` es `NOT NULL` con un `CHECK` que exige algún carácter que no sea espacio). Un envío con una justificación vacía o ausente es un `InvariantViolationError` (422) y no guarda nada.
- El perfil trae `criticalState` (RF-13) ya calculado: el cliente no lo deduce de las brechas. El diagnóstico trae `completed` (ya tiene su perfil: `PROFILE_GENERATED` o posterior) y `deepAnalysisAccepted`, ambos derivados del estado en el backend; el cliente no los infiere.
- **Iniciar un diagnóstico es idempotente por usuario** (`StartDiagnosisUseCase`): si el último diagnóstico del usuario no está `completed`, se devuelve ese en lugar de crear otro; solo se crea uno nuevo si no tiene ninguno o el último ya tiene su perfil. El diagnóstico nuevo queda en `STARTED`: el consentimiento y la iniciativa lo mueven por eventos.
- Un diagnóstico ajeno se responde como inexistente (404), no como prohibido, para no revelar su id.
- Los casos de uso devuelven `Result<T, E>` para los resultados de negocio previsibles; solo los invariantes de dominio y los fallos de infraestructura se lanzan.

## Nivel de completitud
- Implementado: cuestionario (E-03) con la justificación de cada respuesta, perfil de madurez (E-04) con el estado crítico, aceptación del análisis profundo (RF-11), reacción al consentimiento (RF-03) y a la iniciativa (RF-04), inicio de un diagnóstico propio (HU-04, `StartDiagnosisUseCase`) y lectura de un diagnóstico propio (`GetDiagnosisUseCase`).
- **Consentimiento e iniciativa son pasos obligatorios** (backlog 14.17, resuelto): `StartDiagnosisUseCase` deja el diagnóstico en `STARTED`; `ConsentRecordedEvent` lo lleva a `WITH_CONSENT`, `InitiativeRegisteredEvent` a `WITH_INITIATIVE` y procesar el cuestionario lo lleva por `QUESTIONNAIRE_IN_PROGRESS` hasta `PROFILE_GENERATED`.
- **Límite conocido:** la comprobación de «ya tiene uno sin terminar» y la inserción no son atómicas; dos peticiones simultáneas (dos pestañas) pueden crear un diagnóstico cada una (backlog, sección 16).
- Pendiente: la verificación de propiedad del diagnóstico solo está en `initiative/` (hallazgo 14.2).

## Responsabilidad (lenguaje ubicuo)
"Hacer el diagnóstico": responder las 48 afirmaciones, obtener el nivel de madurez de la iniciativa en cada dimensión y saber dónde está el cuello de botella y qué desequilibrios hay entre dimensiones.

## Conceptos de dominio
`Diagnosis` (agregado + `DiagnosisState`), `AnswerSheet` / `Answer`, `Statement`, `MaturityProfile` con `DimensionResult`, `ImbalanceResult` y `CompletenessReport`; servicios de dominio `IrlCalculatorService` e `ImbalanceEvaluatorService`.

## Qué expone hacia afuera
- **Puertos:** `DIAGNOSIS_REPOSITORY`, `ANSWER_SHEET_REPOSITORY`, `MATURITY_PROFILE_REPOSITORY`; casos de uso `GetMaturityProfileUseCase` y `ComputeMaturityProfileUseCase`.
- **Eventos que publica:** `DeepAnalysisRequestedEvent` (`shared/kernel/events/`).
- **Eventos que escucha:** `ConsentRecordedEvent` e `InitiativeRegisteredEvent` (publicados por `initiative/`).
- **HTTP:** `diagnostics` (`POST`, inicia un diagnóstico del usuario autenticado), `diagnostics/:id` (`GET`, uno propio), `diagnostics/:id/finalize-initial`, `diagnostics/:id/deep-analysis`, `diagnostics/:id/questionnaire`, `diagnostics/:id/profile`, `catalog/questionnaire`. El detalle de contratos está en Swagger (`/api/docs`). El perfil nombra cada dimensión con `name` y `shortName` del catálogo (`GetMaturityProfileUseCase`); el frontend no mantiene nombres propios.

## De qué depende
- `shared/irl-taxonomy` a través de `TAXONOMY_REPOSITORY` (solo `GetQuestionnaireStructureQuery`).
- **Violación conocida:** `TypeOrmMaturityProfileRepository` y `TypeOrmImbalanceRepository` leen `DimensionOrm`/`DimensionPairOrm` directamente en vez de pasar por el puerto (backlog 1.3/3.2 — resuelto en `routing/` y `roadmap/`, abierto aquí).

## Datos que posee
Escribe: `irl_diagnostic.diagnostic`, `answer`, `dimension_result`, `imbalance_analysis`. Lee (no escribe): `irl_catalog.statement`, `dimension`, `dimension_pair`, `conversion_range`.

## Cobertura de pruebas
- **Unitarias:** dominio (calculadora, evaluador de desequilibrios, agregados, VOs), casos de uso, controladores, listener de consentimiento.
- **Integración:** `answer-sheet-repository` (la justificación se guarda y la base la exige).
- **E2E:** `get-questionnaire-structure`, `deep-analysis-events` (flujo AgroConecta por eventos), `start-diagnosis`, y `initiative/registration-flow` (justificación obligatoria, estado crítico, `deepAnalysisAccepted`).
- **Falta:** integración de `typeorm-answer-sheet`, `typeorm-maturity-profile`, `typeorm-imbalance` y `typeorm-diagnosis` contra base real (backlog 12.1) — una prueba así habría detectado el mapeo obsoleto `id_diagnostico` corregido en esta fase.

# diagnosis

## Alcance
Ejecuta el cuestionario IRL (48 afirmaciones, escala Likert 1..5) y calcula el perfil de madurez (nivel 1..9 por dimensión, cuello de botella, brechas, desequilibrios). Es dueño de la máquina de estados del diagnóstico. **No cubre** el consentimiento ni el perfil de la iniciativa (`initiative/`), ni la recomendación de portafolio y el roadmap (`routing/`, `roadmap/`) — ver la tabla 1.1 de `convenciones-objetivo.md`.

## Reglas que deben respetarse
- Seis dimensiones (`TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`), ocho afirmaciones por dimensión, 48 en total; la tabla de conversión SA-06 es fija. Un envío con un número de respuestas distinto de 48 es un `InvariantViolationError`.
- Los seis pares de desequilibrio son exactamente TRL–CRL, TRL–BRL, CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL; ante empate, el cuello de botella incluye **todas** las dimensiones empatadas.
- Las transiciones de estado son lineales (`diagnosis-state.vo.ts`); nunca se salta ni se retrocede.
- `diagnosis/` no llama a `routing/` ni a `roadmap/`: publica `DeepAnalysisRequestedEvent` y cada uno reacciona por su cuenta. El evento se publica solo **después** de guardar la transición.
- Los casos de uso devuelven `Result<T, E>` para los resultados de negocio previsibles; solo los invariantes de dominio y los fallos de infraestructura se lanzan.

## Nivel de completitud
- Implementado: cuestionario (E-03), perfil de madurez (E-04), aceptación del análisis profundo (RF-11), reacción al consentimiento (RF-03).
- Pendiente: las transiciones `WITH_INITIATIVE` y `QUESTIONNAIRE_IN_PROGRESS` existen en la máquina de estados pero nada las dispara todavía (backlog, hallazgo 14.1); la verificación de propiedad del diagnóstico solo está en `initiative/` (hallazgo 14.2).

## Responsabilidad (lenguaje ubicuo)
"Hacer el diagnóstico": responder las 48 afirmaciones, obtener el nivel de madurez de la iniciativa en cada dimensión y saber dónde está el cuello de botella y qué desequilibrios hay entre dimensiones.

## Conceptos de dominio
`Diagnosis` (agregado + `DiagnosisState`), `AnswerSheet` / `Answer`, `Statement`, `MaturityProfile` con `DimensionResult`, `ImbalanceResult` y `CompletenessReport`; servicios de dominio `IrlCalculatorService` e `ImbalanceEvaluatorService`.

## Qué expone hacia afuera
- **Puertos:** `DIAGNOSIS_REPOSITORY`, `ANSWER_SHEET_REPOSITORY`, `MATURITY_PROFILE_REPOSITORY`; casos de uso `GetMaturityProfileUseCase` y `ComputeMaturityProfileUseCase`.
- **Eventos que publica:** `DeepAnalysisRequestedEvent` (`shared/kernel/events/`).
- **Eventos que escucha:** `ConsentRecordedEvent` (publicado por `initiative/`).
- **HTTP:** `diagnostics/:id/finalize-initial`, `diagnostics/:id/deep-analysis`, `diagnostics/:id/questionnaire`, `diagnostics/:id/profile`, `catalog/questionnaire`. El detalle de contratos está en Swagger (`/api/docs`).

## De qué depende
- `shared/irl-taxonomy` a través de `TAXONOMY_REPOSITORY` (solo `GetQuestionnaireStructureQuery`).
- **Violación conocida:** `TypeOrmMaturityProfileRepository` y `TypeOrmImbalanceRepository` leen `DimensionOrm`/`DimensionPairOrm` directamente en vez de pasar por el puerto (backlog 1.3/3.2 — resuelto en `routing/` y `roadmap/`, abierto aquí).

## Datos que posee
Escribe: `irl_diagnostic.diagnostic`, `answer`, `dimension_result`, `imbalance_analysis`. Lee (no escribe): `irl_catalog.statement`, `dimension`, `dimension_pair`, `conversion_range`.

## Cobertura de pruebas
- **Unitarias:** dominio (calculadora, evaluador de desequilibrios, agregados, VOs), casos de uso, controladores, listener de consentimiento.
- **E2E:** `get-questionnaire-structure`, `deep-analysis-events` (flujo AgroConecta por eventos).
- **Falta:** integración de `typeorm-answer-sheet`, `typeorm-maturity-profile`, `typeorm-imbalance` y `typeorm-diagnosis` contra base real (backlog 12.1) — una prueba así habría detectado el mapeo obsoleto `id_diagnostico` corregido en esta fase.

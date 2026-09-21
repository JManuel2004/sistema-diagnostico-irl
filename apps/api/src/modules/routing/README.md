# routing

## Alcance
Calcula la recomendación de portafolio de INNLAB para un diagnóstico: fichas ordinales → exclusiones (elegibilidad) → puntaje (afinidad) → ajustes (excepciones) → explicación con traza por capas. Incluye el catálogo de los seis servicios. **No cubre** el perfil de madurez (`diagnosis/`) ni el roadmap (`roadmap/`).

## Reglas que deben respetarse
- **No hay versionado de configuración**: existe una sola configuración de puntaje (`scoring_parameters` es un singleton por índice único) y el motor no lee versiones históricas — retirado deliberadamente (backlog 5.6).
- `layer_trace` se conserva: es la auditoría de cada cálculo, no versionado de configuración.
- Una recomendación por diagnóstico (`UNIQUE (id_diagnostic)`); recalcular la reemplaza, no acumula.
- No lee `DimensionOrm`: consume `shared/irl-taxonomy` solo por su puerto.
- No es llamado por `diagnosis/`: reacciona a `DeepAnalysisRequestedEvent`. Un `Result.err` en el listener se registra y no propaga, para no impedir que `roadmap/` reaccione.

## Nivel de completitud
Implementado: motor de tres capas, traza, persistencia idempotente, caso de aceptación AgroConecta. Sin pantalla de administración de la configuración (fuera de alcance, backlog 5.6). El antiguo `POST diagnostics/:id/recommendation` se retiró (backlog 14.3): la recomendación solo se genera por `DeepAnalysisRequestedEvent`.

## Responsabilidad (lenguaje ubicuo)
"Qué servicio de INNLAB le conviene a esta iniciativa y por qué": la recomendación, sus alternativas y la explicación de cómo se llegó a ella.

## Conceptos de dominio
`Recommendation` (agregado), `OrdinalProfile`, `CalibrationScale`, `ScoringParameters`, `ScoredCandidate`; servicios `EligibilityFilter`, `AffinityScorer`, `ExceptionEngine`, `OrdinalTranslator`, `PredicateCompiler`.

## Qué expone hacia afuera
- **Eventos que publica:** `PortfolioRecommendationCalculatedEvent` (`shared/kernel/events/`, pensado para `reporting/`).
- **Eventos que escucha:** `DeepAnalysisRequestedEvent`.
- **HTTP (solo lectura):** `GET diagnostics/:id/recommendation` y `…/recommendation/trace`. Contratos en Swagger.

## De qué depende
`diagnosis/` por `GetMaturityProfileUseCase`; `initiative/` por `GetInitiativeCharacterizationUseCase` (vía `InitiativeCharacterizationPort`); `shared/irl-taxonomy` por `TAXONOMY_REPOSITORY`.

## Datos que posee
Escribe: `irl_diagnostic.portfolio_recommendation`, `recommendation_alternative`, `layer_trace`. Es dueño (solo seed) de: `irl_catalog.portfolio_service`, `published_ordinal_profile`, `published_ordinal_intensity`, `published_eligibility_rule`, `published_exception_rule`, `scoring_parameters`, `calibration_label_value`.

## Cobertura de pruebas
- **Unitarias:** dominio del motor, aceptación AgroConecta (`acceptance/agroconecta.spec.ts`), casos de uso, listener.
- **Integración:** `recommendation-repository` (persistencia y atomicidad).
- **E2E:** `generate-recommendation`, `deep-analysis-events`.

- **La justificación de la recomendación la lee el líder de la iniciativa:** nombra las dimensiones por su nombre corto del catálogo y no por su código ni por la etiqueta ordinal interna (`primary`, `secondary`); cuando decide un ajuste, cita la razón declarada por el centro.


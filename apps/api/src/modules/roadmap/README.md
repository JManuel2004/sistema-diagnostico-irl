# roadmap

## Alcance
Calcula el roadmap de escalamiento: qué dimensiones subir, en qué orden y hasta qué nivel, a partir del perfil de madurez y del grafo de dependencias entre dimensiones. **No cubre** el perfil (`diagnosis/`) ni la recomendación de portafolio (`routing/`).

## Reglas que deben respetarse
- El grafo de dependencias no está versionado: no existe un indicador de arista activa (`dimension_dependency.is_active` se retiró, backlog 5.6).
- El roadmap es un **resultado guardado con su fecha**, como el perfil y la recomendación: se calcula y se guarda cuando el usuario acepta el análisis profundo (`DeepAnalysisRequestedEvent`), y `GET` solo lo lee; antes de aceptar responde `409 ROADMAP_NOT_GENERATED`. Un diagnóstico tiene un solo roadmap: calcular de nuevo lo reemplaza.
- El cálculo sigue siendo una función pura del perfil y del grafo; solo el resultado se guarda.
- El orden es refutable: cada dimensión expone qué desbloquea, por qué está en el plan (`inclusionReason`: por debajo de su mínimo o habilitadora de otra) y qué fija su meta (`targetDrivenBy`: la dimensión que la exige, o `null` si la meta es su mínimo esperado).
- No lee `DimensionOrm`: usa `shared/irl-taxonomy` por su puerto.
- Reacciona a `DeepAnalysisRequestedEvent` de forma independiente de `routing/`; un `Result.err` se registra y no propaga.

## Nivel de completitud
Implementado: cierre transitivo, capas topológicas, nivel objetivo por dimensión con su explicación, caso AgroConecta y persistencia del resultado (`scaling_roadmap`, `jsonb` con las fases en códigos de dimensión; los nombres se leen del catálogo). `GenerateScalingRoadmapUseCase` calcula y guarda; el listener lo ejecuta y publica `ScalingRoadmapCalculatedEvent` solo tras un cálculo exitoso, nunca en un `GET` (backlog 14.4).

## Responsabilidad (lenguaje ubicuo)
"Por dónde escalar": el camino ordenado de mejoras que le conviene a la iniciativa según su perfil.

## Conceptos de dominio
`ScalingRoadmap` (agregado), `DependencyGraph`; servicios `RoadmapClosureService`, `TopologicalLayeringService`, `TargetLevelCalculatorService` (incluye `demandedBy`, que nombra a la dimensión que fija una meta).

## Qué expone hacia afuera
- **Eventos que publica:** `ScalingRoadmapCalculatedEvent` (`shared/kernel/events/`, pensado para `reporting/`).
- **Eventos que escucha:** `DeepAnalysisRequestedEvent`.
- **HTTP:** `diagnostics/:id/roadmap` (lee el roadmap guardado). Contrato en Swagger. Nombra cada dimensión con su `name` y `shortName` del catálogo (`GetScalingRoadmapUseCase`); el frontend no mantiene nombres propios.

## De qué depende
`diagnosis/` por `GetMaturityProfileUseCase`; `shared/irl-taxonomy` por `TAXONOMY_REPOSITORY`.

## Datos que posee
Escribe `irl_diagnostic.scaling_roadmap` (una fila por diagnóstico). Es dueño (solo seed) de `irl_catalog.dimension_dependency` y `roadmap_text`.

## Cobertura de pruebas
- **Unitarias:** dominio (grafo, cierre, capas, niveles y `demandedBy`), aceptación AgroConecta, casos de uso (calcular y guardar; leer lo guardado, `ROADMAP_NOT_GENERATED`), listener.
- **Integración:** `roadmap-graph-seed`, `roadmap-repository` (lo leído es lo guardado, reemplazo, borrado en cascada).
- **E2E:** `roadmap` (409 antes de aceptar, explicación en la respuesta HTTP, fecha estable entre lecturas), `deep-analysis-events`.

# roadmap

## Alcance
Calcula el roadmap de escalamiento: qué dimensiones subir, en qué orden y hasta qué nivel, a partir del perfil de madurez y del grafo de dependencias entre dimensiones. **No cubre** el perfil (`diagnosis/`) ni la recomendación de portafolio (`routing/`).

## Reglas que deben respetarse
- El grafo de dependencias no está versionado: no existe un indicador de arista activa (`dimension_dependency.is_active` se retiró, backlog 5.6).
- El roadmap **no se persiste**: se calcula en cada consulta y en cada evento; es una función pura del perfil y del grafo.
- El orden es refutable: cada paso expone qué desbloquea.
- No lee `DimensionOrm`: usa `shared/irl-taxonomy` por su puerto.
- Reacciona a `DeepAnalysisRequestedEvent` de forma independiente de `routing/`; un `Result.err` se registra y no propaga.

## Nivel de completitud
Implementado: cierre transitivo, capas topológicas, nivel objetivo por dimensión, caso AgroConecta. Como el cálculo no se persiste, el listener solo lo ejecuta y publica el evento. Publica `ScalingRoadmapCalculatedEvent` en **cada** cálculo, también en los `GET` (backlog 14.4).

## Responsabilidad (lenguaje ubicuo)
"Por dónde escalar": el camino ordenado de mejoras que le conviene a la iniciativa según su perfil.

## Conceptos de dominio
`ScalingRoadmap` (agregado), `DependencyGraph`; servicios `RoadmapClosureService`, `TopologicalLayeringService`, `TargetLevelCalculatorService`.

## Qué expone hacia afuera
- **Eventos que publica:** `ScalingRoadmapCalculatedEvent` (`shared/kernel/events/`, pensado para `reporting/`).
- **Eventos que escucha:** `DeepAnalysisRequestedEvent`.
- **HTTP:** `diagnostics/:id/roadmap`. Contrato en Swagger.

## De qué depende
`diagnosis/` por `GetMaturityProfileUseCase`; `shared/irl-taxonomy` por `TAXONOMY_REPOSITORY`.

## Datos que posee
Nada que escriba en tiempo de ejecución. Es dueño (solo seed) de `irl_catalog.dimension_dependency` y `roadmap_text`.

## Cobertura de pruebas
- **Unitarias:** dominio (grafo, cierre, capas, niveles), aceptación AgroConecta, caso de uso, listener.
- **Integración:** `roadmap-graph-seed`.
- **E2E:** `roadmap`, `deep-analysis-events`.

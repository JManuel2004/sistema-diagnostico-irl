# irl-taxonomy

## Alcance
El catálogo de solo lectura del marco KTH IRL: las seis dimensiones, sus pares de desequilibrio y la tabla de conversión promedio→nivel (SA-06). Es Shared Kernel: cualquier módulo puede importar su dominio. **No cubre** las afirmaciones del cuestionario (`diagnosis/`).

## Reglas que deben respetarse
- **Solo lectura en tiempo de ejecución**: los datos cambian únicamente por seed, y el seed exige una migración.
- Los códigos de dimensión son exactamente `TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`; la escala IRL es 1..9.
- Los demás módulos lo consumen **solo por `TAXONOMY_REPOSITORY`**; leer `DimensionOrm` directamente no es una excepción aceptada.

## Nivel de completitud
Implementado y en uso por `routing/`, `roadmap/` y `GetQuestionnaireStructureQuery`. Pendiente: `diagnosis/` aún accede a `DimensionOrm` directamente.

## Responsabilidad (lenguaje ubicuo)
"El marco": qué dimensiones se miden, cómo se convierte un promedio en un nivel y qué pares de dimensiones se comparan.

## Conceptos de dominio
`Dimension` (incluye el nivel mínimo esperado), `DimensionPair`, `ConversionRange`.

## Qué expone hacia afuera
Puerto `TAXONOMY_REPOSITORY`; entidades de dominio `Dimension`, `DimensionPair`, `ConversionRange`. Sin endpoints ni eventos.

## De qué depende
Solo de `shared/kernel`.

## Datos que posee
`irl_catalog.dimension`, `dimension_pair`, `conversion_range` (escritos solo por seed).

## Cobertura de pruebas
- **Unitarias:** entidades `Dimension`, `DimensionPair` y `ConversionRange`.
- **Integración:** `seed` (idempotencia y contenido del seed).
- **Falta:** integración del repositorio contra base real.

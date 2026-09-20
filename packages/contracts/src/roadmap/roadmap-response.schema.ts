import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionCodeSchema, dimensionRefSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Por qué una dimensión está en el roadmap. Fuente única: el dominio deriva
 * su tipo de esta lista.
 *
 *  - `BELOW_EXPECTED_MINIMUM`: está por debajo de su mínimo esperado.
 *  - `REQUIRED_ENABLER`: cumple su mínimo, pero una dimensión que sí
 *    necesita trabajo depende de que ella llegue a un nivel más alto.
 */
export const ROADMAP_INCLUSION_REASONS = [
  'BELOW_EXPECTED_MINIMUM',
  'REQUIRED_ENABLER',
] as const;

export const roadmapInclusionReasonSchema = z.enum(ROADMAP_INCLUSION_REASONS);

export type RoadmapInclusionReason = z.infer<typeof roadmapInclusionReasonSchema>;

/**
 * Roadmap de escalamiento (RF-14).
 *
 * Una dimensión dentro de una fase: dónde está, a dónde tiene que
 * llegar, y a quién desbloquea al llegar.
 *
 * `inclusionReason` y `targetDrivenBy` responden a «¿por qué esta dimensión
 * y por qué esta meta?». Sin ellos, «nivel 3 → nivel 6» es un número sin
 * explicación; con ellos, el usuario puede ver que la meta la fija otra
 * dimensión que depende de esta.
 *
 * `enables` es la justificación legible del orden. Es lo único que
 * permite a un consultor **refutar** la secuencia propuesta: el sistema
 * puede comprobar que el grafo sea acíclico, pero no que sus aristas
 * sean ciertas, así que exponer el porqué convierte una afirmación
 * metodológica en algo discutible en vez de en una caja negra.
 */
export const roadmapDimensionTargetSchema = z
  .object({
    dimensionCode: dimensionCodeSchema,
    name: z.string().min(1).describe('Nombre completo de la dimensión en español'),
    shortName: z
      .string()
      .min(1)
      .describe('Etiqueta corta de la dimensión, para la línea del roadmap'),
    currentLevel: z.number().int().min(1).max(9),
    targetLevel: z.number().int().min(1).max(9),
    enables: z
      .array(dimensionRefSchema)
      .describe('Dimensiones del roadmap que esta desbloquea al alcanzar su meta'),
    inclusionReason: roadmapInclusionReasonSchema.describe(
      'Por qué la dimensión está en el roadmap',
    ),
    expectedMinimum: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Nivel que la dimensión debería alcanzar por sí misma'),
    targetDrivenBy: dimensionRefSchema
      .nullable()
      .describe(
        'Dimensión del roadmap cuya exigencia fija la meta, si esa exigencia ' +
          'supera el mínimo esperado; null si la meta es el mínimo esperado',
      ),
  })
  .describe('Una dimensión a intervenir dentro de una fase');

export type RoadmapDimensionTarget = z.infer<typeof roadmapDimensionTargetSchema>;

/**
 * Una fase del roadmap.
 *
 * Las dimensiones de una misma fase **no dependen entre sí y se trabajan
 * en paralelo**. El orden dentro del array es el canónico del marco y
 * existe para que la respuesta sea determinista; no es una prioridad, y
 * renderizarlo como lista numerada comunicaría una jerarquía que el
 * sistema no calculó.
 */
export const roadmapPhaseSchema = z
  .object({
    order: z.number().int().positive(),
    dimensions: z.array(roadmapDimensionTargetSchema).min(1),
  })
  .describe('Una fase del roadmap: dimensiones que se trabajan en paralelo');

export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;

/**
 * Respuesta de `GET /api/v1/diagnosticos/:id/roadmap`.
 *
 * Notas sobre lo que **no** lleva, y por qué:
 *
 *  - **Sin servicio de INNLAB por fase.** El enrutador produce
 *    exactamente una recomendación por diagnóstico —lo impone
 *    `uq_recomendacion_diagnostico` y lo exige RF-15— así que no hay un
 *    servicio distinto por fase que consultar. Incluir el campo vacío
 *    prometería algo que el sistema no calcula.
 *
 *  - **Sin duración ni calendario.** Traducir capas a semanas exige un
 *    parámetro de duración por fase que no está definido ni validado con
 *    INNLAB. Las fases se entregan como orden, no como cronograma.
 *
 *  - **Sin textos de orientación.** `roadmap_text` está vacía y sus
 *    entradas son un insumo pendiente de INNLAB.
 *
 * `phases` puede venir vacío: significa que la iniciativa cumple el
 * mínimo esperado en las seis dimensiones. No es un error.
 */
export const roadmapResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    generatedAt: z
      .string()
      .datetime()
      .describe('Momento en que se calculó y guardó el roadmap'),
    phases: z.array(roadmapPhaseSchema),
    dimensionsWithoutIntervention: z
      .array(dimensionRefSchema)
      .describe(
        'Dimensiones que no requieren intervención. Explícitas para que su ' +
          'ausencia del plan no se lea como un olvido.',
      ),
  })
  .describe('Roadmap de escalamiento por fases (RF-14)');

export type RoadmapResponse = z.infer<typeof roadmapResponseSchema>;

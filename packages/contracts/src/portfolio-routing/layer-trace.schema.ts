import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * La traza por capas — el artefacto que hace auditable una recomendación.
 *
 * Audiencia: el equipo de INNLAB, no el líder de iniciativa. Muestra qué
 * hizo cada capa y, sobre todo, si el servicio recomendado es el que ganó
 * el cálculo o el que un ajuste puntual colocó ahí.
 *
 * `appliedExceptions` guarda el ranking anterior y posterior de **cada**
 * excepción por separado, no solo el resultado agregado. Sin ese detalle,
 * una recomendación cuestionada seis meses después no se puede atribuir al
 * ajuste concreto que la produjo, que es justo para lo que existe la traza.
 *
 * Los aportes se reportan junto con la etiqueta ordinal que los originó,
 * para que la explicación pueda decir "porque este servicio es *principal*
 * en Modelo de Negocio" y no "porque aportó 1.50". El vocabulario ordinal
 * es el que entiende el equipo de negocio; el número es un detalle de
 * implementación de la calibración.
 */
export const dimensionContributionSchema = z.object({
  dimension: z.string(),
  sourceLabel: z.string(),
  value: z.number(),
});

export const contributionBreakdownSchema = z.object({
  bottleneck: z.object({
    value: z.number(),
    details: z.array(dimensionContributionSchema),
  }),
  gaps: z.object({
    value: z.number(),
    details: z.array(dimensionContributionSchema),
  }),
  imbalances: z.object({
    value: z.number(),
    details: z.array(
      z.object({
        pair: z.string(),
        classification: z.string(),
        sourceLabel: z.string(),
        value: z.number(),
      }),
    ),
  }),
  stageAffinity: z.object({ value: z.number(), matches: z.boolean() }),
  rangePenalty: z.object({ value: z.number(), applied: z.boolean() }),
});

export type ContributionBreakdown = z.infer<typeof contributionBreakdownSchema>;

export const rankingEntrySchema = z.object({
  position: z.number().int().positive(),
  idService: z.number().int().positive(),
  name: z.string(),
  score: z.number(),
  contributions: contributionBreakdownSchema.optional(),
});

export const layer1ExclusionSchema = z.object({
  idService: z.number().int().positive(),
  name: z.string(),
  exclusionMessage: z.string(),
});

export const appliedExceptionSchema = z.object({
  code: z.string(),
  order: z.number().int().positive(),
  action: z.enum(['FORCE', 'VETO', 'PROMOTE', 'DEMOTE']),
  targetService: z.string(),
  declaredReason: z.string(),
  rankingBefore: z.array(rankingEntrySchema),
  rankingAfter: z.array(rankingEntrySchema),
  effect: z.string(),
});

export const discardedExceptionSchema = z.object({
  code: z.string(),
  order: z.number().int().positive(),
  reason: z.string(),
});

export const layerTraceResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    layer1Excluded: z.array(layer1ExclusionSchema),
    rankingBeforeExceptions: z.array(rankingEntrySchema),
    appliedExceptions: z.array(appliedExceptionSchema),
    discardedExceptions: z.array(discardedExceptionSchema),
    rankingAfterExceptions: z.array(rankingEntrySchema),
    /**
     * Verdadero cuando el servicio recomendado NO es el que ganó el
     * cálculo. Es la línea que separa un sistema auditable de uno que
     * parece objetivo sin serlo.
     */
    adjustedByException: z.boolean(),
    incompleteCharacterization: z.array(z.string()),
    configurationVersion: z.number().int().positive(),
    calibrationSnapshot: z.number().int().positive(),
    parametersSnapshot: z.number().int().positive(),
    factsHash: z.string(),
    evaluatedAt: z.string().datetime(),
  })
  .describe('Traza por capas de una evaluación de enrutamiento');

export type LayerTraceResponse = z.infer<typeof layerTraceResponseSchema>;
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type AppliedException = z.infer<typeof appliedExceptionSchema>;
export type DiscardedException = z.infer<typeof discardedExceptionSchema>;
export type Layer1Exclusion = z.infer<typeof layer1ExclusionSchema>;

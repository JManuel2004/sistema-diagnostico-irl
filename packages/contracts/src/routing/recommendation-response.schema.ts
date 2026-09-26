import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Portfolio recommendation as the API exposes it.
 *
 * `resultType` tells a real recommendation from the legitimate outcome in
 * which no candidate cleared the threshold or all were excluded. In that
 * case `primary` is `null` and `noRecommendationReason` explains why: RF-15
 * requires the system not to return an empty or ambiguous recommendation,
 * not to always find one.
 *
 * `alternatives` are positions 2..N. It never includes the primary one.
 *
 * It no longer carries `configurationVersion`: the configuration
 * versioning scheme was retired — there is a single live configuration,
 * with no version history to number.
 */
export const recommendedServiceSchema = z.object({
  idService: z.number().int().positive(),
  name: z.string().min(1),
  position: z.number().int().positive(),
  score: z.number(),
});

export type RecommendedService = z.infer<typeof recommendedServiceSchema>;

export const recommendationResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    resultType: z.enum(['RECOMMENDATION', 'NO_RECOMMENDATION']),
    primary: recommendedServiceSchema.nullable(),
    justification: z.string().nullable(),
    noRecommendationReason: z.string().nullable(),
    alternatives: z.array(recommendedServiceSchema),
    generatedAt: z.string().datetime(),
  })
  .describe('Portfolio recommendation (response)');

export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;

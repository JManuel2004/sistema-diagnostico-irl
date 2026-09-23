import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Recomendación de portafolio tal como la expone la API.
 *
 * `resultType` distingue una recomendación real del desenlace legítimo en
 * que ningún candidato superó el umbral o todos quedaron excluidos. En ese
 * caso `primary` viene `null` y `noRecommendationReason` explica por qué:
 * RF-15 exige que el sistema no devuelva una recomendación vacía ni
 * ambigua, no que siempre encuentre una.
 *
 * `alternatives` son las posiciones 2..N. Nunca incluye la principal.
 *
 * Ya no lleva `configurationVersion`: el esquema de versionado de
 * configuración se retiró — hay una sola configuración
 * vigente, sin historial de versiones que numerar.
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
  .describe('Recomendación de portafolio (response)');

export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;

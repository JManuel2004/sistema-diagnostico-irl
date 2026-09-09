import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Recomendación de portafolio tal como la expone la API.
 *
 * `resultadoTipo` distingue una recomendación real del desenlace
 * legítimo en que ningún candidato superó el umbral o todos quedaron
 * excluidos. En ese caso `principal` viene `null` y `motivoSinRecomendacion`
 * explica por qué: RF-15 exige que el sistema no devuelva una
 * recomendación vacía ni ambigua, no que siempre encuentre una.
 *
 * `alternativas` son las posiciones 2..N. Nunca incluye la principal.
 */
export const servicioRecomendadoSchema = z.object({
  idServicio: z.number().int().positive(),
  nombre: z.string().min(1),
  posicion: z.number().int().positive(),
  puntaje: z.number(),
});

export type ServicioRecomendado = z.infer<typeof servicioRecomendadoSchema>;

export const recomendacionResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    resultadoTipo: z.enum(['RECOMENDACION', 'SIN_RECOMENDACION']),
    principal: servicioRecomendadoSchema.nullable(),
    justificacion: z.string().nullable(),
    motivoSinRecomendacion: z.string().nullable(),
    alternativas: z.array(servicioRecomendadoSchema),
    versionConfiguracion: z.number().int().positive(),
    generadaEn: z.string().datetime(),
  })
  .describe('Recomendación de portafolio (response)');

export type RecomendacionResponse = z.infer<typeof recomendacionResponseSchema>;

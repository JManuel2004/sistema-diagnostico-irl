import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionResultSchema } from './dimension-result.schema.js';
import { bottleneckSchema } from './bottleneck.schema.js';
import { imbalancePairResultSchema } from './imbalance.schema.js';

/**
 * Respuesta del perfil de madurez inicial (RF-07 / HU-11–HU-15).
 *
 * Endpoint: `GET /api/v1/diagnosticos/:id/perfil`.
 *
 * Forma:
 *   - 6 resultados dimensionales (siempre 6, en orden de la dimensión).
 *   - 1 cuello de botella (con manejo de empates) — opcional.
 *   - 6 resultados de desequilibrio (siempre los pares fijos del marco) — opcional.
 *   - `computedAt` permite mostrar la fecha del cálculo en el reporte.
 *
 * Construcción incremental por HU:
 *   - DIAGIRL-34 ("Obtener niveles IRL por dimensión") produce
 *     `dimensionResults` + `computedAt`. `bottleneck` e `imbalances`
 *     llegan `undefined` hasta que las HUs posteriores los compongan.
 *   - DIAGIRL-35 ("Identificar el cuello de botella del perfil") puebla
 *     `bottleneck`.
 *   - DIAGIRL-38 ("Ver alertas visuales de desequilibrio en el perfil
 *     inicial") puebla `imbalances`.
 *
 * Por eso `bottleneck` e `imbalances` son `.optional()` aquí: el response
 * es válido aún cuando esas dos piezas no han sido calculadas todavía.
 * El frontend renderiza condicionalmente cuando llegan.
 *
 * Cache lado-cliente (STATE_MANAGEMENT.md): `staleTime: 5 minutes` —
 * el perfil es un snapshot inmutable después de calculado.
 */
export const maturityProfileResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    computedAt: z.string().datetime().describe('Timestamp ISO-8601 del cálculo del perfil'),
    dimensionResults: z
      .array(dimensionResultSchema)
      .length(6)
      .describe('Resultado por dimensión — exactamente 6 entradas'),
    bottleneck: bottleneckSchema.describe('Cuello de botella — RF-08 / DIAGIRL-35'),
    imbalances: z
      .array(imbalancePairResultSchema)
      .length(6)
      .optional()
      .describe('Análisis de los 6 pares — pobla en DIAGIRL-38; ausente hasta entonces'),
  })
  .describe('Perfil de madurez IRL inicial (response)');

export type MaturityProfileResponse = z.infer<typeof maturityProfileResponseSchema>;

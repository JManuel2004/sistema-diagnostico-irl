import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Los hechos del diagnóstico: la entrada del motor de enrutamiento.
 *
 * Es un contrato deliberadamente explícito. El motor no recibe el
 * agregado `MaturityProfile` ni consulta otros módulos: recibe este
 * objeto plano, ya resuelto por el orquestador. Eso mantiene los
 * servicios de dominio puros y hace que simular un perfil sea construir
 * una estructura, no montar media base de datos.
 *
 * `bottlenecks` es un array porque el mínimo IRL puede empatar (RF-08).
 * Ningún consumidor debe asumir cardinalidad 1.
 *
 * Los cuatro campos de `characterization` son nullable porque el registro
 * de iniciativa (RF-04 / HU-06) no está implementado: hoy nada los
 * escribe. El motor trata `null` como "no coincide" en afinidad de etapa
 * y como "no excluye" en elegibilidad, y lo deja anotado en la traza —
 * una recomendación calculada sin caracterización es más débil, y eso
 * tiene que verse en lugar de pasar en silencio.
 */
export const imbalanceFactClassificationSchema = z.enum([
  'CRITICAL',
  'MODERATE',
  'ACCEPTABLE',
]);

export const imbalanceFactSchema = z.object({
  left: dimensionCodeSchema,
  right: dimensionCodeSchema,
  difference: z.number().int().min(0).max(8),
  classification: imbalanceFactClassificationSchema,
});

export const characterizationSchema = z.object({
  stage: z.string().nullable(),
  sector: z.string().nullable(),
  teamSize: z.number().int().positive().nullable(),
  academicLinkage: z.boolean().nullable(),
});

export type Characterization = z.infer<typeof characterizationSchema>;

export const diagnosticFactsSchema = z
  .object({
    diagnosticId: uuidSchema,
    levelByDimension: z.record(dimensionCodeSchema, z.number().int().min(1).max(9)),
    bottlenecks: z.array(dimensionCodeSchema).min(1),
    gaps: z.array(dimensionCodeSchema),
    imbalances: z.array(imbalanceFactSchema).length(6),
    averageLevel: z.number().min(1).max(9),
    characterization: characterizationSchema,
  })
  .describe('Entrada del motor de enrutamiento de portafolio');

export type DiagnosticFacts = z.infer<typeof diagnosticFactsSchema>;

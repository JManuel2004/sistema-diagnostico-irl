import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * The facts of the diagnostic: the input of the routing engine.
 *
 * It is a deliberately explicit contract. The engine does not receive the
 * `MaturityProfile` aggregate nor query other modules: it receives this
 * plain object, already resolved by the orchestrator. That keeps the domain
 * services pure and makes simulating a profile a matter of building a
 * structure, not of setting up half a database.
 *
 * `bottlenecks` is an array because the minimum IRL can tie (RF-08). No
 * consumer may assume cardinality 1.
 *
 * The four `characterization` fields are nullable because the initiative
 * may lack them. The engine treats `null` as "does not match" in stage
 * affinity and as "does not exclude" in eligibility, and notes it in the
 * trace — a recommendation calculated without characterization is weaker,
 * and that has to show instead of passing silently.
 */
export const imbalanceFactClassificationSchema = z.enum(['CRITICAL', 'MODERATE', 'ACCEPTABLE']);

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
  .describe('Input of the portfolio routing engine');

export type DiagnosticFacts = z.infer<typeof diagnosticFactsSchema>;

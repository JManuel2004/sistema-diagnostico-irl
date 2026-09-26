import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Critical state of the profile (RF-13).
 *
 * Only CRL, BRL and TmRL can be in critical state, and they are when their
 * IRL level is in gap. It is computed in the backend
 * (`MaturityProfile.criticalState()`); the client only shows it.
 */
export const criticalStateSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .describe('Dimensions in critical state (a gap in CRL, BRL or TmRL)'),
  })
  .describe('Dimensions in critical state of the maturity profile');

export type CriticalState = z.infer<typeof criticalStateSchema>;

import { z } from 'zod';

/**
 * The six IRL dimension codes per KTH Innovation Readiness Level framework.
 * TRL: Readiness Level (Technology)
 * CRL: Concept Readiness Level (Market/Client)
 * BRL: Business Model Readiness Level
 * IPRL: Intellectual Property Readiness Level
 * TmRL: Team Readiness Level
 * FRL: Funding Readiness Level
 */
export const dimensionCodeSchema = z
  .enum(['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'])
  .describe('IRL dimension code');

export type DimensionCode = z.infer<typeof dimensionCodeSchema>;

/** Metadata for a single dimension in the questionnaire structure. */
export const dimensionMetadataSchema = z
  .object({
    code: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension in Spanish'),
    description: z.string().describe('Brief description of what the dimension evaluates'),
    sequence: z.number().int().min(1).max(6).describe('Display order: 1–6'),
  })
  .describe('IRL dimension metadata');

export type DimensionMetadata = z.infer<typeof dimensionMetadataSchema>;

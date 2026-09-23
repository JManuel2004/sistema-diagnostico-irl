import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Canonical codes of the 6 dimensions of the KTH Innovation Readiness
 * Level™ framework.
 *
 * Authoritative source: the `irl_catalog.dimension` table (`code`
 * column). The order matches `dimension.sequence` ASC.
 *
 * Note the casing of `TmRL` (KTH writes it this way in its official
 * material — Team Readiness Level with a lowercase `m`).
 */
export const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

export const dimensionCodeSchema = z
  .enum(DIMENSION_CODES)
  .describe('IRL dimension code, one of TRL/CRL/BRL/IPRL/TmRL/FRL');

export type DimensionCode = z.infer<typeof dimensionCodeSchema>;

/**
 * Reference to a dimension with the names the interface shows.
 *
 * Responses that name dimensions by their code (the roadmap, for
 * instance) return them in this shape so the frontend keeps no name map of
 * its own: the database catalog is the only source.
 */
export const dimensionRefSchema = z
  .object({
    code: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension, in Spanish'),
    shortName: z.string().min(1).describe('Short label for tight spaces (axes, cards, lines)'),
  })
  .describe('Reference to an IRL dimension with its names');

export type DimensionRef = z.infer<typeof dimensionRefSchema>;

/**
 * Metadata of an IRL dimension — code, name, description and display
 * order. Used to render the tabs of the questionnaire (HU-07) and the
 * profile grid (HU-13/HU-14).
 */
export const dimensionMetadataSchema = z
  .object({
    id: uuidSchema,
    code: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension, in Spanish'),
    description: z.string().describe('Short description of what the dimension assesses'),
    sequence: z.number().int().min(1).max(6).describe('Display order: 1–6'),
  })
  .describe('Metadata of an IRL dimension');

export type DimensionMetadata = z.infer<typeof dimensionMetadataSchema>;

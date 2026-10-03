import { z } from 'zod';

/**
 * How deep a service goes, from the lightest (`order` 1, Descubre) to the
 * deepest (Alíate). The route by phases of the roadmap never proposes a
 * tier lighter than the one of the previous phase.
 */
export const serviceTierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().positive(),
  tagline: z.string().nullable().describe('The short promise of the tier («Conócenos jugando»)'),
  description: z.string().nullable().describe('What the services of the tier are like'),
});

export type ServiceTier = z.infer<typeof serviceTierSchema>;

/**
 * The band of the initiative's global IRL level (average of the six
 * dimensions) a service suits when the initiative enters it. `null` for a
 * service the portfolio gives no band.
 */
export const serviceBandSchema = z.object({
  minLevel: z.number().int().min(1).max(9),
  maxLevel: z.number().int().min(1).max(9),
});

export type ServiceBand = z.infer<typeof serviceBandSchema>;

/**
 * The card of a portfolio service, as the catalog describes it: what it is,
 * what it can achieve and which initiatives it suits. Read live from the
 * catalog wherever a service is shown (the recommendation, its
 * alternatives, each phase of the roadmap): it describes the service, not
 * the result.
 */
export const serviceDetailSchema = z.object({
  idService: z.number().int().positive(),
  name: z.string().min(1),
  subtitle: z.string().min(1).describe('The formats the service covers'),
  description: z.string().nullable().describe('What the service is about («¿De qué se trata?»)'),
  scope: z.string().min(1).describe('What the service can achieve («Alcance y entregables»)'),
  band: serviceBandSchema.nullable(),
  tier: serviceTierSchema,
});

export type ServiceDetail = z.infer<typeof serviceDetailSchema>;

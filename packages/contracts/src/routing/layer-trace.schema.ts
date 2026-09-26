import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * The trace by layers — the artifact that makes a recommendation
 * auditable.
 *
 * Audience: the INNLAB team, not the initiative leader. It shows what each
 * layer did and, above all, whether the recommended service is the one that
 * won the calculation or the one a manual adjustment put there.
 *
 * `appliedExceptions` keeps the ranking before and after **each** exception
 * separately, not only the aggregate result. Without that detail, a
 * recommendation questioned six months later cannot be attributed to the
 * specific adjustment that produced it, which is exactly what the trace
 * exists for.
 *
 * Contributions are reported together with the ordinal label that
 * produced them, so the explanation can say "because this service is
 * *primary* in Business Model" and not "because it contributed 1.50". The
 * ordinal vocabulary is what the business team understands; the number is
 * an implementation detail of the calibration.
 *
 * It no longer carries `configurationVersion`/`calibrationSnapshot`/
 * `parametersSnapshot`: the configuration versioning scheme was retired —
 * there is a single live configuration, with no version history to
 * number.
 */
export const dimensionContributionSchema = z.object({
  dimension: z.string(),
  sourceLabel: z.string(),
  value: z.number(),
});

export const contributionBreakdownSchema = z.object({
  bottleneck: z.object({
    value: z.number(),
    details: z.array(dimensionContributionSchema),
  }),
  gaps: z.object({
    value: z.number(),
    details: z.array(dimensionContributionSchema),
  }),
  imbalances: z.object({
    value: z.number(),
    details: z.array(
      z.object({
        pair: z.string(),
        classification: z.string(),
        sourceLabel: z.string(),
        value: z.number(),
      }),
    ),
  }),
  stageAffinity: z.object({ value: z.number(), matches: z.boolean() }),
  rangePenalty: z.object({ value: z.number(), applied: z.boolean() }),
});

export type ContributionBreakdown = z.infer<typeof contributionBreakdownSchema>;

export const rankingEntrySchema = z.object({
  position: z.number().int().positive(),
  idService: z.number().int().positive(),
  name: z.string(),
  score: z.number(),
  contributions: contributionBreakdownSchema.optional(),
});

export const layer1ExclusionSchema = z.object({
  ruleCode: z.string().min(1).describe('Code of the eligibility rule that excluded the service'),
  idService: z.number().int().positive(),
  name: z.string(),
  exclusionMessage: z.string(),
});

/**
 * The actions an exception rule can take on the ranking. Single source of
 * truth for the extension point: the domain derives its `ExceptionAction`
 * type from this list, the engine keeps one strategy per entry (the compiler
 * fails until it has one), and only the database `CHECK` constraint
 * (`ck_exception_rule_action`) has to be widened by a migration.
 */
export const EXCEPTION_ACTIONS = ['FORCE', 'VETO', 'PROMOTE', 'DEMOTE'] as const;

export const exceptionActionSchema = z.enum(EXCEPTION_ACTIONS);

export const appliedExceptionSchema = z.object({
  code: z.string(),
  order: z.number().int().positive(),
  action: exceptionActionSchema,
  targetService: z.string(),
  declaredReason: z.string(),
  rankingBefore: z.array(rankingEntrySchema),
  rankingAfter: z.array(rankingEntrySchema),
  effect: z.string(),
});

export const discardedExceptionSchema = z.object({
  code: z.string(),
  order: z.number().int().positive(),
  reason: z.string(),
});

export const layerTraceResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    layer1Excluded: z.array(layer1ExclusionSchema),
    rankingBeforeExceptions: z.array(rankingEntrySchema),
    appliedExceptions: z.array(appliedExceptionSchema),
    discardedExceptions: z.array(discardedExceptionSchema),
    rankingAfterExceptions: z.array(rankingEntrySchema),
    /**
     * True when the recommended service is NOT the one that won the
     * calculation. It is the line that separates an auditable system from
     * one that looks objective without being so.
     */
    adjustedByException: z.boolean(),
    incompleteCharacterization: z.array(z.string()),
    factsHash: z.string(),
    evaluatedAt: z.string().datetime(),
  })
  .describe('Trace by layers of a routing evaluation');

export type LayerTraceResponse = z.infer<typeof layerTraceResponseSchema>;
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type AppliedException = z.infer<typeof appliedExceptionSchema>;
export type DiscardedException = z.infer<typeof discardedExceptionSchema>;
export type Layer1Exclusion = z.infer<typeof layer1ExclusionSchema>;

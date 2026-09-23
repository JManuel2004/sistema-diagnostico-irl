import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionCodeSchema, dimensionRefSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Why a dimension is in the roadmap. Single source: the domain derives its
 * type from this list.
 *
 *  - `BELOW_EXPECTED_MINIMUM`: it is below its expected minimum.
 *  - `REQUIRED_ENABLER`: it meets its minimum, but a dimension that does
 *    need work depends on it reaching a higher level.
 */
export const ROADMAP_INCLUSION_REASONS = [
  'BELOW_EXPECTED_MINIMUM',
  'REQUIRED_ENABLER',
] as const;

export const roadmapInclusionReasonSchema = z.enum(ROADMAP_INCLUSION_REASONS);

export type RoadmapInclusionReason = z.infer<typeof roadmapInclusionReasonSchema>;

/**
 * Scaling roadmap (RF-14).
 *
 * A dimension within a phase: where it is, where it has to get, and what it
 * unlocks on getting there.
 *
 * `inclusionReason` and `targetDrivenBy` answer "why this dimension and why
 * this target?". Without them, "level 3 → level 6" is a number with no
 * explanation; with them, the user can see that the target is set by
 * another dimension that depends on this one.
 *
 * `enables` is the readable justification of the order. It is the only
 * thing that lets a consultant **dispute** the proposed sequence: the
 * system can check that the graph is acyclic, but not that its edges are
 * true, so exposing the why turns a methodological claim into something
 * open to discussion instead of a black box.
 */
export const roadmapDimensionTargetSchema = z
  .object({
    dimensionCode: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension, in Spanish'),
    shortName: z
      .string()
      .min(1)
      .describe('Short label of the dimension, for the roadmap line'),
    currentLevel: z.number().int().min(1).max(9),
    targetLevel: z.number().int().min(1).max(9),
    enables: z
      .array(dimensionRefSchema)
      .describe('Roadmap dimensions this one unlocks on reaching its target'),
    inclusionReason: roadmapInclusionReasonSchema.describe(
      'Why the dimension is in the roadmap',
    ),
    expectedMinimum: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Level the dimension should reach on its own'),
    targetDrivenBy: dimensionRefSchema
      .nullable()
      .describe(
        'Roadmap dimension whose requirement sets the target, if that requirement ' +
          'exceeds the expected minimum; null if the target is the expected minimum',
      ),
  })
  .describe('A dimension to intervene within a phase');

export type RoadmapDimensionTarget = z.infer<typeof roadmapDimensionTargetSchema>;

/**
 * A phase of the roadmap.
 *
 * The dimensions of the same phase **do not depend on each other and are
 * worked on in parallel**. The order within the array is the framework's
 * canonical one and exists so the response is deterministic; it is not a
 * priority, and rendering it as a numbered list would convey a hierarchy
 * the system did not calculate.
 */
export const roadmapPhaseSchema = z
  .object({
    order: z.number().int().positive(),
    dimensions: z.array(roadmapDimensionTargetSchema).min(1),
  })
  .describe('A roadmap phase: dimensions worked on in parallel');

export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;

/**
 * Response of `GET /api/v1/diagnostics/:id/roadmap`.
 *
 * Notes on what it does **not** carry, and why:
 *
 *  - **No INNLAB service per phase.** The router produces exactly one
 *    recommendation per diagnostic — `uq_portfolio_recommendation_diagnostic`
 *    enforces it and RF-15 requires it — so there is no different service
 *    per phase to look up. Including the field empty would promise
 *    something the system does not calculate.
 *
 *  - **No duration or calendar.** Turning layers into weeks needs a
 *    duration parameter per phase that is neither defined nor validated
 *    with INNLAB. Phases are delivered as an order, not as a schedule.
 *
 *  - **No guidance texts.** Those texts are an input still pending from
 *    INNLAB.
 *
 * `phases` may be empty: it means the initiative meets the expected
 * minimum in all six dimensions. It is not an error.
 */
export const roadmapResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    generatedAt: z
      .string()
      .datetime()
      .describe('When the roadmap was calculated and saved'),
    phases: z.array(roadmapPhaseSchema),
    dimensionsWithoutIntervention: z
      .array(dimensionRefSchema)
      .describe(
        'Dimensions that need no intervention. Explicit so their ' +
          'absence from the plan does not read as an oversight.',
      ),
  })
  .describe('Scaling roadmap by phases (RF-14)');

export type RoadmapResponse = z.infer<typeof roadmapResponseSchema>;

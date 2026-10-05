import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionCodeSchema, dimensionRefSchema } from '../irl-taxonomy/dimension.schema.js';
import { serviceDetailSchema } from '../routing/service-detail.schema.js';
import { exceptionActionSchema } from '../routing/layer-trace.schema.js';

/**
 * Why a dimension is in the roadmap. Single source: the domain derives its
 * type from this list.
 *
 *  - `BELOW_EXPECTED_MINIMUM`: it is below its expected minimum.
 *  - `REQUIRED_ENABLER`: it meets its minimum, but a dimension that does
 *    need work depends on it reaching a higher level.
 *  - `BALANCE`: it meets its minimum and enables nothing pending, but at the
 *    end of the route it would stay too far from a dimension it is paired
 *    with: it is raised so no imbalance with an alert is left.
 */
export const ROADMAP_INCLUSION_REASONS = [
  'BELOW_EXPECTED_MINIMUM',
  'REQUIRED_ENABLER',
  'BALANCE',
] as const;

export const roadmapInclusionReasonSchema = z.enum(ROADMAP_INCLUSION_REASONS);

export type RoadmapInclusionReason = z.infer<typeof roadmapInclusionReasonSchema>;

/**
 * What sets the final target of a dimension:
 *
 *  - `EXPECTED_MINIMUM`: its own expected minimum.
 *  - `ENABLES`: a roadmap dimension that depends on it needs it higher
 *    (`targetDrivenBy` names it).
 *  - `BALANCE`: a dimension it is paired with ends higher, and the gap
 *    between them must not leave an imbalance with an alert
 *    (`targetDrivenBy` names it).
 */
export const ROADMAP_TARGET_REASONS = ['EXPECTED_MINIMUM', 'ENABLES', 'BALANCE'] as const;

export const roadmapTargetReasonSchema = z.enum(ROADMAP_TARGET_REASONS);

export type RoadmapTargetReason = z.infer<typeof roadmapTargetReasonSchema>;

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
    shortName: z.string().min(1).describe('Short label of the dimension, for the roadmap line'),
    currentLevel: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Level of the dimension when the phase starts'),
    targetLevel: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Level the dimension reaches by the end of this phase'),
    finalTargetLevel: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe(
        'Level the dimension reaches at the end of the route; a rise above the per-phase ' +
          'limit is split across several phases',
      ),
    enables: z
      .array(dimensionRefSchema)
      .describe('Roadmap dimensions this one unlocks on reaching its target'),
    inclusionReason: roadmapInclusionReasonSchema.describe('Why the dimension is in the roadmap'),
    expectedMinimum: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Level the dimension should reach on its own'),
    targetReason: roadmapTargetReasonSchema.describe('What sets the final target'),
    targetDrivenBy: dimensionRefSchema
      .nullable()
      .describe(
        'Dimension that sets the final target — the dependent that needs it higher, or the ' +
          'paired dimension it must keep up with; null if the target is the expected minimum',
      ),
  })
  .describe('A dimension to intervene within a phase');

export type RoadmapDimensionTarget = z.infer<typeof roadmapDimensionTargetSchema>;

/**
 * How a phase's service was chosen — the explainable trace of the route.
 *
 *  - `RECOMMENDATION`: the first phase opens with the portfolio
 *    recommendation itself, calculated on the current profile.
 *  - `PHASE`: the service that best works the dimensions of the phase, on
 *    the profile projected to the start of the phase (the targets of the
 *    previous phases reached), never of a lighter tier than the previous
 *    phase's service and never one already in the route.
 */
export const PHASE_SERVICE_MODES = ['RECOMMENDATION', 'PHASE'] as const;

export const phaseServiceTraceSchema = z.object({
  mode: z.enum(PHASE_SERVICE_MODES),
  projectedLevels: z
    .record(dimensionCodeSchema, z.number().int().min(1).max(9))
    .describe('Profile the phase starts from'),
  averageLevel: z.number().min(1).max(9),
  excluded: z
    .array(z.object({ name: z.string(), message: z.string() }))
    .describe('Services the exclusions left out'),
  skipped: z
    .array(
      z.object({
        name: z.string(),
        reason: z.enum(['LIGHTER_TIER', 'ALREADY_IN_ROUTE']),
      }),
    )
    .describe('Services left out by the route: a lighter tier, or already proposed'),
  ranking: z.array(
    z.object({
      position: z.number().int().positive(),
      idService: z.number().int().positive(),
      name: z.string(),
      score: z.number().nullable(),
      tierOrder: z.number().int().positive(),
      includedBy: z.object({ ruleCode: z.string(), declaredReason: z.string() }).nullable(),
      coverage: z
        .array(
          z.object({
            dimension: dimensionCodeSchema,
            sourceLabel: z.string(),
            levels: z.number().int().nonnegative(),
          }),
        )
        .describe('How the service works each dimension of the phase (PHASE mode)'),
    }),
  ),
  appliedAdjustments: z.array(
    z.object({
      code: z.string(),
      action: exceptionActionSchema,
      targetService: z.string(),
      declaredReason: z.string(),
      effect: z.string(),
    }),
  ),
});

export type PhaseServiceTrace = z.infer<typeof phaseServiceTraceSchema>;

/**
 * The service a phase proposes, with its card. `approximate` is true when
 * no service reached the minimum for the phase and the best available one
 * is shown anyway.
 */
export const phaseServiceSchema = serviceDetailSchema.extend({
  approximate: z.boolean(),
});

export type PhaseService = z.infer<typeof phaseServiceSchema>;

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
    service: phaseServiceSchema
      .nullable()
      .describe('Service that could be contracted for the phase; null if none is available'),
    serviceTrace: phaseServiceTraceSchema,
  })
  .describe('A roadmap phase: dimensions worked on in parallel, and its service');

export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;

/**
 * Response of `GET /api/v1/diagnostics/:id/roadmap`.
 *
 * Notes on what it does **not** carry, and why:
 *
 *  - **No duration or calendar.** Turning layers into weeks needs a
 *    duration parameter per phase that is neither defined nor validated
 *    with INNLAB. Phases are delivered as an order, not as a schedule.
 *
 * Each phase proposes a service, from the lightest tier to the deepest:
 * the first is the portfolio recommendation, the next ones work the
 * dimensions of their phase. The route ends balanced: no pair of
 * dimensions is left with an imbalance with an alert (`balanced`).
 *
 * `phases` may be empty: it means the initiative meets the expected
 * minimum in all six dimensions. It is not an error.
 */
export const roadmapResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    generatedAt: z.string().datetime().describe('When the roadmap was calculated and saved'),
    phases: z.array(roadmapPhaseSchema),
    finalLevels: z
      .record(dimensionCodeSchema, z.number().int().min(1).max(9))
      .describe('The profile projected to the end of the route'),
    balanced: z
      .boolean()
      .describe('True when no pair of dimensions ends with an imbalance with an alert'),
    dimensionsWithoutIntervention: z
      .array(dimensionRefSchema)
      .describe(
        'Dimensions that need no intervention. Explicit so their ' +
          'absence from the plan does not read as an oversight.',
      ),
  })
  .describe('Scaling roadmap by phases (RF-14)');

export type RoadmapResponse = z.infer<typeof roadmapResponseSchema>;

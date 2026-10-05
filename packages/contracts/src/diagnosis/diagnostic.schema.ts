import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * States of the diagnostic process — the state machine that governs the
 * transitions of the `Diagnosis` aggregate.
 *
 * Authoritative source: the `ck_diagnostic_state` CHECK constraint of the
 * `irl_diagnostic.diagnostic` table (single migration). This list must
 * match the database's exactly — to add a state, change the migration
 * first and then this schema.
 *
 * Transitions (linear, no step is skipped):
 *   STARTED
 *     → WITH_CONSENT               (HU-05 / RF-03)
 *     → WITH_INITIATIVE            (HU-06 / RF-04)
 *     → QUESTIONNAIRE_IN_PROGRESS  (HU-07)
 *     → QUESTIONNAIRE_COMPLETE     (HU-10 / RF-06)
 *     → PROFILE_GENERATED          (HU-11 / RF-07)
 *     → DEEP_ANALYSIS_DECLINED | DEEP_ANALYSIS_IN_PROGRESS
 *          → DEEP_ANALYSIS_COMPLETE
 */
export const DIAGNOSTIC_STATES = [
  'STARTED',
  'WITH_CONSENT',
  'WITH_INITIATIVE',
  'QUESTIONNAIRE_IN_PROGRESS',
  'QUESTIONNAIRE_COMPLETE',
  'PROFILE_GENERATED',
  'DEEP_ANALYSIS_DECLINED',
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
] as const;

export const diagnosticStateSchema = z
  .enum(DIAGNOSTIC_STATES)
  .describe('Current state of a diagnostic');

export type DiagnosticState = z.infer<typeof diagnosticStateSchema>;

/**
 * A diagnostic as the API exposes it.
 *
 * Main endpoint: `GET /api/v1/diagnostics/:id`.
 *
 * `userId` is opaque (Cognito issues it); the frontend only uses it to
 * compare with the current user.
 */
export const diagnosticSchema = z
  .object({
    id: uuidSchema,
    userId: z.string().min(1).describe('Identifier of the owning user'),
    state: diagnosticStateSchema,
    completed: z
      .boolean()
      .describe(
        'Whether the questionnaire was processed and the maturity profile exists — derived from the state by the backend; while false, the diagnostic can be resumed',
      ),
    deepAnalysisAccepted: z
      .boolean()
      .describe(
        'Whether the user already accepted the deep analysis — derived from the state by the backend',
      ),
    deepAnalysisCompleted: z
      .boolean()
      .describe(
        'Whether both results of the deep analysis are saved (DEEP_ANALYSIS_COMPLETE): the full report can be read and downloaded — derived from the state by the backend',
      ),
    frameworkVersion: z
      .string()
      .min(1)
      .describe('Code of the IRL framework version the diagnostic is answered with'),
    createdAt: z.string().datetime(),
  })
  .describe('Diagnostic (read DTO)');

export type Diagnostic = z.infer<typeof diagnosticSchema>;

/**
 * A completed diagnostic of the user, as the panel lists it (HU-03,
 * DIAGIRL-26): the diagnostic plus what tells one apart from another —
 * the initiative it was answered for, when its profile was computed and
 * its global IRL level. Only diagnostics with a maturity profile are
 * listed: one still in the wizard is not offered from a later session.
 */
export const diagnosticSummarySchema = diagnosticSchema
  .extend({
    initiativeName: z
      .string()
      .nullable()
      .describe('Name of the initiative profile the diagnostic was answered with'),
    profileComputedAt: z
      .string()
      .datetime()
      .nullable()
      .describe('When the maturity profile was computed'),
    globalAverage: z
      .number()
      .min(1)
      .max(9)
      .nullable()
      .describe('Global IRL level: simple average of the six dimension levels'),
  })
  .describe('Summary of a completed diagnostic for the "my diagnostics" list');

export type DiagnosticSummary = z.infer<typeof diagnosticSummarySchema>;

/**
 * Response to accepting the deep analysis (RF-11).
 *
 * `POST /api/v1/diagnostics/:id/deep-analysis` — fires
 * `DeepAnalysisRequestedEvent` in the backend, which `routing/` and
 * `roadmap/` each listen to in order to calculate their part. Idempotent
 * in the state, not in the effect: if the diagnostic is already in
 * `DEEP_ANALYSIS_IN_PROGRESS` or `DEEP_ANALYSIS_COMPLETE`, its state does
 * not change but the event is published again, so a calculation that
 * failed the first time (e.g. with no routing configuration seeded) can be
 * retried.
 */
export const acceptDeepAnalysisResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    state: diagnosticStateSchema,
  })
  .describe('Response to accepting the deep analysis (RF-11)');

export type AcceptDeepAnalysisResponse = z.infer<typeof acceptDeepAnalysisResponseSchema>;

import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { initiativeSchema } from '../initiative/initiative.schema.js';
import { maturityProfileResponseSchema } from '../diagnosis/profile-response.schema.js';
import { recommendationResponseSchema } from '../routing/recommendation-response.schema.js';
import { roadmapResponseSchema } from '../roadmap/roadmap-response.schema.js';
import { dimensionAnswersSchema } from '../diagnosis/given-answers.schema.js';

/**
 * The attribution every report carries (RNF-09): the IRL framework belongs
 * to KTH Innovation and is used under CC BY-NC-SA 4.0. One source for the
 * screen and the downloaded file, so neither can drop or reword it.
 */
export const IRL_ATTRIBUTION = {
  framework: 'KTH Innovation Readiness Level (IRL)',
  owner: 'KTH Innovation',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  notice: 'Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0.',
} as const;

export const reportAttributionSchema = z
  .object({
    framework: z.string().min(1),
    owner: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.string().url(),
    notice: z.string().min(1).describe('The sentence shown at the foot of the report'),
  })
  .describe('Attribution of the IRL framework (RNF-09)');

export type ReportAttribution = z.infer<typeof reportAttributionSchema>;

/**
 * The full report of a diagnostic (RF-16 / HU-23).
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/report`.
 *
 * It exists only once the deep analysis is complete (both of its results
 * saved); before that the endpoint answers `409 REPORT_NOT_AVAILABLE`. It
 * gathers, from the modules that own them, every saved result of the
 * diagnostic — nothing is recalculated:
 *
 *   - `initiative`: the profile the diagnostic was answered with.
 *   - `answers`: the 48 statements with the value and the justification the
 *     user gave, by dimension.
 *   - `profile`: the six dimensions, their gaps, the imbalanced pairs and
 *     the dimensions in critical state.
 *   - `recommendation`: the INNLAB service and its justification.
 *   - `roadmap`: the route by phases, each with its service.
 *   - `attribution`: the KTH framework and its license.
 *
 * `completedAt` is when the deep analysis finished: the later of the
 * recommendation's and the roadmap's dates.
 */
export const diagnosticReportSchema = z
  .object({
    diagnosticId: uuidSchema,
    frameworkVersion: z
      .string()
      .min(1)
      .describe('Code of the IRL framework version the diagnostic was answered with'),
    completedAt: z.string().datetime().describe('When the deep analysis was completed'),
    initiative: initiativeSchema,
    answers: z.array(dimensionAnswersSchema).describe('The answers, by dimension'),
    profile: maturityProfileResponseSchema,
    recommendation: recommendationResponseSchema,
    roadmap: roadmapResponseSchema,
    attribution: reportAttributionSchema,
  })
  .describe('Full report of a diagnostic (RF-16)');

export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;

import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { consentRecordSchema } from './consent.schema.js';

/**
 * An entry of the sector taxonomy (HU-06 / RF-04).
 *
 * Sectors are catalog: they are managed by seed and immutable at runtime.
 * Endpoint: `GET /api/v1/initiative-catalog/sectors`.
 *
 * `id` is the bigint identifier of `irl_catalog.sector` exposed as a string
 * — that table has no `code` column (unlike `initiative_stage`, which
 * does).
 */
export const sectorSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).describe('Name of the sector, in Spanish'),
  })
  .describe('An economic/thematic sector of the INNLAB taxonomy');

export type Sector = z.infer<typeof sectorSchema>;

/**
 * A stage of the initiative (`irl_catalog.initiative_stage` catalog).
 *
 * Endpoint: `GET /api/v1/initiative-catalog/stages`.
 */
export const initiativeStageSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1).describe('Name of the stage, in Spanish'),
  })
  .describe('A stage of the initiative stage catalog');

export type InitiativeStage = z.infer<typeof initiativeStageSchema>;

/** Maximum number of characters of the profile's free-text fields. */
export const INITIATIVE_TEXT_MAX = 500;

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(INITIATIVE_TEXT_MAX, `${label} no puede exceder ${String(INITIATIVE_TEXT_MAX)} caracteres`);

/**
 * Registration of the profile of an initiative for a diagnostic (HU-06 /
 * RF-04).
 *
 * `POST /api/v1/diagnostics/:id/initiative`.
 *
 * The initiative exists on its own (`POST /api/v1/initiatives`) and the
 * diagnostic keeps a snapshot of its profile: `initiativeId` says which
 * initiative, owned by the user and with the current consent accepted.
 *
 * It is the step before the questionnaire and every field is mandatory:
 *   - `name`: 3–120 characters.
 *   - `sectorId` and `stageId`: catalog ids; the backend checks they exist.
 *   - `declaredStage`: how the user describes their stage, in their own
 *     words, next to the catalog stage (the one the router uses).
 *   - `teamSize` is an integer ≥ 1 and `teamDescription` says who the team
 *     is.
 *   - `academicLinkage`: whether the initiative has a confirmed link with
 *     the university; the router's eligibility rules read it.
 *
 * Registering it again replaces the diagnostic's snapshot, until the deep
 * analysis is accepted: from then on it is frozen (409).
 */
export const registerInitiativeSchema = z
  .object({
    initiativeId: uuidSchema.describe('The initiative whose profile this is'),
    name: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(120, 'El nombre no puede exceder 120 caracteres'),
    sectorId: z.string().min(1).describe('ID of the selected sector'),
    productType: requiredText('El tipo de producto o servicio'),
    stageId: z.string().min(1).describe('ID of the catalog stage'),
    declaredStage: requiredText('La etapa declarada'),
    teamSize: z.number().int().min(1, 'El equipo tiene al menos una persona').max(10000),
    teamDescription: requiredText('La descripción del equipo'),
    academicLinkage: z.boolean({
      required_error: 'Indica si la iniciativa tiene vinculación académica',
      invalid_type_error: 'Indica si la iniciativa tiene vinculación académica',
    }),
    targetMarket: requiredText('El mercado objetivo'),
    currentFunding: requiredText('El financiamiento actual'),
  })
  .describe('Command that registers the profile of an initiative');

export type RegisterInitiativeCommand = z.infer<typeof registerInitiativeSchema>;

/**
 * An initiative as the API exposes it once registered.
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/initiative`.
 *
 * It embeds the sector and the stage so the client does not have to query
 * the catalog to show it.
 */
export const initiativeSchema = z
  .object({
    id: uuidSchema.describe('Id of the profile snapshot'),
    initiativeId: uuidSchema,
    diagnosticId: uuidSchema,
    name: z.string().min(3).max(120),
    sector: sectorSchema,
    productType: z.string().min(1),
    stage: initiativeStageSchema,
    declaredStage: z.string().min(1),
    teamSize: z.number().int().min(1),
    teamDescription: z.string().min(1),
    academicLinkage: z.boolean(),
    targetMarket: z.string().min(1),
    currentFunding: z.string().min(1),
    recordedAt: z.string().datetime(),
  })
  .describe('Profile of the initiative registered in a diagnostic');

export type Initiative = z.infer<typeof initiativeSchema>;

/**
 * An initiative of the user, with what the wizard needs to offer it again
 * (HU-06): its latest profile, to prefill the form, and whether its consent
 * is accepted at the current version of the text.
 *
 * Endpoint: `GET /api/v1/initiatives` (the user's, most recent first) and
 * the answer of `POST /api/v1/initiatives`.
 */
export const initiativeSummarySchema = z
  .object({
    id: uuidSchema,
    createdAt: z.string().datetime(),
    consent: consentRecordSchema.nullable().describe('The latest acceptance of the consent'),
    consentCurrent: z
      .boolean()
      .describe('Whether the latest acceptance is of the current version of the text'),
    latestProfile: initiativeSchema.nullable(),
  })
  .describe('An initiative of the user');

export type InitiativeSummary = z.infer<typeof initiativeSummarySchema>;

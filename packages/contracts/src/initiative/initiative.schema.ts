import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { consentRecordSchema } from './consent.schema.js';

/**
 * An entry of the sector taxonomy (HU-06 / RF-04).
 *
 * Sectors are catalog: they are managed by seed and immutable at runtime.
 * They are the sections of the DANE's CIIU Rev. 5 A.C. (`code` A to V, the
 * official title as `name`), plus one entry with `isOther` and no code,
 * «Otro sector (especificar)», for an activity the user does not find
 * represented: the profile then carries the user's own description in
 * `customSector`.
 *
 * `id` is the bigint identifier of `irl_catalog.sector` exposed as a string.
 */
export const sectorSchema = z
  .object({
    id: z.string().min(1),
    code: z
      .string()
      .min(1)
      .nullable()
      .describe('Section code of the classification; null for «Otro»'),
    name: z.string().min(1).describe('Official title of the section, in Spanish'),
    classification: z.string().min(1).describe('Classification and version, e.g. CIIU Rev. 5 A.C.'),
    isOther: z.boolean().describe('Whether this entry is «Otro sector (especificar)»'),
  })
  .describe('An economic sector: a section of the CIIU, or «Otro»');

export type Sector = z.infer<typeof sectorSchema>;

/**
 * A sector as the registration form offers it: besides its code and name,
 * a line on what it groups (an official title such as «Otras actividades
 * de servicios» does not say it) and the words a person may search it by.
 *
 * Endpoint: `GET /api/v1/initiative-catalog/sectors`, ordered by code with
 * «Otro» last.
 */
export const sectorOptionSchema = sectorSchema
  .extend({
    description: z
      .string()
      .describe('What the section groups, in a line; for «Otro», when to choose it'),
    keywords: z.array(z.string().min(1)).describe('Related words to search the sector by'),
  })
  .describe('A sector of the catalog, as the registration form offers it');

export type SectorOption = z.infer<typeof sectorOptionSchema>;

/** Maximum length of the user's own description of the sector («Otro»). */
export const CUSTOM_SECTOR_MAX = 120;

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
    .max(
      INITIATIVE_TEXT_MAX,
      `${label} no puede exceder ${String(INITIATIVE_TEXT_MAX)} caracteres`,
    );

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
 *   - `customSector`: the user's own sector, mandatory when `sectorId` is
 *     the «Otro» entry and discarded (stored as null) otherwise.
 *   - `declaredStage`: how the user describes their stage, in their own
 *     words, next to the catalog stage (the one the router uses).
 *   - `teamSize` is an integer ≥ 1 and `teamDescription` says who the team
 *     is.
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
    customSector: z
      .string()
      .trim()
      .max(CUSTOM_SECTOR_MAX, `El sector no puede exceder ${String(CUSTOM_SECTOR_MAX)} caracteres`)
      .nullable()
      .optional()
      .describe('The user’s own sector, when the chosen sector is «Otro»'),
    productType: requiredText('El tipo de producto o servicio'),
    stageId: z.string().min(1).describe('ID of the catalog stage'),
    declaredStage: requiredText('La etapa declarada'),
    teamSize: z.number().int().min(1, 'El equipo tiene al menos una persona').max(10000),
    teamDescription: requiredText('La descripción del equipo'),
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
    customSector: z
      .string()
      .min(1)
      .nullable()
      .describe('The user’s own sector; only with the «Otro» sector'),
    productType: z.string().min(1),
    stage: initiativeStageSchema,
    declaredStage: z.string().min(1),
    teamSize: z.number().int().min(1),
    teamDescription: z.string().min(1),
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

import { z } from 'zod';
import {
  CUSTOM_SECTOR_MAX,
  registerInitiativeSchema,
  type Initiative,
  type RegisterInitiativeCommand,
} from '@innlab/contracts';

/**
 * The profile fields of `RegisterInitiativeCommand`: everything but the
 * initiative it belongs to, which is chosen outside the form (step 1's
 * chooser, or the profile being corrected).
 */
export type InitiativeProfileFields = Omit<RegisterInitiativeCommand, 'initiativeId'>;

/**
 * The form's validation: the contract's `registerInitiativeSchema` without
 * `initiativeId`, with the differences the form needs — the fields hold text, so the team size
 * is read from a string, and an empty selection gets a message of its own
 * instead of the contract's generic one. An empty own sector is sent as
 * `null`.
 *
 * It does not know which sector is «Otro»; `initiativeFormSchemaFor` adds
 * that rule for the form.
 */
export const initiativeFormSchema = registerInitiativeSchema.omit({ initiativeId: true }).extend({
  sectorId: z.string().min(1, 'Elige un sector'),
  customSector: z
    .string()
    .trim()
    .max(CUSTOM_SECTOR_MAX, `Máximo ${String(CUSTOM_SECTOR_MAX)} caracteres`)
    .transform((value) => (value === '' ? null : value)),
  stageId: z.string().min(1, 'Elige una etapa'),
  teamSize: z
    .string()
    .trim()
    .min(1, 'El tamaño del equipo es obligatorio')
    .pipe(
      z.coerce
        .number({ invalid_type_error: 'Escribe el número de personas en cifras' })
        .pipe(registerInitiativeSchema.shape.teamSize),
    ),
});

/**
 * The form's validation with the catalog in hand: with «Otro sector»
 * (`otherSectorIds`) the user's own sector is mandatory; with a CIIU section
 * it is dropped, so no text left from an earlier «Otro» is sent.
 */
export function initiativeFormSchemaFor(otherSectorIds: ReadonlySet<string>) {
  return initiativeFormSchema
    .superRefine((values, ctx) => {
      if (otherSectorIds.has(values.sectorId) && values.customSector === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customSector'],
          message: 'Cuéntanos a qué sector pertenece tu iniciativa',
        });
      }
    })
    .transform((values) =>
      otherSectorIds.has(values.sectorId) ? values : { ...values, customSector: null },
    );
}

/** The values of the initiative form: all of them are text, as in the fields. */
export interface InitiativeFormValues {
  readonly name: string;
  readonly sectorId: string;
  /** The user's own sector, only meaningful with «Otro sector». */
  readonly customSector: string;
  readonly productType: string;
  readonly stageId: string;
  readonly declaredStage: string;
  readonly teamSize: string;
  readonly teamDescription: string;
  readonly targetMarket: string;
  readonly currentFunding: string;
}

/** An already registered initiative, to edit it in the form. */
export const EMPTY_INITIATIVE_FORM: InitiativeFormValues = {
  name: '',
  sectorId: '',
  customSector: '',
  productType: '',
  stageId: '',
  declaredStage: '',
  teamSize: '',
  teamDescription: '',
  targetMarket: '',
  currentFunding: '',
};

export function initiativeToFormValues(initiative: Initiative): InitiativeFormValues {
  return {
    name: initiative.name,
    sectorId: initiative.sector.id,
    customSector: initiative.customSector ?? '',
    productType: initiative.productType,
    stageId: initiative.stage.id,
    declaredStage: initiative.declaredStage,
    teamSize: String(initiative.teamSize),
    teamDescription: initiative.teamDescription,
    targetMarket: initiative.targetMarket,
    currentFunding: initiative.currentFunding,
  };
}

/** The profile fields as the form holds them, to keep a submitted one in the draft. */
export function commandToFormValues(command: InitiativeProfileFields): InitiativeFormValues {
  return {
    name: command.name,
    sectorId: command.sectorId,
    customSector: command.customSector ?? '',
    productType: command.productType,
    stageId: command.stageId,
    declaredStage: command.declaredStage,
    teamSize: String(command.teamSize),
    teamDescription: command.teamDescription,
    targetMarket: command.targetMarket,
    currentFunding: command.currentFunding,
  };
}

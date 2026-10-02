import { z } from 'zod';
import {
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
 * and the academic linkage (a «Sí»/«No» select) are read from a string, and
 * an empty selection gets a message of its own instead of the contract's
 * generic one.
 */
export const initiativeFormSchema = registerInitiativeSchema.omit({ initiativeId: true }).extend({
  sectorId: z.string().min(1, 'Elige un sector'),
  stageId: z.string().min(1, 'Elige una etapa'),
  teamSize: z
    .string()
    .trim()
    .min(1, 'El tamaño del equipo es obligatorio')
    .pipe(z.coerce.number().pipe(registerInitiativeSchema.shape.teamSize)),
  academicLinkage: z
    .string()
    .refine((value) => value === 'true' || value === 'false', {
      message: 'Indica si la iniciativa tiene vinculación académica',
    })
    .transform((value) => value === 'true'),
});

/** The values of the initiative form: all of them are text, as in the fields. */
export interface InitiativeFormValues {
  readonly name: string;
  readonly sectorId: string;
  readonly productType: string;
  readonly stageId: string;
  readonly declaredStage: string;
  readonly teamSize: string;
  readonly teamDescription: string;
  /** `''` until the user picks «Sí» (`'true'`) or «No» (`'false'`). */
  readonly academicLinkage: string;
  readonly targetMarket: string;
  readonly currentFunding: string;
}

/** An already registered initiative, to edit it in the form. */
export const EMPTY_INITIATIVE_FORM: InitiativeFormValues = {
  name: '',
  sectorId: '',
  productType: '',
  stageId: '',
  declaredStage: '',
  teamSize: '',
  teamDescription: '',
  academicLinkage: '',
  targetMarket: '',
  currentFunding: '',
};

export function initiativeToFormValues(initiative: Initiative): InitiativeFormValues {
  return {
    name: initiative.name,
    sectorId: initiative.sector.id,
    productType: initiative.productType,
    stageId: initiative.stage.id,
    declaredStage: initiative.declaredStage,
    teamSize: String(initiative.teamSize),
    teamDescription: initiative.teamDescription,
    academicLinkage: initiative.academicLinkage ? 'true' : 'false',
    targetMarket: initiative.targetMarket,
    currentFunding: initiative.currentFunding,
  };
}

/** The profile fields when the form is valid, or `null` while it is not. */
export function profileFieldsFromForm(values: InitiativeFormValues): InitiativeProfileFields | null {
  const parsed = initiativeFormSchema.safeParse(values);
  return parsed.success ? parsed.data : null;
}

/** The draft stored in the browser, to fill the form again. */
export function commandToFormValues(command: InitiativeProfileFields): InitiativeFormValues {
  return {
    name: command.name,
    sectorId: command.sectorId,
    productType: command.productType,
    stageId: command.stageId,
    declaredStage: command.declaredStage,
    teamSize: String(command.teamSize),
    teamDescription: command.teamDescription,
    academicLinkage: command.academicLinkage ? 'true' : 'false',
    targetMarket: command.targetMarket,
    currentFunding: command.currentFunding,
  };
}

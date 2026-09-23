import type { Initiative, RegisterInitiativeCommand } from '@innlab/contracts';

/** The values of the initiative form: all of them are text, as in the fields. */
export interface InitiativeFormValues {
  readonly name: string;
  readonly sectorId: string;
  readonly productType: string;
  readonly stageId: string;
  readonly declaredStage: string;
  readonly teamSize: string;
  readonly teamDescription: string;
  readonly targetMarket: string;
  readonly currentFunding: string;
}

/** An already registered initiative, to edit it in the form. */
export function initiativeToFormValues(initiative: Initiative): InitiativeFormValues {
  return {
    name: initiative.name,
    sectorId: initiative.sector.id,
    productType: initiative.productType,
    stageId: initiative.stage.id,
    declaredStage: initiative.declaredStage,
    teamSize: String(initiative.teamSize),
    teamDescription: initiative.teamDescription,
    targetMarket: initiative.targetMarket,
    currentFunding: initiative.currentFunding,
  };
}

/** The draft stored in the browser, to fill the form again. */
export function commandToFormValues(command: RegisterInitiativeCommand): InitiativeFormValues {
  return {
    name: command.name,
    sectorId: command.sectorId,
    productType: command.productType,
    stageId: command.stageId,
    declaredStage: command.declaredStage,
    teamSize: String(command.teamSize),
    teamDescription: command.teamDescription,
    targetMarket: command.targetMarket,
    currentFunding: command.currentFunding,
  };
}

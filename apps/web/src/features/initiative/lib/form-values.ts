import type { Initiative, RegisterInitiativeCommand } from '@innlab/contracts';

/** Los valores del formulario de la iniciativa: todos son texto, como en los campos. */
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

/** Una iniciativa ya registrada, para editarla en el formulario. */
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

/** El borrador guardado en el navegador, para volver a llenar el formulario. */
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

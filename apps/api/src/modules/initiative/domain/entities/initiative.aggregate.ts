import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

export const MAX_INITIATIVE_TEXT_LENGTH = 500;

export interface InitiativePersistence {
  readonly id: string;
  readonly diagnosticId: string;
  readonly sectorId: string;
  readonly name: string;
  readonly productType: string;
  readonly stageId: string | null;
  readonly declaredStage: string;
  readonly teamSize: number | null;
  readonly teamDescription: string;
  readonly academicLinkage: boolean | null;
  readonly targetMarket: string;
  readonly currentFunding: string;
}

export interface RegisterInitiativeInput {
  id: Uuid;
  diagnosticId: Uuid;
  sectorId: string;
  name: string;
  productType: string;
  stageId: string;
  declaredStage: string;
  teamSize: number;
  teamDescription: string;
  targetMarket: string;
  currentFunding: string;
}

/**
 * The profile of the initiative being diagnosed: what it is, how far along
 * it says it is, who is on the team, who it sells to and how it is funded.
 *
 * Registered before the questionnaire (HU-06); every field is required.
 * `stageId` (catalog) is what the portfolio router reads; `declaredStage` is
 * the user's own description of it and is only shown back.
 * `academicLinkage` is not collected by the registration form yet.
 */
export class Initiative {
  private constructor(
    public readonly id: Uuid,
    public readonly diagnosticId: Uuid,
    public readonly sectorId: string,
    public readonly name: string,
    public readonly productType: string,
    public readonly stageId: string | null,
    public readonly declaredStage: string,
    public readonly teamSize: number | null,
    public readonly teamDescription: string,
    public readonly academicLinkage: boolean | null,
    public readonly targetMarket: string,
    public readonly currentFunding: string,
  ) {}

  static register(input: RegisterInitiativeInput): Initiative {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 120) {
      throw new InvariantViolationError(
        `Initiative name must be between 3 and 120 characters; received ${name.length}`,
      );
    }
    if (!Number.isInteger(input.teamSize) || input.teamSize < 1) {
      throw new InvariantViolationError(
        `Initiative team size must be an integer of at least 1; received ${String(input.teamSize)}`,
      );
    }
    return new Initiative(
      input.id,
      input.diagnosticId,
      input.sectorId,
      name,
      Initiative.requiredText('product type', input.productType),
      input.stageId,
      Initiative.requiredText('declared stage', input.declaredStage),
      input.teamSize,
      Initiative.requiredText('team description', input.teamDescription),
      null,
      Initiative.requiredText('target market', input.targetMarket),
      Initiative.requiredText('current funding', input.currentFunding),
    );
  }

  static fromPersistence(row: InitiativePersistence): Initiative {
    return new Initiative(
      Uuid.create(row.id),
      Uuid.create(row.diagnosticId),
      row.sectorId,
      row.name,
      row.productType,
      row.stageId,
      row.declaredStage,
      row.teamSize,
      row.teamDescription,
      row.academicLinkage,
      row.targetMarket,
      row.currentFunding,
    );
  }

  toPersistence(): InitiativePersistence {
    return {
      id: this.id.value,
      diagnosticId: this.diagnosticId.value,
      sectorId: this.sectorId,
      name: this.name,
      productType: this.productType,
      stageId: this.stageId,
      declaredStage: this.declaredStage,
      teamSize: this.teamSize,
      teamDescription: this.teamDescription,
      academicLinkage: this.academicLinkage,
      targetMarket: this.targetMarket,
      currentFunding: this.currentFunding,
    };
  }

  private static requiredText(field: string, raw: string): string {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value.length === 0 || value.length > MAX_INITIATIVE_TEXT_LENGTH) {
      throw new InvariantViolationError(
        `Initiative ${field} must be non-empty and at most ${String(MAX_INITIATIVE_TEXT_LENGTH)} characters`,
      );
    }
    return value;
  }
}
